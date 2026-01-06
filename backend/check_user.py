import sys
sys.path.append('.')
from database import SessionLocal
from models import User
from auth import verify_password, get_password_hash

db = SessionLocal()

try:
    users = db.query(User).all()
    print(f"Total users: {len(users)}")
    
    for user in users:
        print(f"\nUsername: {user.username}, Role: {user.role}")
    
    print("\n" + "="*50)
    eslam_user = db.query(User).filter(User.username == "eslam").first()
    
    if eslam_user:
        print("User 'eslam' EXISTS")
        print(f"Role: {eslam_user.role}")
        
        # Test password
        test_pass = "1111"
        is_valid = verify_password(test_pass, eslam_user.hashed_password)
        print(f"\nPassword '1111' verification: {is_valid}")
        
        if not is_valid:
            print("\nPassword verification FAILED - Updating password...")
            eslam_user.hashed_password = get_password_hash("1111")
            db.commit()
            print("Password updated!")
            
            # Test again
            is_valid_now = verify_password("1111", eslam_user.hashed_password)
            print(f"New verification: {is_valid_now}")
        else:
            print("\nPassword is CORRECT - Login should work!")
    else:
        print("User 'eslam' NOT FOUND - Creating...")
        new_user = User(
            username="eslam",
            hashed_password=get_password_hash("1111"),
            role="admin"
        )
        db.add(new_user)
        db.commit()
        print("User created!")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
