from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class UserBase(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True

class RegisterRequest(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    role: Optional[str] = "user"

class UserProfileResponse(BaseModel):
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    email_alerts_enabled: bool = True
    marketing_emails_enabled: bool = False

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    role: str
    balance: float
    email_verified: bool
    subscription_tier: str
    subscription_expires_at: Optional[datetime] = None
    profile: Optional[UserProfileResponse] = None

    class Config:
        from_attributes = True


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class EmailVerificationConfirm(BaseModel):
    token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class GenericMessageResponse(BaseModel):
    message: str

