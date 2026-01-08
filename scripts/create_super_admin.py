from backend import models, auth
from backend.database import SessionLocal, engine

# Create DB Tables
models.Base.metadata.create_all(bind=engine)


def create_super_admin():
    db = SessionLocal()
    try:
        username = "eslamemara1312@gmail.com"
        password = "ESLAMomara11##"

        db_user = (
            db.query(models.User).filter(models.User.role == "super_admin").first()
        )

        hashed_pw = auth.get_password_hash(password)

        if db_user:
            print("Super Admin found. Updating credentials...")
            db_user.username = username
            db_user.hashed_password = hashed_pw
        else:
            print("Creating new Super Admin...")
            # tenant_id is None for Super Admin
            new_admin = models.User(
                username=username,
                hashed_password=hashed_pw,
                role="super_admin",
                tenant_id=None,
            )
            db.add(new_admin)

        db.commit()
        print(f"Super Admin Updated/Created: {username} / {password}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_super_admin()
