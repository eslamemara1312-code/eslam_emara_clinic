import requests
import sqlite3
import os
import shutil
from datetime import datetime
from backend import database, models, auth, backup_service

BASE_URL = "http://localhost:8001"
DB_PATH = "./clinic_NEW.db"


def color_print(msg, color="white"):
    colors = {
        "green": "\033[92m",
        "red": "\033[91m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "white": "\033[0m",
    }
    print(f"{colors.get(color, '')}{msg}{colors['white']}")


def check_db_schema():
    color_print("\n[1] Checking Database Schema...", "blue")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Check Tenants Table
    cursor.execute("PRAGMA table_info(tenants)")
    columns = [row[1] for row in cursor.fetchall()]
    required = ["backup_frequency", "google_refresh_token", "last_backup_at"]

    missing = [col for col in required if col not in columns]
    if missing:
        color_print(f"FAILED: Missing columns in 'tenants': {missing}", "red")
    else:
        color_print("SUCCESS: 'tenants' table has all backup columns.", "green")

    conn.close()


def test_login(username, password, role_name):
    color_print(f"\n[2] Testing Login for {role_name} ({username})...", "blue")
    url = f"{BASE_URL}/token"
    payload = {"username": username, "password": password, "grant_type": "password"}

    try:
        res = requests.post(url, data=payload, timeout=5)
        if res.status_code == 200:
            color_print(f"SUCCESS: {role_name} Logged In.", "green")
            return res.json()["access_token"]
        else:
            color_print(
                f"FAILED: {role_name} Login. Status: {res.status_code}, Response: {res.text}",
                "red",
            )
            return None
    except Exception as e:
        color_print(f"FAILED: Connection error: {e}", "red")
        return None


def test_backup_generation(token=None):
    color_print("\n[3] Testing Internal Backup Generation logic...", "blue")
    db = database.SessionLocal()
    try:
        # Simulate logic for tenant_id=1
        dump = backup_service.create_json_dump(db, tenant_id=1)
        if dump and "users" in dump:
            color_print(
                f"SUCCESS: Backup generated. Found {len(dump)} tables.", "green"
            )
        else:
            color_print("FAILED: Backup returned empty or invalid data.", "red")
    except Exception as e:
        color_print(f"FAILED: Backup generation crashed: {e}", "red")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


def run_suite():
    print("========================================")
    print("   SMART CLINIC HEALTH CHECK SUITE")
    print("========================================")

    # 1. DB
    check_db_schema()

    # 2. Login
    doctor_token = test_login("eslam", "1111", "Doctor Admin")
    super_token = test_login(
        "eslamemara1312@gmail.com", "ESLAMomara11##", "Super Admin"
    )

    # 3. Backup
    test_backup_generation()

    print("\n========================================")
    print("   TESTING COMPLETE")
    print("========================================")


if __name__ == "__main__":
    run_suite()
