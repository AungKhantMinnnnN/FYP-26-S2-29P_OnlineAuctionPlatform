from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import setup_logging
from app.db.session import get_db
from app.models.auction import User
from app.schemas.auth import (
    LoginRequest, RegisterRequest, Token, UserResponse,
    PasswordResetRequest, PasswordResetConfirm,
    EmailVerificationConfirm, GenericMessageResponse,
)
from app.api.deps import get_current_user
from app.services.auth_service import AuthService
from app.services.password_reset_service import PasswordResetService
from app.services.email_verification_service import EmailVerificationService

logger = setup_logging("AuthController")

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    new_user = await AuthService.register_user(db=db, request=request)
    # Auto-send verification email. Any failure (missing table, SMTP down, etc.) is
    # logged but never blocks registration — the user can request a resend later.
    try:
        await EmailVerificationService.send_verification(db=db, user=new_user)
    except Exception as e:
        logger.warning(f"Verification email skipped for {new_user.email}: {e}")
    return new_user

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


@router.post("/password-reset/request", response_model=GenericMessageResponse)
async def password_reset_request(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset link. Always returns success to prevent account enumeration."""
    await PasswordResetService.request_reset(db=db, email=request.email)
    return GenericMessageResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )


@router.post("/password-reset/confirm", response_model=GenericMessageResponse)
async def password_reset_confirm(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    await PasswordResetService.confirm_reset(db=db, token=request.token, new_password=request.new_password)
    return GenericMessageResponse(message="Password reset successful. You can now log in with your new password.")


@router.post("/email-verification/send", response_model=GenericMessageResponse)
async def email_verification_send(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-send the verification email for the currently logged-in user."""
    if current_user.email_verified:
        return GenericMessageResponse(message="Your email is already verified.")
    await EmailVerificationService.send_verification(db=db, user=current_user)
    return GenericMessageResponse(message="Verification email sent. Please check your inbox.")


@router.post("/email-verification/confirm", response_model=GenericMessageResponse)
async def email_verification_confirm(
    request: EmailVerificationConfirm,
    db: AsyncSession = Depends(get_db),
):
    await EmailVerificationService.confirm_verification(db=db, token=request.token)
    return GenericMessageResponse(message="Email verified successfully.")
