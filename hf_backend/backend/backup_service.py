import sqlite3
import json
import os
import shutil
from sqlalchemy.orm import Session
from sqlalchemy import DateTime, Date
from datetime import datetime, date
from . import models

# Map table name to Model
TABLE_MODEL_MAP = {
    'users': models.User,
    'procedures': models.Procedure,
    'patients': models.Patient,
    'appointments': models.Appointment,
    'tooth_status': models.ToothStatus,
    'treatments': models.Treatment,
    'payments': models.Payment,
    'attachments': models.Attachment,
    'expenses': models.Expense,
    'prescriptions': models.Prescription
}

ORDERED_TABLES = [
    'users', 'procedures', 'patients', 'expenses',
    'appointments', 'tooth_status', 'treatments', 
    'payments', 'attachments', 'prescriptions'
]

def parse_value(model, key, value):
    if value is None:
        return None
    try:
        col = model.__table__.columns.get(key)
        if col is not None:
            # Handle empty strings which crash datetime parser
            if isinstance(value, str) and value.strip() == "":
                return None
                
            if isinstance(col.type, DateTime) and isinstance(value, str):
                return datetime.fromisoformat(value.replace(" ", "T"))
            elif isinstance(col.type, Date) and isinstance(value, str):
                 if "T" in value:
                     return datetime.fromisoformat(value).date()
                 return datetime.strptime(value, "%Y-%m-%d").date()
    except:
        # On valid parse failure, return None instead of crashing or originals
        # depending on strictness. Returning None is safer for restore than crashing.
        pass
    return value

def import_from_sqlite(db: Session, sqlite_path: str):
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = [r[0] for r in cursor.fetchall()]

    stats = {t: {"restored": 0, "errors": 0} for t in ORDERED_TABLES}

    for table_name in ORDERED_TABLES:
        if table_name not in existing_tables:
            continue
            
        model = TABLE_MODEL_MAP[table_name]
        try:
            rows = cursor.execute(f"SELECT * FROM {table_name}").fetchall()
            for row in rows:
                try:
                    data = dict(row)
                    valid_cols = [c.name for c in model.__table__.columns]
                    data = {k: v for k, v in data.items() if k in valid_cols}
                    
                    for k, v in data.items():
                        data[k] = parse_value(model, k, v)
                        
                    existing = db.query(model).filter(model.id == data['id']).first()
                    if existing:
                        for k, v in data.items():
                            setattr(existing, k, v)
                    else:
                        db.add(model(**data))
                    stats[table_name]["restored"] += 1
                except Exception as row_err:
                    print(f"Row error in {table_name}: {row_err}")
                    stats[table_name]["errors"] += 1
            
            db.flush()
        except Exception as e:
            print(f"Table error {table_name}: {e}")
            
    db.commit()
    conn.close()
    return stats

def import_from_json(db: Session, json_data: dict):
    stats = {t: {"restored": 0, "errors": 0} for t in ORDERED_TABLES}
    
    for table_name in ORDERED_TABLES:
        if table_name not in json_data:
            continue
        model = TABLE_MODEL_MAP[table_name]
        
        for data in json_data[table_name]:
            try:
                valid_cols = [c.name for c in model.__table__.columns]
                data = {k: v for k, v in data.items() if k in valid_cols}
                
                for k, v in data.items():
                    data[k] = parse_value(model, k, v)
                
                existing = db.query(model).filter(model.id == data['id']).first()
                if existing:
                    for k, v in data.items():
                        setattr(existing, k, v)
                else:
                    db.add(model(**data))
                stats[table_name]["restored"] += 1
            except Exception as e:
                print(f"Row error in {table_name}: {e}")
                stats[table_name]["errors"] += 1
        db.flush()
    db.commit()
    return stats

def create_json_dump(db: Session):
    dump_data = {}
    for table_name in ORDERED_TABLES:
        model = TABLE_MODEL_MAP[table_name]
        records = db.query(model).all()
        list_data = []
        for r in records:
            d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
            for k, v in d.items():
                if isinstance(v, (datetime, date)):
                    d[k] = v.isoformat()
            list_data.append(d)
        dump_data[table_name] = list_data
    return dump_data
