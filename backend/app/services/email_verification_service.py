import datetime
import secrets

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.auction import User, EmailVerificationToken
from app.services.email_service import EmailService


class EmailVerificationService:

    @staticmethod
    async def send_verification(db: AsyncSession, user: User) -> None:
        """Generate a verification token and email a verify link to the user's email.

        Called from registration and from re-send endpoint. No-ops cleanly if user is
        already verified.
        """
        if user.email_verified:
            return

        now = datetime.datetime.now(datetime.timezone.utc)
        token = secrets.token_urlsafe(32)
        expires_at = now + datetime.timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_TTL_HOURS)

        verify_row = EmailVerificationToken(
            token=token,
            user_id=user.id,
            expires_at=expires_at,
            created_at=now,
        )
        db.add(verify_row)
        await db.commit()

        verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
        full_name = user.profile.full_name if user.profile else None
        await EmailService.send_email_verification(
            recipient=user.email,
            verify_url=verify_url,
            full_name=full_name,
        )

    @staticmethod
    async def confirm_verification(db: AsyncSession, token: str) -> None:
        now = datetime.datetime.now(datetime.timezone.utc)

        stmt = select(EmailVerificationToken).where(EmailVerificationToken.token == token)
        result = await db.execute(stmt)
        verify_row = result.scalars().first()

        if not verify_row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token.",
            )

        if verify_row.verified_at is not None:
            # Already used — treat as success but no-op (idempotent)
            return

        if verify_row.expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification link has expired. Please request a new one.",
            )

        user_stmt = select(User).where(User.id == verify_row.user_id)
        user = (await db.execute(user_stmt)).scalars().first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account no longer exists.",
            )

        user.email_verified = True
        user.updated_at = now
        verify_row.verified_at = now

        await db.commit()
