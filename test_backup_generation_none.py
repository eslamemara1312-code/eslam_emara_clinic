import os
import json
from datetime import datetime
from backend import database, backup_service, models


def test_full_flow_none_tenant():
    db = database.SessionLocal()
    tenant_id = None  # Test Super Admin / No Tenant
    print(f"Testing Flow for Tenant {tenant_id}...")

    try:
        # 1. Generate Data
        dump_data = backup_service.create_json_dump(db, tenant_id=tenant_id)

        # 2. Save File
        filename = f"backup_clinic_ALL_{datetime.now().strftime('%Y%m%d')}.json"
        filepath = os.path.join("temp", filename)
        os.makedirs("temp", exist_ok=True)

        print(f"Writing to {filepath}...")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(dump_data, f, ensure_ascii=False, indent=2)

        print("Success! File created.")

    except Exception as e:
        print(f"CRASHED: {e}")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_full_flow_none_tenant()
