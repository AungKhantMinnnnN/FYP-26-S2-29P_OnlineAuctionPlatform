from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
import bcrypt

from passlib.context import CryptContext
from app.core.config import settings

import hashlib

if not hasattr(bcrypt, "__about__"):
    class About:
        __version__ = bcrypt.__version__
    bcrypt.__about__ = About()

# Monkeypatch bcrypt's hashpw and checkpw to truncate passwords > 72 bytes.
_original_hashpw = bcrypt.hashpw
def patched_hashpw(password, salt):
    if isinstance(password, (bytes, bytearray)) and len(password) > 72:
        password = password[:72]
    return _original_hashpw(password, salt)
bcrypt.hashpw = patched_hashpw

_original_checkpw = bcrypt.checkpw
def patched_checkpw(password, hashed_password):
    if isinstance(password, (bytes, bytearray)) and len(password) > 72:
        password = password[:72]
    return _original_checkpw(password, hashed_password)
bcrypt.checkpw = patched_checkpw

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if pwd_context.verify(plain_password, hashed_password):
            return True
    except ValueError:
        pass

    pre_hashed = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
    try:
        return pwd_context.verify(pre_hashed, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pre_hashed = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return pwd_context.hash(pre_hashed)
