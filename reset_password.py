from backend import database, models, auth


def reset_password():
    db = database.SessionLocal()
    try:
        # 1. Reset Super Admin
        email = "eslamemara1312@gmail.com"
        password = "ESLAMomara11##"
        user = db.query(models.User).filter(models.User.username == email).first()
        if user:
            user.hashed_password = auth.get_password_hash(password)
            user.role = "super_admin"
            db.commit()
            print(f"Verified User: {email} | Password Reset: Success")
        else:
            print(f"User {email} NOT FOUND!")

        # 2. Reset Default Admin
        user_eslam = (
            db.query(models.User).filter(models.User.username == "eslam").first()
        )
        if user_eslam:
            user_eslam.hashed_password = auth.get_password_hash("1111")
            db.commit()
            print(f"Verified User: eslam | Password Reset (1111): Success")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    reset_password()
