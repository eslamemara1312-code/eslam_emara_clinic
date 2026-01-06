from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import uuid
from datetime import timedelta
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
        print(f"WARNING: Invalid CLOUDINARY_URL format detected: {val[:15]}... Removing to allow startup.")
        del os.environ["CLOUDINARY_URL"]
    else:
        os.environ["CLOUDINARY_URL"] = val

from . import models, schemas, crud, database, auth, backup_service
import cloudinary
import cloudinary.uploader
import cloudinary.api

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
    try:
        with database.engine.connect() as conn:
            # Treatments Table Updates
            conn.execute(text("ALTER TABLE treatments ADD COLUMN IF NOT EXISTS canal_count INTEGER;"))
            conn.execute(text("ALTER TABLE treatments ADD COLUMN IF NOT EXISTS canal_lengths VARCHAR;"))
            conn.execute(text("ALTER TABLE treatments ADD COLUMN IF NOT EXISTS sessions TEXT;"))
            conn.execute(text("ALTER TABLE treatments ADD COLUMN IF NOT EXISTS complications TEXT;"))
            
            # Attachments Table Updates
            conn.execute(text("ALTER TABLE attachments ADD COLUMN IF NOT EXISTS filename VARCHAR;"))
            conn.execute(text("ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_type VARCHAR;"))
            
            conn.commit()
            print("Schema migration completed successfully.")
    except Exception as e:
        print(f"Migration skipped or failed (might be SQLite or already exists): {e}")

check_and_migrate_tables()

# Ensure at least one admin exists (for first-time setup in cloud)
def create_first_admin():
    db = database.SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "eslam").first()
        if not admin:
            hashed_pw = auth.get_password_hash("1111")
            new_admin = models.User(username="eslam", hashed_password=hashed_pw, role="admin")
            db.add(new_admin)
            db.commit()
            print("First admin 'eslam' created.")
    finally:
        db.close()

create_first_admin()

app = FastAPI(title="EslamEmara Clinic API")

# Allow CORS for React Frontend (running on port 5173 usually)
# Allow CORS for React Frontend
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
    allow_origin_regex="http://192\.168\.\d+\.\d+:\d+", # Support local network access
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

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to EslamEmara Clinic API"}

from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print(f"DEBUG: Validating token: {token[:10]}...")
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        print(f"DEBUG: Token username: {username}")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
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
    return user

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user(db, form_data.username)
    # verify_password now handles encoding inside it
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return current_user

# --- User Management (Admin Only) ---
@app.post("/register/", response_model=schemas.User)
def register_user(user: schemas.User, password: str, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_user = crud.get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(password)
    return crud.create_user(db=db, user=user, password_hash=hashed_password)

@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_users(db, skip=skip, limit=limit)

@app.delete("/users/{user_id}", response_model=schemas.User)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Prevent deleting self
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Extra safety: Prevent deleting the last admin
    if user_to_delete.role == "admin":
        admin_count = db.query(models.User).filter(models.User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last administrator")

    try:
        return crud.delete_user(db, user_id)
    except Exception as e:
        print(f"DEBUG: Delete user failed: {e}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

# --- Patients Endpoints ---
@app.post("/patients/", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Example: Require auth for creating patient
    return crud.create_patient(db=db, patient=patient)

@app.get("/patients/search", response_model=List[schemas.Patient])
def search_patients(q: str, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return crud.search_patients(db, query=q)

@app.get("/patients/", response_model=List[schemas.Patient])
def read_patients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return crud.get_patients(db, skip=skip, limit=limit)

@app.get("/patients/{patient_id}", response_model=schemas.Patient)
def read_patient(patient_id: int, db: Session = Depends(get_db)):
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if db_patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db_patient

@app.put("/patients/{patient_id}", response_model=schemas.Patient)
def update_patient(patient_id: int, patient: schemas.PatientCreate, db: Session = Depends(get_db)):
    return crud.update_patient(db, patient_id, patient)

@app.delete("/patients/{patient_id}", response_model=schemas.Patient)
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    return crud.delete_patient(db, patient_id)

# --- Appointments Endpoints ---
@app.post("/appointments/", response_model=schemas.Appointment)
def create_appointment(appointment: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    return crud.create_appointment(db=db, appointment=appointment)

@app.get("/appointments/", response_model=List[schemas.Appointment])
def read_appointments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return crud.get_appointments(db, skip=skip, limit=limit)

@app.put("/appointments/{appointment_id}/status")
def update_appt_status(appointment_id: int, status: str, db: Session = Depends(get_db)):
    return crud.update_appointment_status(db, appointment_id, status)

# --- Dental Chart & Treatments ---
@app.post("/tooth_status/", response_model=schemas.ToothStatus)
def update_tooth(status: schemas.ToothStatusCreate, db: Session = Depends(get_db)):
    return crud.update_tooth_status(db, status)

@app.get("/patients/{patient_id}/tooth_status", response_model=List[schemas.ToothStatus])
def get_patient_teeth(patient_id: int, db: Session = Depends(get_db)):
    return crud.get_tooth_status(db, patient_id)

@app.post("/treatments/", response_model=schemas.Treatment)
def add_treatment(treatment: schemas.TreatmentCreate, db: Session = Depends(get_db)):
    return crud.create_treatment(db, treatment)

@app.get("/patients/{patient_id}/treatments", response_model=List[schemas.Treatment])
def get_patient_treatments(patient_id: int, db: Session = Depends(get_db)):
    return crud.get_treatments(db, patient_id)

@app.delete("/treatments/{treatment_id}")
def delete_treatment(treatment_id: int, db: Session = Depends(get_db)):
    return crud.delete_treatment(db, treatment_id)

@app.put("/treatments/{treatment_id}", response_model=schemas.Treatment)
def update_treatment_endpoint(treatment_id: int, treatment: schemas.TreatmentCreate, db: Session = Depends(get_db)):
    db_treatment = crud.update_treatment(db, treatment_id, treatment)
    if not db_treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    return db_treatment

# --- Billing ---
@app.post("/payments/", response_model=schemas.Payment)
def add_payment(payment: schemas.PaymentCreate, db: Session = Depends(get_db)):
    return crud.create_payment(db, payment)

@app.get("/finance/stats", response_model=schemas.FinancialStats)
def get_stats(db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return crud.get_financial_stats(db)

@app.get("/payments/", response_model=List[schemas.Payment])
def read_payments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_all_payments(db, skip=skip, limit=limit)

@app.get("/patients/{patient_id}/payments", response_model=List[schemas.Payment])
def get_patient_payments(patient_id: int, db: Session = Depends(get_db)):
    return crud.get_payments(db, patient_id)

@app.delete("/payments/{payment_id}")
def delete_payment(payment_id: int, db: Session = Depends(get_db)):
    return crud.delete_payment(db, payment_id)

# --- Backup ---
@app.get("/backup/download")
def download_backup(db: Session = Depends(get_db)):
    # Create JSON dump for compatibility across SQLite/Postgres
    dump_data = backup_service.create_json_dump(db)
    
    # Save to temp file
    file_path = "clinic_backup.json"
    with open(file_path, "w", encoding='utf-8') as f:
        json.dump(dump_data, f, ensure_ascii=False, indent=2)
        
    return FileResponse(path=file_path, filename="clinic_backup.json", media_type='application/json')

@app.post("/backup/upload")
async def upload_backup(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_location = f"temp_restore_{uuid.uuid4()}"
    
    # Save uploaded file
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    
    try:
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
                    lines.append(f"{table.title()}: {counts['restored']} restored, {counts['errors']} skipped")
            if len(lines) == 1:
                lines.append("No data found to restore.")
            msg = "\n".join(lines)
        else:
            # Try JSON
            with open(file_location, "r", encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    stats = backup_service.import_from_json(db, data)
                    lines = ["Restore Report:"]
                    for table, counts in stats.items():
                        if counts["restored"] > 0 or counts["errors"] > 0:
                            lines.append(f"{table.title()}: {counts['restored']} restored, {counts['errors']} skipped")
                    if len(lines) == 1:
                        lines.append("No data found to restore.")
                    msg = "\n".join(lines)
                except json.JSONDecodeError:
                     raise HTTPException(status_code=400, detail="Invalid backup file format. Must be SQLite .db or JSON.")

    except Exception as e:
        print(f"Restore error: {e}")
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)
    
    return {"info": msg}

# --- Procedures Endpoints ---
@app.get("/procedures/", response_model=List[schemas.Procedure])
def read_procedures(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_procedures(db, skip=skip, limit=limit)

@app.post("/procedures/", response_model=schemas.Procedure)
def create_procedure(procedure: schemas.ProcedureCreate, db: Session = Depends(get_db)):
    return crud.create_procedure(db=db, procedure=procedure)

@app.put("/procedures/{procedure_id}", response_model=schemas.Procedure)
def update_procedure(procedure_id: int, procedure: schemas.ProcedureCreate, db: Session = Depends(get_db)):
    return crud.update_procedure(db, procedure_id, procedure)

@app.delete("/procedures/{procedure_id}", response_model=schemas.Procedure)
def delete_procedure(procedure_id: int, db: Session = Depends(get_db)):
    return crud.delete_procedure(db, procedure_id)

import uuid

# --- Attachments ---
@app.post("/upload/", response_model=schemas.Attachment)
async def upload_file(patient_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    print(f"DEBUG: Upload request for patient {patient_id}, filename: {file.filename}")
    # Check if Cloudinary is configured
    cloudinary_url = os.getenv("CLOUDINARY_URL")
    if cloudinary_url:
        try:
            print("DEBUG: Attempting Cloudinary upload...")
            result = cloudinary.uploader.upload(file.file, folder="clinic_uploads", resource_type="auto")
            
            file_url = result.get("secure_url")
            print(f"DEBUG: Cloudinary Success: {file_url}")
            
            attachment_data = schemas.AttachmentCreate(
                patient_id=patient_id,
                file_path=file_url,
                filename=file.filename,
                file_type=file.content_type or "application/octet-stream"
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
            file_type=file.content_type or "application/octet-stream"
        )
        
        return crud.create_attachment(db, attachment_data)
    except Exception as e:
        print(f"DEBUG: Local upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/patients/{patient_id}/attachments", response_model=List[schemas.Attachment])
def read_patient_attachments(patient_id: int, db: Session = Depends(get_db)):
    return crud.get_patient_attachments(db, patient_id=patient_id)

@app.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Add auth check if needed
    db_attachment = db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()
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
                if 'upload' in parts:
                    idx = parts.index('upload')
                    # public id is everything after version (v12345) to end, minus extension
                    # This is tricky without regex, let's try a simpler approach if possible.
                    # Usually, the last two parts: folder/filename.ext
                    folder_file = "/".join(parts[idx+2:]) # skip 'v123...'
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

    return crud.delete_attachment(db, attachment_id)

# --- Expenses ---
@app.post("/expenses/", response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    return crud.create_expense(db, expense)

@app.get("/expenses/", response_model=List[schemas.Expense])
def read_expenses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_expenses(db, skip=skip, limit=limit)

@app.delete("/expenses/{expense_id}", response_model=schemas.Expense)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    return crud.delete_expense(db, expense_id)

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
        raise HTTPException(status_code=500, detail="Missing dependency 'httpx' on server. Please run 'pip install httpx'.")
        
    api_url = "https://api.ocr.space/parse/image"
    # Using Engine 2 which is more modern and better at handling noise/handwriting.
    # We specify 'ara' for explicit Arabic support.
    payload = {
        "apikey": "helloworld", 
        "language": "ara",
        "base64Image": request.base64Image,
        "OCREngine": "1",
        "scale": "true",
        "detectOrientation": "true"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(api_url, data=payload, timeout=30.0)
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OCR API error: {str(e)}")
