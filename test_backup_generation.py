from backend import database, backup_service, models
from sqlalchemy.orm import Session


def test_backup():
    db = database.SessionLocal()
    tenant_id = 1
    print(f"Testing backup for Tenant {tenant_id}...")

    try:
        dump = backup_service.create_json_dump(db, tenant_id=tenant_id)
        print("Success! Backup keys:", dump.keys())
        for k, v in dump.items():
            print(f"Table {k}: {len(v)} records")
    except Exception as e:
        print(f"CRASHED: {e}")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_backup()
