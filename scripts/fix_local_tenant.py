import sys
import os
from datetime import datetime
import json

# Add root to sys.path
sys.path.append(os.getcwd())

from backend import database, models, auth


def fix_local_tenant():
    db = database.SessionLocal()
    try:
        user = (
            db.query(models.User)
            .filter(models.User.username == "eslamemara1312@gmail.com")
            .first()
        )
        if not user:
            print("User not found.")
            return

        print(f"User found. TenantID: {user.tenant_id}")

        # Create Dummy Tenant
        tenant = (
            db.query(models.Tenant)
            .filter(models.Tenant.name == "Local Debug Clinic")
            .first()
        )
        if not tenant:
            tenant = models.Tenant(name="Local Debug Clinic", plan="premium")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            print("Created Local Debug Clinic")

        user.tenant_id = tenant.id
        db.commit()
        print(f"Assigned Tenant {tenant.id} to user.")

        # We need a Google Refresh Token to test upload
        # I cannot fake this easily.
        # But I can check if the code *attempts* upload if I mock the token.
        tenant.google_refresh_token = "mock_refresh_token_for_debug"
        db.commit()
        print("Set mock refresh token.")

    finally:
        db.close()


if __name__ == "__main__":
    fix_local_tenant()
