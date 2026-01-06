from backend.database import SessionLocal, engine
from backend import models, auth, crud, schemas

# Initialize DB
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Check if admin exists
user = crud.get_user(db, "admin")
if not user:
    print("Creating default admin user...")
    hashed_password = auth.get_password_hash("admin123")
    user_data = schemas.User(username="admin", role="doctor")
    crud.create_user(db, user_data, hashed_password)
    print("User 'admin' created with password 'admin123'")
else:
    print("User 'admin' already exists.")

db.close()
