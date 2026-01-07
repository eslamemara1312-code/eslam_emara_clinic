from backend.database import SessionLocal
from backend import models, auth

db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.username == "eslam").first()
    if user:
        print(f"User found: {user.username}")
        print(f"Role: {user.role}")
        print(f"Hash matches '1111': {auth.verify_password('1111', user.hashed_password)}")
    else:
        print("User 'eslam' NOT found.")
finally:
    db.close()
