from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt

import os

# Secret key for JWT (Change this in production)
SECRET_KEY = os.getenv("SECRET_KEY", "eslam_emara_clinic_secret_key_change_me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 60 days


def verify_password(plain_password, hashed_password):
    # bcrypt.checkpw requires bytes
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def get_password_hash(password):
    # bcrypt.hashpw requires bytes and returns bytes. We need to decode to store as string
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
