from backend.database import SessionLocal, engine
from backend import models, auth, crud

db = SessionLocal()

username = "admin"
new_password = "123"

user = crud.get_user(db, username)
if user:
    print(f"User {username} found. Resetting password...")
    hashed_password = auth.get_password_hash(new_password)
    user.hashed_password = hashed_password
    db.commit()
    print(f"Password for '{username}' reset to '{new_password}'")
else:
    print(f"User {username} not found. Creating...")
    hashed_password = auth.get_password_hash(new_password)
    new_user = models.User(username=username, hashed_password=hashed_password, role="doctor")
    db.add(new_user)
    db.commit()
    print(f"User '{username}' created with password '{new_password}'")

db.close()
