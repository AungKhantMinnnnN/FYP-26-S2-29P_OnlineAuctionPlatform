import logging
from uuid import UUID

from app.db.session import AsyncSessionLocal
from app.models.auction import UserInteraction, InteractionAction

logger = logging.getLogger(__name__)


async def log_interaction(user_id: UUID, listing_id: UUID, action: InteractionAction) -> None:
    """Write one interaction row. Opens its own session — safe to call as a BackgroundTask."""
    try:
        async with AsyncSessionLocal() as db:
            db.add(UserInteraction(user_id=user_id, listing_id=listing_id, action=action))
            await db.commit()
    except Exception as exc:
        logger.warning("Interaction log failed action=%s user=%s listing=%s: %s", action, user_id, listing_id, exc)


async def log_search_interactions(user_id: UUID, listing_ids: list[UUID]) -> None:
    """Bulk-insert one search interaction row per result listing in a single transaction."""
    if not listing_ids:
        return
    try:
        async with AsyncSessionLocal() as db:
            for lid in listing_ids:
                db.add(UserInteraction(user_id=user_id, listing_id=lid, action=InteractionAction.search))
            await db.commit()
    except Exception as exc:
        logger.warning("Search interaction log failed user=%s listings=%d: %s", user_id, len(listing_ids), exc)
