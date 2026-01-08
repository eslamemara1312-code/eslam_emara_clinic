from backend import models, crud
from backend.database import SessionLocal

db = SessionLocal()
try:
    # Test crud.get_user with lowercase
    u1 = crud.get_user(db, "eslam")
    print(f"crud.get_user('eslam'): {u1 is not None}")
    
    # Test crud.get_user with MixedCase
    u2 = crud.get_user(db, "Eslam")
    print(f"crud.get_user('Eslam'): {u2 is not None}")
    
finally:
    db.close()
