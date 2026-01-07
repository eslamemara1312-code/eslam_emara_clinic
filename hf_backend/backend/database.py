import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use DATABASE_URL from environment (PostgreSQL in cloud) or fallback to SQLite (local)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./clinic_NEW.db")

# Fix for Render/Heroku which often provides 'postgres://' instead of 'postgresql://'
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Sanitize URL: Remove potential trailing quotes or issues from copy-paste
SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.strip().strip("'").strip('"')

# Robustly handle sslmode
if "sslmode=require" in SQLALCHEMY_DATABASE_URL:
    # If the URL has sslmode=require, it might be causing issues with some drivers if channel_binding isn't supported
    # We can try to strip it and let the driver negotiate, OR trust it. 
    # The error "invalid channel_binding value: 'require''" suggests a typo in the ENV var (trailing quote).
    pass 


connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # For PostgreSQL (Neon), ensure SSL is typically required.
    # We will rely on the URL or driver defaults to avoid "invalid channel_binding" errors
    # which can occur if we force "sslmode" in connect_args with certain libpq versions.
    connect_args = {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args, pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
