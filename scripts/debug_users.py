from backend import database, models
from sqlalchemy.orm import Session


def debug_users():
    db = database.SessionLocal()
    try:
        print("--- Existing Users ---")
        users = db.query(models.User).all()
        for user in users:
            print(
                f"ID: {user.id} | Username: {user.username} | Role: {user.role} | TenantID: {user.tenant_id}"
            )

        print("\n--- Tenants ---")
        tenants = db.query(models.Tenant).all()
        for t in tenants:
            print(f"ID: {t.id} | Name: {t.name}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    debug_users()
