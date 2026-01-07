from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from . import models, schemas


# --- Tenant CRUD ---
def get_tenant_by_name(db: Session, name: str):
    return db.query(models.Tenant).filter(models.Tenant.name == name).first()


def create_tenant(db: Session, tenant: schemas.TenantCreate):
    db_tenant = models.Tenant(
        name=tenant.name,
        subscription_status=tenant.subscription_status,
        logo=tenant.logo,
    )
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant


# --- Patient CRUD ---
def get_patient(db: Session, patient_id: int, tenant_id: int):
    return (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id, models.Patient.tenant_id == tenant_id)
        .first()
    )


def get_patients(db: Session, tenant_id: int, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Patient)
        .filter(models.Patient.tenant_id == tenant_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def search_patients(db: Session, query: str, tenant_id: int):
    search = f"%{query}%"
    return (
        db.query(models.Patient)
        .filter(
            models.Patient.tenant_id == tenant_id,
            or_(
                models.Patient.name.ilike(search),
                models.Patient.phone.ilike(search),
                models.Patient.address.ilike(search),
            ),
        )
        .limit(5)
        .all()
    )


def create_patient(db: Session, patient: schemas.PatientCreate, tenant_id: int):
    db_patient = models.Patient(**patient.dict(), tenant_id=tenant_id)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


def update_patient(
    db: Session, patient_id: int, patient: schemas.PatientCreate, tenant_id: int
):
    db_patient = get_patient(db, patient_id, tenant_id)
    if db_patient:
        for key, value in patient.dict().items():
            setattr(db_patient, key, value)
        db.commit()
        db.refresh(db_patient)
    return db_patient


def delete_patient(db: Session, patient_id: int, tenant_id: int):
    db_patient = get_patient(db, patient_id, tenant_id)
    if db_patient:
        db.delete(db_patient)
        db.commit()
    return db_patient


# --- Appointment CRUD ---
def get_appointments(db: Session, tenant_id: int, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Appointment)
        .join(models.Patient)
        .filter(models.Patient.tenant_id == tenant_id)
        .order_by(models.Appointment.date_time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_appointment(db: Session, appointment: schemas.AppointmentCreate):
    db_appointment = models.Appointment(**appointment.dict())
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment


def update_appointment_status(
    db: Session, appointment_id: int, status: str, tenant_id: int
):
    db_appt = (
        db.query(models.Appointment)
        .join(models.Patient)
        .filter(
            models.Appointment.id == appointment_id,
            models.Patient.tenant_id == tenant_id,
        )
        .first()
    )
    if db_appt:
        db_appt.status = status
        db.commit()
        db.refresh(db_appt)
    return db_appt


# --- Tooth Status CRUD ---
def get_tooth_status(db: Session, patient_id: int, tenant_id: int):
    return (
        db.query(models.ToothStatus)
        .join(models.Patient)
        .filter(
            models.ToothStatus.patient_id == patient_id,
            models.Patient.tenant_id == tenant_id,
        )
        .all()
    )


def update_tooth_status(db: Session, status: schemas.ToothStatusCreate, tenant_id: int):
    # Check if exists and owned by tenant
    db_status = (
        db.query(models.ToothStatus)
        .join(models.Patient)
        .filter(
            models.ToothStatus.patient_id == status.patient_id,
            models.ToothStatus.tooth_number == status.tooth_number,
            models.Patient.tenant_id == tenant_id,
        )
        .first()
    )

    if db_status:
        db_status.condition = status.condition
        db_status.notes = status.notes
    else:
        db_status = models.ToothStatus(**status.dict())
        db.add(db_status)

    db.commit()
    db.refresh(db_status)
    return db_status


# --- Treatment CRUD ---
def create_treatment(db: Session, treatment: schemas.TreatmentCreate):
    db_treatment = models.Treatment(**treatment.dict())
    db.add(db_treatment)
    db.commit()
    db.refresh(db_treatment)
    return db_treatment


def get_treatments(db: Session, patient_id: int, tenant_id: int):
    return (
        db.query(models.Treatment)
        .join(models.Patient)
        .filter(
            models.Treatment.patient_id == patient_id,
            models.Patient.tenant_id == tenant_id,
        )
        .all()
    )


def delete_treatment(db: Session, treatment_id: int, tenant_id: int):
    db_obj = (
        db.query(models.Treatment)
        .join(models.Patient)
        .filter(
            models.Treatment.id == treatment_id, models.Patient.tenant_id == tenant_id
        )
        .first()
    )
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj


def update_treatment(
    db: Session, treatment_id: int, treatment: schemas.TreatmentCreate, tenant_id: int
):
    db_treatment = (
        db.query(models.Treatment)
        .join(models.Patient)
        .filter(
            models.Treatment.id == treatment_id, models.Patient.tenant_id == tenant_id
        )
        .first()
    )
    if db_treatment:
        for key, value in treatment.dict().items():
            setattr(db_treatment, key, value)
        db.commit()
        db.refresh(db_treatment)
    return db_treatment


# --- Payment CRUD ---
def create_payment(db: Session, payment: schemas.PaymentCreate, tenant_id: int):
    # Optional: Verify patient belongs to tenant before creating?
    # For now, let's assume main.py handles it or we rely on the fact that if they have the ID they might have access.
    # But for strictness:
    patient = get_patient(db, payment.patient_id, tenant_id)
    if not patient:
        return None  # Or raise error
    db_payment = models.Payment(**payment.dict())
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def get_payments(db: Session, patient_id: int, tenant_id: int):
    return (
        db.query(models.Payment)
        .join(models.Patient)
        .filter(
            models.Payment.patient_id == patient_id,
            models.Patient.tenant_id == tenant_id,
        )
        .all()
    )


def get_all_payments(db: Session, tenant_id: int, skip: int = 0, limit: int = 100):
    results = (
        db.query(models.Payment, models.Patient.name)
        .join(models.Patient, models.Payment.patient_id == models.Patient.id)
        .filter(models.Patient.tenant_id == tenant_id)
        .order_by(models.Payment.date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    payments = []
    for pay, name in results:
        # Attach name to the payment object for the schema
        pay.patient_name = name
        payments.append(pay)
    return payments


def delete_payment(db: Session, payment_id: int, tenant_id: int):
    db_obj = (
        db.query(models.Payment)
        .join(models.Patient)
        .filter(models.Payment.id == payment_id, models.Patient.tenant_id == tenant_id)
        .first()
    )
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj


def get_financial_stats(db: Session, tenant_id: int):
    # Filter payments by tenant via patient
    total_received = (
        db.query(func.sum(models.Payment.amount))
        .join(models.Patient)
        .filter(models.Patient.tenant_id == tenant_id)
        .scalar()
        or 0.0
    )

    # Calculate revenue (treatments cost - discounts) filtered by tenant via patient
    total_treatments = (
        db.query(func.sum(models.Treatment.cost))
        .join(models.Patient)
        .filter(models.Patient.tenant_id == tenant_id)
        .scalar()
        or 0.0
    )
    total_discounts = (
        db.query(func.sum(models.Treatment.discount))
        .join(models.Patient)
        .filter(models.Patient.tenant_id == tenant_id)
        .scalar()
        or 0.0
    )
    total_revenue = total_treatments - total_discounts

    outstanding = total_revenue - total_received

    # Expenses filtered by tenant
    total_expenses = (
        db.query(func.sum(models.Expense.cost))
        .filter(models.Expense.tenant_id == tenant_id)
        .scalar()
        or 0.0
    )
    net_profit = total_received - total_expenses

    # Daily Stats (Today)
    from datetime import datetime, date

    # Simple date filtering for daily stats
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    today_received = (
        db.query(func.sum(models.Payment.amount))
        .join(models.Patient)
        .filter(
            models.Patient.tenant_id == tenant_id, models.Payment.date >= today_start
        )
        .scalar()
        or 0.0
    )

    today_treat_total = (
        db.query(func.sum(models.Treatment.cost))
        .join(models.Patient)
        .filter(
            models.Patient.tenant_id == tenant_id, models.Treatment.date >= today_start
        )
        .scalar()
        or 0.0
    )
    today_disc_total = (
        db.query(func.sum(models.Treatment.discount))
        .join(models.Patient)
        .filter(
            models.Patient.tenant_id == tenant_id, models.Treatment.date >= today_start
        )
        .scalar()
        or 0.0
    )
    today_revenue = today_treat_total - today_disc_total

    today_outstanding = today_revenue - today_received
    if today_outstanding < 0:
        today_outstanding = 0

    today_expenses = (
        db.query(func.sum(models.Expense.cost))
        .filter(
            models.Expense.tenant_id == tenant_id, models.Expense.date == date.today()
        )
        .scalar()
        or 0.0
    )

    return {
        "total_revenue": total_revenue,
        "total_received": total_received,
        "outstanding": outstanding if outstanding > 0 else 0,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "monthly_revenue": 0.0,  # Placeholder
        "today_revenue": today_revenue,
        "today_received": today_received,
        "today_outstanding": today_outstanding,
        "today_expenses": today_expenses,
    }


# --- Auth CRUD ---
def get_user(db: Session, username: str):
    return (
        db.query(models.User)
        .filter(func.lower(models.User.username) == username.lower())
        .first()
    )


def create_user(db: Session, user: schemas.User, password_hash: str, tenant_id: int):
    db_user = models.User(
        username=user.username,
        hashed_password=password_hash,
        role=user.role,
        tenant_id=tenant_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_users(db: Session, tenant_id: int, skip: int = 0, limit: int = 100):
    return (
        db.query(models.User)
        .filter(models.User.tenant_id == tenant_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def delete_user(db: Session, user_id: int, tenant_id: int):
    user = (
        db.query(models.User)
        .filter(models.User.id == user_id, models.User.tenant_id == tenant_id)
        .first()
    )
    if user:
        db.delete(user)
        db.commit()
    return user


# --- Procedure CRUD ---
def get_procedures(db: Session, tenant_id: int, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Procedure)
        .filter(models.Procedure.tenant_id == tenant_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_procedure(db: Session, procedure: schemas.ProcedureCreate, tenant_id: int):
    db_procedure = models.Procedure(**procedure.dict(), tenant_id=tenant_id)
    db.add(db_procedure)
    db.commit()
    db.refresh(db_procedure)
    return db_procedure


def update_procedure(
    db: Session, procedure_id: int, procedure: schemas.ProcedureCreate, tenant_id: int
):
    db_procedure = (
        db.query(models.Procedure)
        .filter(
            models.Procedure.id == procedure_id, models.Procedure.tenant_id == tenant_id
        )
        .first()
    )
    if db_procedure:
        for key, value in procedure.dict().items():
            setattr(db_procedure, key, value)
        db.commit()
        db.refresh(db_procedure)
    return db_procedure


def delete_procedure(db: Session, procedure_id: int, tenant_id: int):
    db_procedure = (
        db.query(models.Procedure)
        .filter(
            models.Procedure.id == procedure_id, models.Procedure.tenant_id == tenant_id
        )
        .first()
    )
    if db_procedure:
        db.delete(db_procedure)
        db.commit()
    return db_procedure


def create_attachment(db: Session, attachment: schemas.AttachmentCreate):
    db_attachment = models.Attachment(**attachment.dict())
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment


def get_patient_attachments(db: Session, patient_id: int, tenant_id: int):
    return (
        db.query(models.Attachment)
        .join(models.Patient)
        .filter(
            models.Attachment.patient_id == patient_id,
            models.Patient.tenant_id == tenant_id,
        )
        .all()
    )


def delete_attachment(db: Session, attachment_id: int, tenant_id: int):
    attachment = (
        db.query(models.Attachment)
        .join(models.Patient)
        .filter(
            models.Attachment.id == attachment_id, models.Patient.tenant_id == tenant_id
        )
        .first()
    )
    if attachment:
        db.delete(attachment)
        db.commit()
    return attachment


def create_expense(db: Session, expense: schemas.ExpenseCreate, tenant_id: int):
    db_expense = models.Expense(**expense.dict(), tenant_id=tenant_id)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


def get_expenses(db: Session, tenant_id: int, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Expense)
        .filter(models.Expense.tenant_id == tenant_id)
        .order_by(models.Expense.date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def delete_expense(db: Session, expense_id: int, tenant_id: int):
    expense = (
        db.query(models.Expense)
        .filter(models.Expense.id == expense_id, models.Expense.tenant_id == tenant_id)
        .first()
    )
    if expense:
        db.delete(expense)
    db.commit()
    return expense


# --- Prescription CRUD ---
def create_prescription(db: Session, prescription: schemas.PrescriptionCreate):
    db_prescription = models.Prescription(**prescription.dict())
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)
    return db_prescription


def get_patient_prescriptions(db: Session, patient_id: int, tenant_id: int):
    return (
        db.query(models.Prescription)
        .join(models.Patient)
        .filter(
            models.Prescription.patient_id == patient_id,
            models.Patient.tenant_id == tenant_id,
        )
        .order_by(models.Prescription.date.desc())
        .all()
    )


def delete_prescription(db: Session, prescription_id: int, tenant_id: int):
    db_prescription = (
        db.query(models.Prescription)
        .join(models.Patient)
        .filter(
            models.Prescription.id == prescription_id,
            models.Patient.tenant_id == tenant_id,
        )
        .first()
    )
    if db_prescription:
        db.delete(db_prescription)
        db.commit()
    return db_prescription


# Removed duplicate get_financial_stats
