import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.logger import get_logger
from app.models.auction import Notification, User
from app.services.email_service import EmailService

logger = get_logger("notification_service")


def _listing_url(listing_id: str) -> str:
    return f"{settings.FRONTEND_URL}/auction/{listing_id}"


async def _get_user(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    return result.scalar_one_or_none()


async def _push(db: AsyncSession, user_id: str, title: str, message: str) -> None:
    db.add(Notification(user_id=uuid.UUID(user_id), title=title, message=message))


async def notify_outbid(
    db: AsyncSession,
    outbid_user_id: str,
    listing_id: str,
    listing_title: str,
    new_amount: float,
) -> None:
    user = await _get_user(db, outbid_user_id)
    if user is None:
        logger.warning(f"notify_outbid: user {outbid_user_id} not found")
        return

    full_name = user.profile.full_name if user.profile else None
    await _push(db, outbid_user_id, "You've been outbid", f"New highest bid on {listing_title}: ${new_amount:.2f}")
    await EmailService.send_outbid(user.email, full_name, listing_title, new_amount, _listing_url(listing_id))


async def notify_auction_ended(
    db: AsyncSession,
    listing_id: str,
    listing_title: str,
    seller_id: str,
    winner_id: str | None,
    final_price: float,
    outcome: str,  # "sold" | "reserve_not_met" | "no_bids"
) -> None:
    url = _listing_url(listing_id)

    seller = await _get_user(db, seller_id)
    seller_name = seller.profile.full_name if seller and seller.profile else None

    if outcome == "sold" and winner_id:
        winner = await _get_user(db, winner_id)
        winner_name = winner.profile.full_name if winner and winner.profile else None

        await _push(db, winner_id, "You won the auction!", f"You won {listing_title} for ${final_price:.2f}")
        await _push(db, seller_id, "Your auction sold", f"{listing_title} sold for ${final_price:.2f}")

        if winner:
            await EmailService.send_auction_won(winner.email, winner_name, listing_title, final_price, url)
        if seller:
            await EmailService.send_auction_sold_seller(seller.email, seller_name, listing_title, final_price, url)

    elif outcome == "reserve_not_met" and winner_id:
        winner = await _get_user(db, winner_id)
        winner_name = winner.profile.full_name if winner and winner.profile else None

        await _push(db, winner_id, "Auction ended — reserve not met", f"Your bid on {listing_title} was refunded")
        await _push(db, seller_id, "Your auction ended", f"{listing_title} — reserve not met")

        if winner:
            await EmailService.send_auction_reserve_not_met_bidder(winner.email, winner_name, listing_title, final_price, url)
        if seller:
            await EmailService.send_auction_ended_seller(seller.email, seller_name, listing_title, "reserve_not_met", final_price, url)

    else:  # no_bids
        await _push(db, seller_id, "Your auction ended", f"{listing_title} ended with no bids")
        if seller:
            await EmailService.send_auction_ended_seller(seller.email, seller_name, listing_title, "no_bids", 0.0, url)
