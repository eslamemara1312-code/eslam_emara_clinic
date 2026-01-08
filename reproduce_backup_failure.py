import sys
import os
import datetime
import json

# Add root to sys.path
sys.path.append(os.getcwd())

from backend import database, models, backup_service, google_drive_client


def test_backup():
    print("--- Starting Backup Failure Reproduction ---")
    db = database.SessionLocal()
    try:
        user_email = "eslamemara1312@gmail.com"
        user = db.query(models.User).filter(models.User.username == user_email).first()
        if not user:
            print(f"ERROR: User {user_email} not found.")
            return

        print(f"User: {user.username}, Role: {user.role}, TenantID: {user.tenant_id}")

        tenant = (
            db.query(models.Tenant).filter(models.Tenant.id == user.tenant_id).first()
        )
        if not tenant:
            print("ERROR: Tenant not found.")
            return

        print(f"Tenant: {tenant.name} (ID: {tenant.id})")

        if not tenant.google_refresh_token:
            print("ERROR: No Google Refresh Token found for tenant.")
            return

        print(f"Refresh Token: {tenant.google_refresh_token[:10]}...")

        # 1. Test Dump Generation
        print("\n[1/2] Testing JSON Dump Generation...")
        try:
            data = backup_service.create_json_dump(db, tenant_id=tenant.id)
            print(f"SUCCESS: Dump generated. Keys: {list(data.keys())}")
            # Serialize to check for JSON errors
            json_str = json.dumps(data)
            print(f"SUCCESS: JSON Serialization passed. Size: {len(json_str)} bytes")
        except Exception as e:
            print(f"FAILURE: Dump/Serialization failed: {e}")
            import traceback

            traceback.print_exc()
            return

        # 2. Test Google Drive Upload
        print("\n[2/2] Testing Google Drive Upload...")
        dummy_filename = (
            f"debug_upload_{datetime.datetime.now().strftime('%H%M%S')}.txt"
        )
        dummy_path = dummy_filename
        with open(dummy_path, "w") as f:
            f.write("Debug upload test content.")

        try:
            google_drive_client.GoogleDriveClient.upload_file(
                tenant.google_refresh_token, dummy_path, dummy_filename
            )
            print("SUCCESS: Google Drive Upload worked!")
        except Exception as e:
            print(f"FAILURE: Google Drive Upload failed: {e}")
            # Identify if it's "invalid_grant" -> Token revoked
            # Identify if it's "timeout" -> Network
            import traceback

            traceback.print_exc()
        finally:
            if os.path.exists(dummy_path):
                os.remove(dummy_path)

    finally:
        db.close()
        print("\n--- End of Reproduction ---")


if __name__ == "__main__":
    test_backup()
