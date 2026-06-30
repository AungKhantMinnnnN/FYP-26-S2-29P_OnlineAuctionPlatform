from typing import Optional
from pydantic import BaseModel, EmailStr
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
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    role: Optional[str] = "user"

class UserProfileResponse(BaseModel):
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    role: str
    balance: float
    profile: Optional[UserProfileResponse] = None

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str