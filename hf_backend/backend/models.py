from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    Float,
    Text,
    Date,
    Boolean,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    logo = Column(String, nullable=True)  # URL or path to logo
    subscription_status = Column(String, default="active")
    subscription_end_date = Column(DateTime, nullable=True)
    plan = Column(String, default="trial")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="tenant")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(Integer)
    phone = Column(String)
    address = Column(String, nullable=True)
    medical_history = Column(Text)  # Comma separated or JSON string
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(
        Integer, ForeignKey("tenants.id"), nullable=True
    )  # Nullable for migration, should be non-null eventually

    appointments = relationship(
        "Appointment", back_populates="patient", cascade="all, delete-orphan"
    )
    treatments = relationship(
        "Treatment", back_populates="patient", cascade="all, delete-orphan"
    )
    tooth_statuses = relationship(
        "ToothStatus", back_populates="patient", cascade="all, delete-orphan"
    )
    payments = relationship(
        "Payment", back_populates="patient", cascade="all, delete-orphan"
    )
    attachments = relationship(
        "Attachment", back_populates="patient", cascade="all, delete-orphan"
    )
    prescriptions = relationship(
        "Prescription", back_populates="patient", cascade="all, delete-orphan"
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="doctor")  # doctor, assistant
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)

    tenant = relationship("Tenant", back_populates="users")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    date_time = Column(DateTime)
    status = Column(String, default="Scheduled")  # Scheduled, Completed, Cancelled
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="appointments")


class ToothStatus(Base):
    __tablename__ = "tooth_status"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    tooth_number = Column(Integer)  # 1-32 or 1-85 (FDI)
    condition = Column(String)  # Healthy, Decayed, Missing, Filled, Crown, RootCanal
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="tooth_statuses")


class Treatment(Base):
    __tablename__ = "treatments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    tooth_number = Column(Integer, nullable=True)  # Optional, might be general cleaning
    diagnosis = Column(String)
    procedure = Column(String)
    cost = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    date = Column(DateTime, default=datetime.utcnow)
    canal_count = Column(Integer, nullable=True)
    canal_lengths = Column(String, nullable=True)  # e.g. "21, 22, 21"
    sessions = Column(Text, nullable=True)  # Dates or notes about sessions
    complications = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="treatments")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    amount = Column(Float)
    date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="payments")


class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    price = Column(Float)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    file_path = Column(String)
    filename = Column(String)
    file_type = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="attachments")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String)
    cost = Column(Float)
    category = Column(String)
    date = Column(Date)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    notes = Column(String, nullable=True)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    medications = Column(Text)  # JSON string of medications list
    notes = Column(Text, nullable=True)
    date = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="prescriptions")
