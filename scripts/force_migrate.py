from backend import database
from sqlalchemy import text


def force_migrate():
    print("Starting Force Migration...")

    commands = [
        # Treatments
        "ALTER TABLE treatments ADD COLUMN canal_count INTEGER",
        "ALTER TABLE treatments ADD COLUMN canal_lengths VARCHAR",
        "ALTER TABLE treatments ADD COLUMN sessions TEXT",
        "ALTER TABLE treatments ADD COLUMN complications TEXT",
        # Attachments
        "ALTER TABLE attachments ADD COLUMN filename VARCHAR",
        "ALTER TABLE attachments ADD COLUMN file_type VARCHAR",
        # Multi-tenancy
        "ALTER TABLE patients ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)",
        "ALTER TABLE appointments ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)",
        "ALTER TABLE users ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)",
        "ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'doctor'",
        "ALTER TABLE tenants ADD COLUMN logo VARCHAR",
        "ALTER TABLE tenants ADD COLUMN subscription_end_date DATETIME",
        "ALTER TABLE tenants ADD COLUMN plan VARCHAR DEFAULT 'trial'",
        "ALTER TABLE tenants ADD COLUMN is_active BOOLEAN DEFAULT 1",
        "ALTER TABLE tenants ADD COLUMN backup_frequency VARCHAR DEFAULT 'off'",
        "ALTER TABLE tenants ADD COLUMN google_refresh_token VARCHAR",
        "ALTER TABLE tenants ADD COLUMN last_backup_at DATETIME",
    ]

    with database.engine.connect() as conn:
        for cmd in commands:
            try:
                conn.execute(text(cmd))
                print(f"Executed: {cmd}")
            except Exception as e:
                # print(f"Skipped (probably exists): {cmd} | Error: {e}")
                pass
        conn.commit()
    print("Migration finished.")


if __name__ == "__main__":
    force_migrate()
