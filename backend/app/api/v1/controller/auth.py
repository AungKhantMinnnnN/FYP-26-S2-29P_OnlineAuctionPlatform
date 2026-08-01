from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logger import setup_logging
from app.db.session import get_db
from app.models.auction import User
from app.schemas.auth import (
    LoginRequest, RegisterRequest, Token, UserResponse,
    PasswordResetRequest, PasswordResetConfirm,
    EmailVerificationConfirm, ChangePasswordRequest, GenericMessageResponse,
)
from app.api.deps import ACCESS_TOKEN_COOKIE_NAME, get_current_user
from app.core.rate_limit import rate_limiter
from app.services.auth_service import AuthService
from app.services.password_reset_service import PasswordResetService
from app.services.email_verification_service import EmailVerificationService

logger = setup_logging("AuthController")

router = APIRouter()

@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED,
    # Generous on purpose: this project's own QA suite registers a fresh ephemeral
    # account per test case, well over a hundred per run, from a single IP -- a limit
    # tight enough to matter against real credential stuffing (which fires far faster
    # than this) still needs to sit comfortably above that.
    dependencies=[Depends(rate_limiter("register", limit=300, window_seconds=60))],
)
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

@router.post(
    "/login", response_model=Token,
    # Same reasoning as /register's limit -- every ephemeral account the QA suite
    # creates immediately logs in with it too.
    dependencies=[Depends(rate_limiter("login", limit=300, window_seconds=60))],
)
async def login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    token = await AuthService.authenticate_user(db=db, request=request)
    # httpOnly cookie is what the browser frontend actually relies on now (unreadable by
    # JS, so an XSS can't exfiltrate it); the token is still returned in the body too for
    # non-browser API clients (this project's own QA suite included) that authenticate
    # via a plain Bearer header instead. secure=False because this app is also served
    # over plain HTTP on the LAN/Tailscale in several deployment modes -- a Secure cookie
    # would just silently stop being sent there. SameSite=Lax blocks the common
    # cross-site-form CSRF vector without needing a separate CSRF token for this scope.
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=token.access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return token

@router.post("/logout", response_model=GenericMessageResponse)
async def logout(response: Response):
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE_NAME, path="/")
    return GenericMessageResponse(message="Logged out.")

@router.get("/get_current_user", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user


@router.post(
    "/password-reset/request", response_model=GenericMessageResponse,
    dependencies=[Depends(rate_limiter("password-reset-request", limit=10, window_seconds=60))],
)
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


@router.post(
    "/email-verification/send", response_model=GenericMessageResponse,
    dependencies=[Depends(rate_limiter("email-verification-send", limit=10, window_seconds=60))],
)
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


@router.post("/change-password", response_model=GenericMessageResponse)
async def change_password(
    request: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change the current user's password. Requires the correct current password."""
    await AuthService.change_password(db=db, user=current_user, request=request)
    return GenericMessageResponse(message="Password updated successfully.")
