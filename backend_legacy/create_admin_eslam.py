import sys
sys.path.append('.')
from database import SessionLocal, engine
from models import User, Base
from auth import get_password_hash

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Create session
db = SessionLocal()

try:
    # Check if user already exists
    existing_user = db.query(User).filter(User.username == "eslam").first()
    
    if existing_user:
        print("User 'eslam' already exists!")
        print(f"Current role: {existing_user.role}")
        # Update password and ensure admin role
        existing_user.hashed_password = get_password_hash("1111")
        existing_user.role = "admin"
        db.commit()
        print("Password updated to '1111' and role set to 'admin'")
    else:
        # Create new admin user
        new_user = User(
            username="eslam",
            hashed_password=get_password_hash("1111"),
            role="admin"
        )
        db.add(new_user)
        db.commit()
        print("Admin user 'eslam' created successfully!")
        print("Username: eslam")
        print("Password: 1111")
        print("Role: admin")
        
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
