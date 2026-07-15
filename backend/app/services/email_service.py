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

    @classmethod
    async def send_account_suspended(cls, recipient: str, reason: str, full_name: str | None = None) -> bool:
        client = cls._get_client()
        if client is None:
            logger.warning(f"Skipping account-suspended email to {recipient} — mail not configured.")
            return False

        message = MessageSchema(
            subject="Your AuctionHub account has been suspended",
            recipients=[recipient],
            template_body={
                "full_name": full_name or "there",
                "reason": reason,
            },
            subtype=MessageType.html,
        )
        try:
            await client.send_message(message, template_name="account_suspended.html")
            logger.info(f"Account-suspended email sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send account-suspended email to {recipient}: {e}")
            return False

    @classmethod
    async def send_outbid(cls, recipient: str, full_name: str | None, listing_title: str, new_amount: float, listing_url: str) -> bool:
        client = cls._get_client()
        if client is None:
            logger.warning(f"Skipping outbid email to {recipient} — mail not configured.")
            return False
        message = MessageSchema(
            subject=f"You've been outbid on {listing_title}",
            recipients=[recipient],
            template_body={"full_name": full_name or "there", "listing_title": listing_title, "new_amount": new_amount, "listing_url": listing_url},
            subtype=MessageType.html,
        )
        try:
            await client.send_message(message, template_name="outbid.html")
            logger.info(f"Outbid email sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send outbid email to {recipient}: {e}")
            return False

    @classmethod
    async def send_auction_won(cls, recipient: str, full_name: str | None, listing_title: str, final_price: float, listing_url: str) -> bool:
        client = cls._get_client()
        if client is None:
            logger.warning(f"Skipping auction-won email to {recipient} — mail not configured.")
            return False
        message = MessageSchema(
            subject=f"You won the auction for {listing_title}!",
            recipients=[recipient],
            template_body={"full_name": full_name or "there", "listing_title": listing_title, "final_price": final_price, "listing_url": listing_url},
            subtype=MessageType.html,
        )
        try:
            await client.send_message(message, template_name="auction_won.html")
            logger.info(f"Auction-won email sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send auction-won email to {recipient}: {e}")
            return False

    @classmethod
    async def send_auction_sold_seller(cls, recipient: str, full_name: str | None, listing_title: str, final_price: float, listing_url: str) -> bool:
        client = cls._get_client()
        if client is None:
            logger.warning(f"Skipping auction-sold-seller email to {recipient} — mail not configured.")
            return False
        message = MessageSchema(
            subject=f"Your auction for {listing_title} has sold!",
            recipients=[recipient],
            template_body={"full_name": full_name or "there", "listing_title": listing_title, "final_price": final_price, "listing_url": listing_url},
            subtype=MessageType.html,
        )
        try:
            await client.send_message(message, template_name="auction_sold_seller.html")
            logger.info(f"Auction-sold-seller email sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send auction-sold-seller email to {recipient}: {e}")
            return False

    @classmethod
    async def send_auction_reserve_not_met_bidder(cls, recipient: str, full_name: str | None, listing_title: str, bid_amount: float, listing_url: str) -> bool:
        client = cls._get_client()
        if client is None:
            logger.warning(f"Skipping reserve-not-met-bidder email to {recipient} — mail not configured.")
            return False
        message = MessageSchema(
            subject=f"Your bid on {listing_title} has been refunded",
            recipients=[recipient],
            template_body={"full_name": full_name or "there", "listing_title": listing_title, "bid_amount": bid_amount, "listing_url": listing_url},
            subtype=MessageType.html,
        )
        try:
            await client.send_message(message, template_name="auction_reserve_not_met_bidder.html")
            logger.info(f"Reserve-not-met-bidder email sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send reserve-not-met-bidder email to {recipient}: {e}")
            return False

    @classmethod
    async def send_auction_ended_seller(cls, recipient: str, full_name: str | None, listing_title: str, outcome: str, final_price: float, listing_url: str) -> bool:
        client = cls._get_client()
        if client is None:
            logger.warning(f"Skipping auction-ended-seller email to {recipient} — mail not configured.")
            return False
        message = MessageSchema(
            subject=f"Your auction for {listing_title} has ended",
            recipients=[recipient],
            template_body={"full_name": full_name or "there", "listing_title": listing_title, "outcome": outcome, "final_price": final_price, "listing_url": listing_url},
            subtype=MessageType.html,
        )
        try:
            await client.send_message(message, template_name="auction_ended_seller.html")
            logger.info(f"Auction-ended-seller email sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send auction-ended-seller email to {recipient}: {e}")
            return False

    @classmethod
    async def send_account_deleted(cls, recipient: str, full_name: str | None = None) -> bool:
        client = cls._get_client()
        if client is None:
            logger.warning(f"Skipping account-deleted email to {recipient} — mail not configured.")
            return False

        message = MessageSchema(
            subject="Your AuctionHub account has been deleted",
            recipients=[recipient],
            template_body={
                "full_name": full_name or "there",
            },
            subtype=MessageType.html,
        )
        try:
            await client.send_message(message, template_name="account_deleted.html")
            logger.info(f"Account-deleted email sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send account-deleted email to {recipient}: {e}")
            return False
