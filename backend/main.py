from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    File,
    UploadFile,
    Form,
    BackgroundTasks,
)
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import uuid
from datetime import datetime, timedelta
import json

# Clean Environment Variables (Crucial for Cloudinary/DB stability)
# Sometimes copy-pasting into Secrets adds quotes or spaces.
# Also handle cases where user pasted "CLOUDINARY_URL=..." inside the value.
if os.environ.get("CLOUDINARY_URL"):
    val = os.environ["CLOUDINARY_URL"].strip().strip("'").strip('"')
    if val.startswith("CLOUDINARY_URL="):
        val = val.split("=", 1)[1].strip().strip("'").strip('"')

    # Validate format. If invalid, remove it to prevent crash.
    if not val.startswith("cloudinary://"):
        print(
            f"WARNING: Invalid CLOUDINARY_URL format detected: {val[:15]}... Removing to allow startup."
        )
        del os.environ["CLOUDINARY_URL"]
    else:
        os.environ["CLOUDINARY_URL"] = val

from . import models, schemas, crud, database, auth, backup_service, google_drive_client
import cloudinary
import cloudinary.uploader
import cloudinary.api
from apscheduler.schedulers.background import BackgroundScheduler
import pytz

# Cloudinary Config
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL")
if CLOUDINARY_URL:
    # CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
    # The library auto-configures from this env var if set, but we can be explicit if needed
    pass

from sqlalchemy import text

models.Base.metadata.create_all(bind=database.engine)


# Auto-Migrate Schema for Cloud (Crucial for schema updates without losing data)
def check_and_migrate_tables():
    def add_column_safe(table, col_def):
        try:
            with database.engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_def}"))
                conn.commit()
                print(f"Added column {col_def} to {table}")
        except Exception as e:
            # Ignore error if column likely exists, but log it just in case
            print(f"Migration skipped for {table}.{col_def}: {e}")
            pass

    # Treatments
    add_column_safe("treatments", "canal_count INTEGER")
    add_column_safe("treatments", "canal_lengths VARCHAR")
    add_column_safe("treatments", "sessions TEXT")
    add_column_safe("treatments", "complications TEXT")

    # Attachments
    add_column_safe("attachments", "filename VARCHAR")
    add_column_safe("attachments", "file_type VARCHAR")

    # Multi-tenancy
    add_column_safe("patients", "tenant_id INTEGER REFERENCES tenants(id)")
    add_column_safe("appointments", "tenant_id INTEGER REFERENCES tenants(id)")
    add_column_safe("users", "tenant_id INTEGER REFERENCES tenants(id)")
    add_column_safe("users", "role VARCHAR DEFAULT 'doctor'")
    add_column_safe("tenants", "logo VARCHAR")
    add_column_safe("tenants", "subscription_end_date TIMESTAMP")
    add_column_safe("tenants", "plan VARCHAR DEFAULT 'trial'")
    add_column_safe("tenants", "is_active BOOLEAN DEFAULT TRUE")
    add_column_safe("tenants", "backup_frequency VARCHAR DEFAULT 'off'")
    add_column_safe("tenants", "google_refresh_token VARCHAR")
    add_column_safe("tenants", "last_backup_at TIMESTAMP")

    print("Schema migration steps completed.")


check_and_migrate_tables()


# Ensure at least one admin exists (for first-time setup in cloud)
def create_first_admin():
    db = database.SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "eslam").first()

        # Ensure Default Tenant Exists
        default_tenant = (
            db.query(models.Tenant)
            .filter(models.Tenant.name == "EslamEmara Clinic")
            .first()
        )
        if not default_tenant:
            default_tenant = models.Tenant(name="EslamEmara Clinic")
            db.add(default_tenant)
            db.commit()
            db.refresh(default_tenant)
            print("Default tenant 'EslamEmara Clinic' created.")

        if not admin:
            hashed_pw = auth.get_password_hash("1111")
            new_admin = models.User(
                username="eslam",
                hashed_password=hashed_pw,
                role="admin",
                tenant_id=default_tenant.id,
            )
            db.add(new_admin)
            db.commit()
            print("First admin 'eslam' created.")
        elif admin.tenant_id is None:
            admin.tenant_id = default_tenant.id
            db.commit()
            print("Assigned existing admin 'eslam' to default tenant.")

        # --- SUPER ADMIN CREATION (Auto-Seeded) ---
        super_email = "eslamemara1312@gmail.com"
        super_pass = "ESLAMomara11##"

        super_admin = (
            db.query(models.User).filter(models.User.username == super_email).first()
        )
        super_pw_hash = auth.get_password_hash(super_pass)

        if not super_admin:
            print(f"Creating Super Admin: {super_email}")
            new_super = models.User(
                username=super_email,
                hashed_password=super_pw_hash,
                role="super_admin",
                tenant_id=None,  # Super Admin has no tenant
            )
            db.add(new_super)
            db.commit()
        else:
            # Update password if exists (to ensure it matches what user wants)
            # Create/Get Default Tenant for Super Admin (to allow feature testing)
            default_tenant = (
                db.query(models.Tenant)
                .filter(models.Tenant.name == "System Admin Clinic")
                .first()
            )
            if not default_tenant:
                default_tenant = models.Tenant(
                    name="System Admin Clinic",
                    plan="premium",
                    subscription_end_date=datetime.utcnow() + timedelta(days=3650),
                )
                db.add(default_tenant)
                db.commit()
                db.refresh(default_tenant)

            # Update password and link tenant
            if (
                super_admin.role != "super_admin"
                or super_admin.tenant_id != default_tenant.id
            ):
                super_admin.role = "super_admin"
                super_admin.tenant_id = default_tenant.id
                print(f"Linked Super Admin to tenant: {default_tenant.id}")

            # Update password silently
            super_admin.hashed_password = super_pw_hash
            db.commit()
            print(f"Super Admin '{super_email}' ensured with Tenant access.")
    finally:
        db.close()


create_first_admin()

app = FastAPI(title="EslamEmara Clinic API")

# --- Google Drive & Scheduler ---
drive_client = google_drive_client.GoogleDriveClient(
    redirect_uri="http://localhost:8001/settings/backup/callback"
)
# NOTE: In production, this redirect_uri must match what you set in Google Console (e.g., https://your-site.com/settings/backup/callback)

scheduler = BackgroundScheduler(timezone=pytz.utc)


def run_scheduled_backups():
    print(f"[{datetime.utcnow()}] Checking for scheduled backups...")
    db = database.SessionLocal()
    try:
        tenants = (
            db.query(models.Tenant)
            .filter(models.Tenant.backup_frequency != "off")
            .all()
        )
        for tenant in tenants:
            if not tenant.google_refresh_token:
                continue

            should_run = False
            now = datetime.utcnow()
            last = tenant.last_backup_at or datetime.min

            if tenant.backup_frequency == "daily":
                if (now - last).days >= 1:
                    should_run = True
            elif tenant.backup_frequency == "weekly":
                if (now - last).days >= 7:
                    should_run = True
            elif tenant.backup_frequency == "monthly":
                if (now - last).days >= 30:
                    should_run = True

            if should_run:
                print(f"Backing up Tenant: {tenant.name}")
                try:
                    # 1. Create Filtered Dump
                    # We need to implement filtered dump in backup_service first.
                    # For now, we will just dump everything (Temporary, user asked for tenant specific).
                    # TODO: Filter by tenant_id
                    data = backup_service.create_json_dump(db, tenant_id=tenant.id)

                    # Save to file
                    filename = (
                        f"backup_{tenant.name}_{now.strftime('%Y%m%d_%H%M')}.json"
                    )
                    file_path = f"uploads/{filename}"
                    with open(file_path, "w") as f:
                        json.dump(data, f)

                    # 2. Upload to Drive
                    google_drive_client.GoogleDriveClient.upload_file(
                        tenant.google_refresh_token, file_path, filename
                    )

                    # 3. Update Status
                    tenant.last_backup_at = now
                    db.commit()

                    # Cleanup
                    os.remove(file_path)
                    print(f"Backup success for {tenant.name}")

                except Exception as e:
                    print(f"Backup Failed for {tenant.name}: {e}")

    finally:
        db.close()


scheduler.add_job(run_scheduled_backups, "interval", minutes=60)
scheduler.start()


origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://esdental.netlify.app",
    "https://dreslamemara.netlify.app",
    "https://dreslamemara.netlify.app/",
    "https://thriving-granita-1c47dc.netlify.app",
    "https://thriving-granita-1c47dc.netlify.app/",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="http://192\.168\.\d+\.\d+:\d+",  # Support local network access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if not exists
base_dir = os.path.dirname(os.path.abspath(__file__))
upload_dir = os.path.join(base_dir, "uploads")
os.makedirs(upload_dir, exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
app.mount("/static", StaticFiles(directory="static"), name="static")


# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def read_root():
    host = (
        os.getenv("BACKEND_PUBLIC_URL")
        or os.getenv("SPACE_HOST")
        or "LOCALHOST_FALLBACK"
    )
    return {
        "message": "Welcome to EslamEmara Clinic API",
        "detected_host": host,
        "env_check": {
            "BACKEND_PUBLIC_URL": os.getenv("BACKEND_PUBLIC_URL"),
            "SPACE_HOST": os.getenv("SPACE_HOST"),
        },
    }


from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print(f"DEBUG: Validating token: {token[:10]}...")
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        tenant_id: int = payload.get("tenant_id")
        print(f"DEBUG: Token username: {username}, tenant_id: {tenant_id}")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username, tenant_id=tenant_id)
    except auth.JWTError as e:
        print(f"DEBUG: JWT Decode Error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"DEBUG: Unexpected Auth Error: {e}")
        raise credentials_exception

    user = crud.get_user(db, username=token_data.username)
    if user is None:
        print(f"DEBUG: User {token_data.username} not found in DB")
        raise credentials_exception

    # Check Tenant Subscription
    if user.tenant and user.role != "super_admin":
        if not user.tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant account is inactive",
            )

        if (
            user.tenant.subscription_end_date
            and user.tenant.subscription_end_date < datetime.utcnow()
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Subscription expired"
            )

    return user


@app.put("/users/me", response_model=schemas.User)
def update_user_me(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Update Username
    if user_update.username and user_update.username != current_user.username:
        # Check uniqueness
        if crud.get_user(db, user_update.username):
            raise HTTPException(status_code=400, detail="Username already registered")
        current_user.username = user_update.username

    # 2. Update Password
    if user_update.password:
        current_user.hashed_password = auth.get_password_hash(user_update.password)

    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = crud.get_user(db, form_data.username)
    # verify_password now handles encoding inside it
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role, "tenant_id": user.tenant_id}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- Google Drive Endpoints ---


# Dynamic Redirect URI
def get_google_redirect_uri():
    # Allow manual override via BACKEND_PUBLIC_URL (User Configured)
    # OR automatic fallback to SPACE_HOST (System Provided, if broken, use manual)
    host = os.getenv("BACKEND_PUBLIC_URL") or os.getenv("SPACE_HOST")
    if host:
        # User might provide "smartclinic-v1.hf.space" or "https://..."
        if host.startswith("http"):
            return f"{host}/settings/backup/callback"
        return f"https://{host}/settings/backup/callback"
    return "http://localhost:8001/settings/backup/callback"


# Re-init client with dynamic URI (ignoring the one at top of file)
# We can just update the existing instance's redirect_uri before using it,
# or simpler: create a helper to get client.
def get_drive_client():
    uri = get_google_redirect_uri()
    drive_client.update_redirect_uri(uri)
    return drive_client


@app.get("/settings/backup/auth")
def google_auth_url(
    current_user: models.User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),  # Capture raw token
):
    client = get_drive_client()
    # Pass the JWT token as the 'state' parameter to persist user identity through the redirect
    return {"url": client.get_auth_url(state=token)}


@app.get("/settings/backup/callback")  # Changed to GET
def google_auth_callback(
    code: str,
    state: str = None,  # This contains our JWT token
    db: Session = Depends(get_db),
):
    # 1. Validate State (User Identity) manually since we don't have Authorization header
    if not state:
        raise HTTPException(
            status_code=400, detail="Missing state parameter (Authentication lost)"
        )

    tenant_id = None
    try:
        # Decode the JWT passed in 'state'
        # Allow expired tokens (verify_exp=False) since user might take time on consent screen
        payload = auth.jwt.decode(
            state,
            auth.SECRET_KEY,
            algorithms=[auth.ALGORITHM],
            options={"verify_exp": False},
        )
        username: str = payload.get("sub")
        tenant_id: int = payload.get("tenant_id")

        if username is None or tenant_id is None:
            raise Exception("Invalid token in state")

    except Exception as e:
        # Redirect to Frontend with Auth Error
        frontend_url = "http://localhost:5173/settings"
        host = os.getenv("BACKEND_PUBLIC_URL") or os.getenv("SPACE_HOST")
        if host:
            frontend_url = "https://smartdentclinic.netlify.app/settings"
            if os.getenv("FRONTEND_URL"):
                frontend_url = f"{os.getenv('FRONTEND_URL')}/settings"
        print(f"Callback Error: {e}")
        return RedirectResponse(
            f"{frontend_url}?status=error&detail=AuthFailed_{str(e)}"
        )

    try:
        client = get_drive_client()
        tokens = client.fetch_token(code)
        refresh_token = tokens.get("refresh_token")

        if not refresh_token:
            raise Exception(
                "Google refused to send Refresh Token. Revoke access and try again."
            )

        # Save to Tenant (Using ID from decoded state)
        tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
        if not tenant:
            raise Exception("Tenant not found")

        if refresh_token:
            tenant.google_refresh_token = refresh_token

        db.commit()

        # Redirect back to Frontend
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        # If running in cloud (detected via SPACE_HOST), ensure we don't accidentally redirect to localhost
        # But if FRONTEND_URL is set, we use it.
        # If not set, we default to localhost (dev) or raise warning?
        # Better: Set reasonable default for prod if known, but encourage env var.
        if os.getenv("SPACE_HOST") and not os.getenv("FRONTEND_URL"):
            print(
                "WARNING: FRONTEND_URL not set in Cloud Environment. Redirects might fail."
            )
            # Fallback to the known Netlify URL as a safety net until env var is set
            frontend_url = "https://smartdentclinic.netlify.app"

        return RedirectResponse(f"{frontend_url}/settings?status=success")

    except Exception as e:
        # Redirect to error
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        if os.getenv("SPACE_HOST") and not os.getenv("FRONTEND_URL"):
            frontend_url = "https://smartdentclinic.netlify.app"

        return RedirectResponse(f"{frontend_url}/settings?status=error&detail={str(e)}")


@app.put("/settings/backup/schedule")
def update_backup_schedule(
    frequency: str = Form(...),  # off, daily, weekly, monthly
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tenant = (
        db.query(models.Tenant)
        .filter(models.Tenant.id == current_user.tenant_id)
        .first()
    )
    tenant.backup_frequency = frequency
    db.commit()
    return {"message": f"Backup schedule set to {frequency}"}


@app.post("/settings/backup/now")
def trigger_backup_now(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    tenant = (
        db.query(models.Tenant)
        .filter(models.Tenant.id == current_user.tenant_id)
        .first()
    )
    if not tenant.google_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")

    # Trigger logic manually
    try:
        # Filtered Dump
        print(f"Starting Backup for Tenant: {tenant.id} ({tenant.name})")
        try:
            data = backup_service.create_json_dump(db, tenant_id=tenant.id)
        except Exception as e:
            print(f"Backup Dump Generation Failed: {e}")
            import traceback

            traceback.print_exc()
            raise Exception(f"Database Export Failed: {str(e)}")

        filename = f"manual_backup_{tenant.name}_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.json"

        # Ensure uploads dir exists
        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{filename}"

        with open(file_path, "w") as f:
            json.dump(data, f)

        print(
            f"Dump saved to {file_path}, Size: {os.path.getsize(file_path)} bytes. Uploading..."
        )

        try:
            google_drive_client.GoogleDriveClient.upload_file(
                tenant.google_refresh_token, file_path, filename
            )
        except Exception as e:
            print(f"Google Drive Upload Failed: {e}")
            import traceback

            traceback.print_exc()
            # Check for specific Google Auth errors if possible, or just pass generic
            if "RefreshError" in str(type(e).__name__) or "invalid_grant" in str(e):
                raise Exception(
                    "Google Drive Token Expired. Please Reconnect in Settings."
                )
            raise Exception(f"Google Drive Upload Failed: {str(e)}")

        tenant.last_backup_at = datetime.utcnow()
        db.commit()

        # Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)

        return {"message": "Backup uploaded successfully"}
    except Exception as e:
        print(f"Manual Backup CRITICAL ERROR: {e}")
        # Return internal server error but with the detail
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/register_clinic", response_model=schemas.Token)
def register_clinic(
    clinic_name: str = Form(...),
    admin_username: str = Form(...),
    admin_password: str = Form(...),
    logo: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    # Check if tenant exists
    if crud.get_tenant_by_name(db, clinic_name):
        raise HTTPException(status_code=400, detail="Clinic name already registered")
    # Check if user exists
    if crud.get_user(db, admin_username):
        raise HTTPException(status_code=400, detail="Username already taken")

    try:
        # Handle Logo Upload
        logo_path = None
        if logo:
            # Create static/logos directory if not exists
            os.makedirs("static/logos", exist_ok=True)
            # Generate unique filename
            ext = logo.filename.split(".")[-1]
            filename = f"{uuid.uuid4()}.{ext}"
            logo_path = f"static/logos/{filename}"

            with open(logo_path, "wb") as buffer:
                shutil.copyfileobj(logo.file, buffer)

            # Standardize path for URL (forward slashes)
            logo_path = logo_path.replace("\\", "/")

        # Create Tenant
        tenant = models.Tenant(name=clinic_name, logo=logo_path)
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

        # Create Admin User
        hashed_password = auth.get_password_hash(admin_password)
        new_user = models.User(
            username=admin_username,
            hashed_password=hashed_password,
            role="admin",
            tenant_id=tenant.id,
        )
        db.add(new_user)
        db.commit()

        # Generate Token
        access_token = auth.create_access_token(
            data={
                "sub": new_user.username,
                "role": new_user.role,
                "tenant_id": new_user.tenant_id,
            }
        )
        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        db.rollback()
        # Clean up logo if created
        if logo and logo_path and os.path.exists(logo_path):
            os.remove(logo_path)
        raise HTTPException(status_code=400, detail=str(e))


# --- Admin Endpoints ---
@app.get("/admin/tenants", response_model=List[schemas.Tenant])
def get_all_tenants(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.Tenant).offset(skip).limit(limit).all()


@app.put("/admin/tenants/{tenant_id}", response_model=schemas.Tenant)
def update_tenant(
    tenant_id: int,
    tenant_update: schemas.TenantUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if tenant_update.plan is not None:
        tenant.plan = tenant_update.plan
    if tenant_update.is_active is not None:
        tenant.is_active = tenant_update.is_active
    if tenant_update.subscription_end_date is not None:
        tenant.subscription_end_date = tenant_update.subscription_end_date

    db.commit()
    db.refresh(tenant)
    return tenant


@app.delete("/admin/tenants/{tenant_id}")
def delete_tenant(
    tenant_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    try:
        # Get all patients for this tenant first
        patients = (
            db.query(models.Patient).filter(models.Patient.tenant_id == tenant_id).all()
        )
        patient_ids = [p.id for p in patients]

        # Delete all patient-related data first (Treatments, Payments, Appointments, etc.)
        if patient_ids:
            db.query(models.Treatment).filter(
                models.Treatment.patient_id.in_(patient_ids)
            ).delete(synchronize_session=False)
            db.query(models.Payment).filter(
                models.Payment.patient_id.in_(patient_ids)
            ).delete(synchronize_session=False)
            db.query(models.ToothStatus).filter(
                models.ToothStatus.patient_id.in_(patient_ids)
            ).delete(synchronize_session=False)
            db.query(models.Attachment).filter(
                models.Attachment.patient_id.in_(patient_ids)
            ).delete(synchronize_session=False)
            db.query(models.Prescription).filter(
                models.Prescription.patient_id.in_(patient_ids)
            ).delete(synchronize_session=False)
            db.query(models.Appointment).filter(
                models.Appointment.patient_id.in_(patient_ids)
            ).delete(synchronize_session=False)

        # Delete tenant-level data
        db.query(models.Patient).filter(models.Patient.tenant_id == tenant_id).delete(
            synchronize_session=False
        )
        db.query(models.Procedure).filter(
            models.Procedure.tenant_id == tenant_id
        ).delete(synchronize_session=False)
        db.query(models.Expense).filter(models.Expense.tenant_id == tenant_id).delete(
            synchronize_session=False
        )
        db.query(models.User).filter(models.User.tenant_id == tenant_id).delete(
            synchronize_session=False
        )

        # Finally delete the tenant
        db.delete(tenant)
        db.commit()
        return {"message": "Tenant deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete tenant: {str(e)}"
        )


@app.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return current_user


# --- User Management (Admin Only) ---
@app.post("/register/", response_model=schemas.User)
def register_user(
    user: schemas.User,
    password: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    db_user = crud.get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = auth.get_password_hash(password)
    return crud.create_user(
        db=db,
        user=user,
        password_hash=hashed_password,
        tenant_id=current_user.tenant_id,
    )


@app.get("/users/", response_model=List[schemas.User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_users(db, current_user.tenant_id, skip=skip, limit=limit)


@app.delete("/users/{user_id}", response_model=schemas.User)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Prevent deleting self
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user_to_delete = (
        db.query(models.User)
        .filter(
            models.User.id == user_id, models.User.tenant_id == current_user.tenant_id
        )
        .first()
    )
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    # Extra safety: Prevent deleting the last admin
    if user_to_delete.role == "admin":
        admin_count = (
            db.query(models.User)
            .filter(
                models.User.role == "admin",
                models.User.tenant_id == current_user.tenant_id,
            )
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=400, detail="Cannot delete the last administrator"
            )

    try:
        return crud.delete_user(db, user_id, current_user.tenant_id)
    except Exception as e:
        print(f"DEBUG: Delete user failed: {e}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


# --- Patients Endpoints ---
@app.post("/patients/", response_model=schemas.Patient)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    # Example: Require auth for creating patient
    return crud.create_patient(db=db, patient=patient, tenant_id=current_user.tenant_id)


@app.get("/patients/search", response_model=List[schemas.Patient])
def search_patients(
    q: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.search_patients(db, query=q, tenant_id=current_user.tenant_id)


@app.get("/patients/", response_model=List[schemas.Patient])
def read_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.get_patients(db, current_user.tenant_id, skip=skip, limit=limit)


@app.get("/patients/{patient_id}", response_model=schemas.Patient)
def read_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    db_patient = crud.get_patient(
        db, patient_id=patient_id, tenant_id=current_user.tenant_id
    )
    if db_patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db_patient


@app.put("/patients/{patient_id}", response_model=schemas.Patient)
def update_patient(
    patient_id: int,
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.update_patient(
        db, patient_id, patient, tenant_id=current_user.tenant_id
    )


@app.delete("/patients/{patient_id}", response_model=schemas.Patient)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.delete_patient(db, patient_id, tenant_id=current_user.tenant_id)


# --- Appointments Endpoints ---
@app.post("/appointments/", response_model=schemas.Appointment)
def create_appointment(
    appointment: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    # Verify patient belongs to tenant
    patient = crud.get_patient(db, appointment.patient_id, current_user.tenant_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return crud.create_appointment(db=db, appointment=appointment)


@app.get("/appointments/", response_model=List[schemas.Appointment])
def read_appointments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.get_appointments(db, current_user.tenant_id, skip=skip, limit=limit)


@app.put("/appointments/{appointment_id}/status")
def update_appt_status(
    appointment_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.update_appointment_status(
        db, appointment_id, status, current_user.tenant_id
    )


# --- Dental Chart & Treatments ---
@app.post("/tooth_status/", response_model=schemas.ToothStatus)
def update_tooth(
    status: schemas.ToothStatusCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    # Verify patient
    patient = crud.get_patient(db, status.patient_id, current_user.tenant_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return crud.update_tooth_status(db, status, current_user.tenant_id)


@app.get(
    "/patients/{patient_id}/tooth_status", response_model=List[schemas.ToothStatus]
)
def get_patient_teeth(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    # Verify patient access implicitly via get_tooth_status join
    return crud.get_tooth_status(db, patient_id, current_user.tenant_id)


@app.post("/treatments/", response_model=schemas.Treatment)
def add_treatment(
    treatment: schemas.TreatmentCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    patient = crud.get_patient(db, treatment.patient_id, current_user.tenant_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return crud.create_treatment(db, treatment)


@app.get("/patients/{patient_id}/treatments", response_model=List[schemas.Treatment])
def get_patient_treatments(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.get_treatments(db, patient_id, current_user.tenant_id)


@app.delete("/treatments/{treatment_id}")
def delete_treatment(
    treatment_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.delete_treatment(db, treatment_id, current_user.tenant_id)


@app.put("/treatments/{treatment_id}", response_model=schemas.Treatment)
def update_treatment_endpoint(
    treatment_id: int,
    treatment: schemas.TreatmentCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    db_treatment = crud.update_treatment(
        db, treatment_id, treatment, current_user.tenant_id
    )
    if not db_treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    return db_treatment


# --- Billing ---
@app.post("/payments/", response_model=schemas.Payment)
def add_payment(
    payment: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    patient = crud.get_patient(db, payment.patient_id, current_user.tenant_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return crud.create_payment(db, payment, current_user.tenant_id)


@app.get("/finance/stats", response_model=schemas.FinancialStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.get_financial_stats(db, current_user.tenant_id)


@app.get("/payments/", response_model=List[schemas.Payment])
def read_payments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.get_all_payments(db, current_user.tenant_id, skip=skip, limit=limit)


@app.get("/patients/{patient_id}/payments", response_model=List[schemas.Payment])
def get_patient_payments(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.get_payments(db, patient_id, current_user.tenant_id)


@app.delete("/payments/{payment_id}")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.delete_payment(db, payment_id, current_user.tenant_id)


# --- Backup ---
@app.get("/backup/download")
def download_backup(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Generate Tenant-Specific Dump
    try:
        dump_data = backup_service.create_json_dump(
            db, tenant_id=current_user.tenant_id
        )

        # Save to temp file
        filename = f"backup_clinic_{current_user.tenant_id}_{datetime.now().strftime('%Y%m%d')}.json"
        filepath = os.path.join("temp", filename)
        os.makedirs("temp", exist_ok=True)

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(dump_data, f, ensure_ascii=False, indent=2)

        return FileResponse(
            path=filepath, filename=filename, media_type="application/json"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Backup generation failed: {str(e)}"
        )


@app.post("/backup/upload")
async def upload_backup(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_location = f"temp_restore_{uuid.uuid4()}"

    try:
        # Save uploaded file
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)

        # Detect file type
        is_sqlite = False
        with open(file_location, "rb") as f:
            header = f.read(16)
            if header.startswith(b"SQLite format 3"):
                is_sqlite = True

        if is_sqlite:
            stats = backup_service.import_from_sqlite(db, file_location)
            # Format stats
            lines = ["Restore Report:"]
            for table, counts in stats.items():
                if counts["restored"] > 0 or counts["errors"] > 0:
                    lines.append(
                        f"{table.title()}: {counts['restored']} restored, {counts['errors']} skipped"
                    )
            msg = "\n".join(lines) if len(lines) > 1 else "No data found to restore."
        else:
            # Try JSON
            with open(file_location, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                    stats = backup_service.import_from_json(db, data)
                    lines = ["Restore Report:"]
                    for table, counts in stats.items():
                        if counts["restored"] > 0 or counts["errors"] > 0:
                            lines.append(
                                f"{table.title()}: {counts['restored']} restored, {counts['errors']} skipped"
                            )
                    msg = (
                        "\n".join(lines)
                        if len(lines) > 1
                        else "No data found to restore."
                    )
                except json.JSONDecodeError:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid backup file format. Must be SQLite .db or JSON.",
                    )

        return {"detail": "Restore Successful", "report": msg}

    except Exception as e:
        print(f"Restore error: {e}")
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

    finally:
        # Always clean up the temp file
        if os.path.exists(file_location):
            try:
                os.remove(file_location)
            except Exception:
                pass


# --- Procedures Endpoints ---
@app.get("/procedures/", response_model=List[schemas.Procedure])
def read_procedures(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.get_procedures(db, current_user.tenant_id, skip=skip, limit=limit)


@app.post("/procedures/", response_model=schemas.Procedure)
def create_procedure(
    procedure: schemas.ProcedureCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.create_procedure(
        db=db, procedure=procedure, tenant_id=current_user.tenant_id
    )


@app.put("/procedures/{procedure_id}", response_model=schemas.Procedure)
def update_procedure(
    procedure_id: int,
    procedure: schemas.ProcedureCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.update_procedure(db, procedure_id, procedure, current_user.tenant_id)


@app.delete("/procedures/{procedure_id}", response_model=schemas.Procedure)
def delete_procedure(
    procedure_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.delete_procedure(db, procedure_id, current_user.tenant_id)


import uuid


# --- Attachments ---
@app.post("/upload/", response_model=schemas.Attachment)
@app.post("/upload/", response_model=schemas.Attachment)
async def upload_file(
    patient_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    # Verify patient ownership
    patient = crud.get_patient(db, patient_id, current_user.tenant_id)
    if not patient:
        raise HTTPException(
            status_code=404, detail="Patient not found or access denied"
        )

    print(f"DEBUG: Upload request for patient {patient_id}, filename: {file.filename}")
    # Check if Cloudinary is configured
    cloudinary_url = os.getenv("CLOUDINARY_URL")
    if cloudinary_url:
        try:
            print("DEBUG: Attempting Cloudinary upload...")
            result = cloudinary.uploader.upload(
                file.file, folder="clinic_uploads", resource_type="auto"
            )

            file_url = result.get("secure_url")
            print(f"DEBUG: Cloudinary Success: {file_url}")

            attachment_data = schemas.AttachmentCreate(
                patient_id=patient_id,
                file_path=file_url,
                filename=file.filename,
                file_type=file.content_type or "application/octet-stream",
            )
            return crud.create_attachment(db, attachment_data)

        except Exception as e:
            print(f"DEBUG: Cloudinary upload failed: {e}")
            # Fallback will happen below if we don't return here

    print("DEBUG: Using Local Storage Fallback...")
    # Fallback to Local Storage
    try:
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"

        base_dir = os.path.dirname(os.path.abspath(__file__))
        upload_dir = os.path.join(base_dir, "uploads")
        os.makedirs(upload_dir, exist_ok=True)

        file_location = os.path.join(upload_dir, unique_filename)

        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)

        relative_path = f"/uploads/{unique_filename}"

        attachment_data = schemas.AttachmentCreate(
            patient_id=patient_id,
            file_path=relative_path,
            filename=file.filename,
            file_type=file.content_type or "application/octet-stream",
        )

        return crud.create_attachment(db, attachment_data)
    except Exception as e:
        print(f"DEBUG: Local upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/patients/{patient_id}/attachments", response_model=List[schemas.Attachment])
def read_patient_attachments(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.get_patient_attachments(db, patient_id, current_user.tenant_id)


@app.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    # Restrict finding the attachment to the tenant
    db_attachment = (
        db.query(models.Attachment)
        .join(models.Patient)
        .filter(
            models.Attachment.id == attachment_id,
            models.Patient.tenant_id == current_user.tenant_id,
        )
        .first()
    )
    if not db_attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Attempt to delete file
    try:
        if "cloudinary.com" in db_attachment.file_path:
            # It's a cloudinary url
            if os.getenv("CLOUDINARY_URL"):
                # Extract public_id.
                # URL is like: https://res.cloudinary.com/demo/image/upload/v1570979139/clinic_uploads/sample.jpg
                # We need 'clinic_uploads/sample'
                parts = db_attachment.file_path.split("/")
                # Find index of 'upload'
                if "upload" in parts:
                    idx = parts.index("upload")
                    # public id is everything after version (v12345) to end, minus extension
                    # This is tricky without regex, let's try a simpler approach if possible.
                    # Usually, the last two parts: folder/filename.ext
                    folder_file = "/".join(parts[idx + 2 :])  # skip 'v123...'
                    public_id = os.path.splitext(folder_file)[0]
                    cloudinary.uploader.destroy(public_id)
        else:
            # Local file deletion
            # Note: file_path here is relative /uploads/filename.ext
            # or full path? In local mode we stored relative.
            base_dir = os.path.dirname(os.path.abspath(__file__))
            # Remove leading slash
            rel_path = db_attachment.file_path.lstrip("/")
            full_path = os.path.join(base_dir, rel_path)
            if os.path.exists(full_path):
                os.remove(full_path)
    except Exception as e:
        print(f"Error deleting file: {e}")

    return crud.delete_attachment(db, attachment_id, current_user.tenant_id)


# --- Expenses ---
@app.post("/expenses/", response_model=schemas.Expense)
def create_expense(
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.create_expense(db, expense, current_user.tenant_id)


@app.get("/expenses/", response_model=List[schemas.Expense])
def read_expenses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.get_expenses(db, current_user.tenant_id, skip=skip, limit=limit)


@app.delete("/expenses/{expense_id}", response_model=schemas.Expense)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    return crud.delete_expense(db, expense_id, current_user.tenant_id)


from pydantic import BaseModel


class OCRRequest(BaseModel):
    base64Image: str


@app.post("/ocr/")
async def proxy_ocr(request: OCRRequest):
    """
    Proxy request to OCR.space to avoid CORS and handle API keys securely.
    """
    try:
        import httpx
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Missing dependency 'httpx' on server. Please run 'pip install httpx'.",
        )

    api_url = "https://api.ocr.space/parse/image"
    # Using Engine 2 which is more modern and better at handling noise/handwriting.
    # We specify 'ara' for explicit Arabic support.
    payload = {
        "apikey": "helloworld",
        "language": "ara",
        "base64Image": request.base64Image,
        "OCREngine": "1",
        "scale": "true",
        "detectOrientation": "true",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(api_url, data=payload, timeout=30.0)
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OCR API error: {str(e)}")
