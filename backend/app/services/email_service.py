from pathlib import Path
from typing import Optional

from fastapi_mail import FastMail, MessageSchema, MessageType, ConnectionConfig

from app.core.config import settings
from app.core.logger import setup_logging

logger = setup_logging("EmailService")

TEMPLATE_FOLDER = Path(__file__).resolve().parent.parent / "templates" / "email"


def _build_client() -> Optional[FastMail]:
    """Lazily build the FastMail client.

    Returns None if mail credentials aren't configured — the service then becomes a no-op
    instead of crashing on import / startup. Useful during local dev when SMTP isn't set up.
    """
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        return None

    mail_from = settings.MAIL_FROM or settings.MAIL_USERNAME
    if not mail_from:
        return None

    conn_config = ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=mail_from,
        MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_STARTTLS=settings.MAIL_STARTTLS,
        MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
        TEMPLATE_FOLDER=TEMPLATE_FOLDER,
    )
    return FastMail(conn_config)


class EmailService:
    """Thin wrapper around fastapi-mail for transactional emails.

    Errors during sending are logged but do not raise — the caller (e.g. registration)
    should not fail just because email is unavailable. The token is already persisted.
    """

    _client: Optional[FastMail] = None
    _client_built: bool = False

    @classmethod
    def _get_client(cls) -> Optional[FastMail]:
        if not cls._client_built:
            cls._client = _build_client()
            cls._client_built = True
            if cls._client is None:
                logger.warning("Mail credentials not set — emails will not be sent. Configure MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM.")
        return cls._client

    @classmethod
    async def send_password_reset(cls, recipient: str, reset_url: str, full_name: str | None = None) -> bool:
        client = cls._get_client()
        if client is None:
            logger.warning(f"Skipping password reset email to {recipient} — mail not configured.")
            return False

        message = MessageSchema(
            subject="Reset your AuctionHub password",
            recipients=[recipient],
            template_body={
                "full_name": full_name or "there",
                "reset_url": reset_url,
                "ttl_hours": settings.PASSWORD_RESET_TOKEN_TTL_HOURS,
            },
            subtype=MessageType.html,
        )
        try:
            await client.send_message(message, template_name="password_reset.html")
            logger.info(f"Password reset email sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send password reset email to {recipient}: {e}")
            return False

    @classmethod
    async def send_email_verification(cls, recipient: str, verify_url: str, full_name: str | None = None) -> bool:
        client = cls._get_client()
        if client is None:
            logger.warning(f"Skipping verification email to {recipient} — mail not configured.")
            return False

        message = MessageSchema(
            subject="Verify your AuctionHub email",
            recipients=[recipient],
            template_body={
                "full_name": full_name or "there",
                "verify_url": verify_url,
                "ttl_hours": settings.EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
            },
            subtype=MessageType.html,
        )
        try:
            await client.send_message(message, template_name="email_verification.html")
            logger.info(f"Verification email sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send verification email to {recipient}: {e}")
            return False
