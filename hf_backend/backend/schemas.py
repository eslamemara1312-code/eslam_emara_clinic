from pydantic import BaseModel
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime, date


# --- Patient Schemas ---
class PatientBase(BaseModel):
    name: str
    age: int
    phone: str
    address: Optional[str] = None
    medical_history: Optional[str] = None
    notes: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class Patient(PatientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Appointment Schemas ---
class AppointmentBase(BaseModel):
    patient_id: int
    date_time: datetime
    status: str = "Scheduled"
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class Appointment(AppointmentBase):
    id: int
    patient_name: Optional[str] = None  # For display convenience

    class Config:
        from_attributes = True


# --- Tooth Status Schemas ---
class ToothStatusBase(BaseModel):
    patient_id: int
    tooth_number: int
    condition: str
    notes: Optional[str] = None


class ToothStatusCreate(ToothStatusBase):
    pass


class ToothStatus(ToothStatusBase):
    id: int

    class Config:
        from_attributes = True


# --- Treatment Schemas ---
class TreatmentBase(BaseModel):
    patient_id: int
    tooth_number: Optional[int] = None
    diagnosis: str
    procedure: str
    cost: float
    discount: float = 0.0
    canal_count: Optional[int] = None
    canal_lengths: Optional[str] = None
    sessions: Optional[str] = None
    complications: Optional[str] = None
    notes: Optional[str] = None


class TreatmentCreate(TreatmentBase):
    pass


class Treatment(TreatmentBase):
    id: int
    date: datetime

    class Config:
        from_attributes = True


# --- Payment Schemas ---
class PaymentBase(BaseModel):
    patient_id: int
    amount: float
    date: Optional[datetime] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class Payment(PaymentBase):
    id: int
    date: datetime
    patient_name: Optional[str] = None

    class Config:
        orm_mode = True


# --- Financial Report Schema ---
class FinancialStats(BaseModel):
    total_revenue: float
    total_received: float
    outstanding: float
    monthly_revenue: float
    total_expenses: float = 0.0
    net_profit: float = 0.0
    today_revenue: float = 0.0
    today_received: float = 0.0
    today_outstanding: float = 0.0
    today_expenses: float = 0.0


# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    tenant_id: Optional[int] = None


class User(BaseModel):
    username: str
    role: Optional[str] = None
    tenant_id: Optional[int] = None
    tenant: Optional["Tenant"] = None


# --- Procedure Schemas ---
class ProcedureBase(BaseModel):
    name: str
    price: float


class ProcedureCreate(ProcedureBase):
    price: float


class Procedure(ProcedureBase):
    id: int

    class Config:
        from_attributes = True


# --- Attachment Schemas ---
class AttachmentBase(BaseModel):
    patient_id: int
    filename: str
    file_type: str


class AttachmentCreate(AttachmentBase):
    file_path: str


class Attachment(AttachmentBase):
    id: int
    created_at: datetime
    file_path: str

    class Config:
        from_attributes = True


# --- Expense Schemas ---
class ExpenseBase(BaseModel):
    item_name: str
    cost: float
    category: str
    date: date
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class Expense(ExpenseBase):
    id: int

    class Config:
        from_attributes = True


# --- Prescription Schemas ---
class PrescriptionBase(BaseModel):
    patient_id: int
    medications: str
    notes: Optional[str] = None
    date: Optional[datetime] = None


class PrescriptionCreate(PrescriptionBase):
    pass


class Prescription(PrescriptionBase):
    id: int
    date: datetime

    class Config:
        from_attributes = True


# --- Tenant Schemas ---
class TenantBase(BaseModel):
    name: str
    subscription_status: Optional[str] = "active"
    logo: Optional[str] = None
    plan: Optional[str] = "trial"
    is_active: Optional[bool] = True
    subscription_end_date: Optional[datetime] = None


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    plan: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_end_date: Optional[datetime] = None


class Tenant(TenantBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ClinicRegistration(BaseModel):
    clinic_name: str
    admin_username: str
    admin_password: str


# Rebuild models to resolve forward references
User.model_rebuild()
