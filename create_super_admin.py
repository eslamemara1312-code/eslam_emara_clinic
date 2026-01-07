from backend import models, auth
from backend.database import SessionLocal, engine

# Create DB Tables
models.Base.metadata.create_all(bind=engine)


def create_super_admin():
    db = SessionLocal()
    try:
        username = "superadmin"
        password = "superpassword123"

        existing_user = (
            db.query(models.User).filter(models.User.username == username).first()
        )
        if existing_user:
            print("Super Admin already exists.")
            return

        hashed_pw = auth.get_password_hash(password)
        # tenant_id is None for Super Admin
        new_admin = models.User(
            username=username,
            hashed_password=hashed_pw,
            role="super_admin",
            tenant_id=None,
        )
        db.add(new_admin)
        db.commit()
        print(f"Super Admin created: {username} / {password}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_super_admin()
