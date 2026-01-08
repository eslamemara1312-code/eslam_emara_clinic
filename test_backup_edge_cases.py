import unittest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend import models, backup_service

# Setup in-memory DB
engine = create_engine("sqlite:///:memory:")
SessionLocal = sessionmaker(bind=engine)
models.Base.metadata.create_all(bind=engine)


class TestBackupEdgeCases(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        # Seed basic data
        self.user = models.User(
            id=1, username="test", hashed_password="pw", role="admin"
        )
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        # Re-create tables to clear data
        models.Base.metadata.drop_all(bind=engine)
        models.Base.metadata.create_all(bind=engine)

    def test_01_empty_json(self):
        """Test with completely empty input"""
        stats = backup_service.import_from_json(self.db, {})
        self.assertEqual(stats["users"]["restored"], 0)
        self.assertEqual(stats["users"]["errors"], 0)

    def test_02_missing_id_in_row(self):
        """Test row missing 'id' column - Impact Analysis"""
        # User table requires ID. If missing, it might crash or skip.
        data = {
            "users": [
                {"username": "no_id", "role": "admin"}  # Missing ID
            ]
        }
        try:
            stats = backup_service.import_from_json(self.db, data)
            # If we reach here, no crash. check results.
            # Likely flagged as error or inserted efficiently if DB autognerates ID?
            # backup_service logic 159 does rec['id'] access.
            print("Did not crash on missing ID")
        except KeyError:
            self.fail("Crashed on missing ID key access")

    def test_03_malformed_date(self):
        """Test date parsing resilience"""
        # Patient has created_at
        data = {
            "patients": [
                {"id": 999, "name": "Date Test", "age": 30, "created_at": "NOT-A-DATE"}
            ]
        }
        stats = backup_service.import_from_json(self.db, data)
        # Should succeed but setup created_at as None or current time?
        # parse_value returns None on error.
        p = self.db.query(models.Patient).filter_by(id=999).first()
        self.assertIsNotNone(p)
        p = self.db.query(models.Patient).filter_by(id=999).first()
        self.assertIsNotNone(p)
        # Passed test if patient exists regardless of created_at default value.
        pass

    def test_04_extra_columns(self):
        """Test input with columns that don't exist in model"""
        data = {
            "users": [
                {
                    "id": 2,
                    "username": "extra_col",
                    "role": "admin",
                    "fake_column_xyz": "hacking_attempt",
                }
            ]
        }
        stats = backup_service.import_from_json(self.db, data)
        self.assertEqual(stats["users"]["restored"], 1)
        u = self.db.query(models.User).filter_by(id=2).first()
        self.assertFalse(hasattr(u, "fake_column_xyz"))

    def test_05_extreme_numbers(self):
        """Test extremely large inputs"""
        data = {"expenses": []}
        for i in range(1001):  # Exceeds chunk size 900
            data["expenses"].append(
                {
                    "id": i + 100,
                    "item_name": f"Item {i}",
                    "cost": 100.50,
                    "category": "Test",
                    "date": "2023-01-01",
                }
            )

        stats = backup_service.import_from_json(self.db, data)
        self.assertEqual(stats["expenses"]["restored"], 1001)


if __name__ == "__main__":
    unittest.main()
