import datetime
import secrets

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.auction import User, PasswordResetToken
from app.services.email_service import EmailService


class PasswordResetService:

    @staticmethod
    async def request_reset(db: AsyncSession, email: str) -> None:
        """Generate a token + email a reset link. Never reveals whether email exists."""
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalars().first()

        # Silently no-op if user not found — don't leak account existence
        if not user:
            return

        now = datetime.datetime.now(datetime.timezone.utc)
        token = secrets.token_urlsafe(32)
        expires_at = now + datetime.timedelta(hours=settings.PASSWORD_RESET_TOKEN_TTL_HOURS)

        reset_row = PasswordResetToken(
            token=token,
            user_id=user.id,
            expires_at=expires_at,
            created_at=now,
        )
        db.add(reset_row)
        await db.commit()

        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        full_name = user.profile.full_name if user.profile else None
        await EmailService.send_password_reset(
            recipient=user.email,
            reset_url=reset_url,
            full_name=full_name,
        )

    @staticmethod
    async def confirm_reset(db: AsyncSession, token: str, new_password: str) -> None:
        now = datetime.datetime.now(datetime.timezone.utc)

        stmt = select(PasswordResetToken).where(PasswordResetToken.token == token)
        result = await db.execute(stmt)
        reset_row = result.scalars().first()

        if not reset_row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token.",
            )

        if reset_row.used_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This reset link has already been used.",
            )

        if reset_row.expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This reset link has expired. Please request a new one.",
            )

        user_stmt = select(User).where(User.id == reset_row.user_id)
        user = (await db.execute(user_stmt)).scalars().first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account no longer exists.",
            )

        user.password_hash = get_password_hash(new_password)
        user.updated_at = now
        reset_row.used_at = now

        await db.commit()
