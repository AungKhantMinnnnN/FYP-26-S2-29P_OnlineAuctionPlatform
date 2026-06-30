from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.auction import User
from app.schemas.auth import LoginRequest, RegisterRequest, Token, UserResponse
from app.api.deps import get_current_user
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    return await AuthService.register_user(db=db, request=request)

@router.post("/login", response_model=Token)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    return await AuthService.authenticate_user(db=db, request=request)

@router.get("/get_current_user", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user

@router.post("/forgot_password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    return await AuthService.forgot_password(db, request)

@router.post("/verify_otp")
async def verify_otp(
    request: VerifyOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    return await AuthService.verify_otp(db, request)

@router.post("/reset_password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    return await AuthService.reset_password(db, request)