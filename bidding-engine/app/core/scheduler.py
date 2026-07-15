"""
scheduler.py — APScheduler setup for the bidding engine.

Runs one job every 60 seconds to settle ended auctions. The interval is intentionally
short so winners and sellers know the result quickly after an auction closes.

AsyncIOScheduler is used (not BackgroundScheduler) because the settlement service
uses async DB sessions — mixing sync scheduler threads with async sessions causes
greenlet/event-loop conflicts.
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.session import AsyncSessionLocal
from app.services.settlement_service import settle_ended_auctions

logger = logging.getLogger("BiddingEngine")

scheduler = AsyncIOScheduler()


async def _run_settlement() -> None:
    """Wrapper that opens a fresh DB session for each scheduler tick."""
    logger.info("scheduler: running auction settlement job")
    async with AsyncSessionLocal() as db:
        try:
            await settle_ended_auctions(db)
        except Exception as exc:
            logger.error("scheduler: settlement job failed: %s", exc, exc_info=True)


def start_scheduler() -> None:
    """Register the settlement job and start the scheduler. Called at app startup."""
    scheduler.add_job(
        _run_settlement,
        trigger="interval",
        seconds=60,
        id="settle_ended_auctions",
        replace_existing=True,
        max_instances=1,  # prevent overlap if a tick takes longer than 60s
    )
    scheduler.start()
    logger.info("scheduler: started — settlement job runs every 60s")


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler. Called at app shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("scheduler: stopped")
