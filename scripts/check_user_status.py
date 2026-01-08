from backend.database import SessionLocal
from backend import models, auth

db = SessionLocal()
try:
    user = (
        db.query(models.User)
        .filter(models.User.username == "eslamemara1312@gmail.com")
        .first()
    )
    if user:
        print(f"User found: {user.username}")
        print(f"Role: {user.role}")
        print(
            f"Hash matches 'ESLAMomara11##': {auth.verify_password('ESLAMomara11##', user.hashed_password)}"
        )
        print(
            f"Hash matches 'superpassword123': {auth.verify_password('superpassword123', user.hashed_password)}"
        )
    else:
        print("User 'eslam' NOT found.")
finally:
    db.close()
