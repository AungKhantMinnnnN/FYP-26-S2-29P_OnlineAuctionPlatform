import httpx

from app.core.config import settings
from app.core.logger import setup_logging

logger = setup_logging("NotificationClient")

_BASE = f"{settings.BACKEND_URL}/v1.0.0/internal/notifications"


async def notify_outbid(outbid_user_id: str, listing_id: str, listing_title: str, new_amount: float) -> None:
    await _post(f"{_BASE}/outbid", {
        "outbid_user_id": outbid_user_id,
        "listing_id": listing_id,
        "listing_title": listing_title,
        "new_amount": new_amount,
    })


async def notify_auction_ended(
    listing_id: str,
    listing_title: str,
    seller_id: str,
    winner_id: str | None,
    final_price: float,
    outcome: str,
) -> None:
    await _post(f"{_BASE}/auction-ended", {
        "listing_id": listing_id,
        "listing_title": listing_title,
        "seller_id": seller_id,
        "winner_id": winner_id,
        "final_price": final_price,
        "outcome": outcome,
    })


async def _post(url: str, payload: dict) -> None:
    headers = {"X-Internal-Api-Key": settings.INTERNAL_API_KEY} if settings.INTERNAL_API_KEY else {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
    except Exception as e:
        # Fire-and-forget: log but never let notification failure crash the caller
        logger.error(f"Notification POST to {url} failed: {e}")
