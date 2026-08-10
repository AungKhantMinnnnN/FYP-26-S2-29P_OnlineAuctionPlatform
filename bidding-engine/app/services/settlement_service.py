"""
Auction settlement logic. Called by the APScheduler job every 60 seconds to find
active listings whose end_time has passed and settle each one atomically.

Invariant: only one bid hold is active per listing at a time — each new bid
immediately releases the previous highest bidder's hold (see bidding_service.py),
so at auction end there is at most one outstanding hold to resolve.

Three outcomes: no bids (no winner), reserve not met (hold refunded, no winner),
or reserve met (winner pays seller via settlement transaction).

Re-uses the lock:bid:{listing_id} Redis lock to prevent a race between a
last-second bid and the settlement job running simultaneously.
"""

import logging
import json
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.auction import (
    Listing, ListingStatus, Bid, BidStatus, User,
    AuctionResult, WalletTransaction, TransactionType,
)
from app.core.redis import redis_client
from app.core.connection_manager import manager
from app.services import notification_client

logger = logging.getLogger("BiddingEngine")


async def settle_ended_auctions(db: AsyncSession) -> None:
    """Find all active listings whose end_time has passed and settle them.

    Idempotent: `_settle_listing` skips any listing that already has an
    AuctionResult row (guarded by the unique constraint on auction_results.listing_id).
    """
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Listing)
        .where(Listing.status == ListingStatus.active)
        .where(Listing.end_time <= now)
    )
    ended_listings = result.scalars().all()

    if not ended_listings:
        logger.debug("settlement: no auctions to settle")
        return

    logger.info("settlement: found %d auction(s) to settle", len(ended_listings))
    for listing in ended_listings:
        await _settle_listing(db, listing)


async def _settle_listing(db: AsyncSession, listing: Listing) -> None:
    """Settle a single ended auction under the same lock:bid:{listing_id} key used by
    the bidding pipeline, so settlement and last-second bids can't run concurrently.
    Blocking timeout is short (2s) — if the lock is busy, the scheduler retries on
    the next tick.
    """
    listing_id_str = str(listing.id)
    lock_key = f"lock:bid:{listing_id_str}"

    try:
        async with redis_client.lock(lock_key, timeout=10.0, blocking_timeout=2.0):
            await _execute_settlement(db, listing)
    except Exception as exc:
        # `db` is reused across every listing in this batch, so roll back on failure --
        # otherwise dirty state from this listing could get flushed with the next one.
        await db.rollback()
        logger.warning("settlement: could not settle listing %s: %s", listing_id_str, exc)


async def _execute_settlement(db: AsyncSession, listing: Listing) -> None:
    """Core settlement logic for a single listing. Runs inside the Redis lock."""
    now = datetime.now(timezone.utc)
    listing_id_str = str(listing.id)

    # Skip if already settled
    existing = await db.scalar(
        select(AuctionResult).where(AuctionResult.listing_id == listing.id)
    )
    if existing:
        logger.info("settlement: listing %s already settled — skipping", listing_id_str)
        return

    # Re-read status under the lock — a concurrent bid may have just extended end_time
    await db.refresh(listing)
    end_time_aware = listing.end_time if listing.end_time.tzinfo else listing.end_time.replace(tzinfo=timezone.utc)
    if listing.status != ListingStatus.active or end_time_aware > now:
        logger.info("settlement: listing %s no longer eligible (status=%s, end_time=%s)",
                    listing_id_str, listing.status, listing.end_time)
        return

    bid_result = await db.execute(
        select(Bid)
        .where(Bid.listing_id == listing.id, Bid.status == BidStatus.accepted)
        .order_by(Bid.amount.desc())
        .limit(1)
    )
    winning_bid = bid_result.scalars().first()

    if winning_bid is None:
        logger.info("settlement: listing %s — no bids, ending with no winner", listing_id_str)
        auction_result = AuctionResult(
            listing_id=listing.id,
            winner_id=None,
            winning_bid_id=None,
            final_price=listing.starting_price,
            ended_at=now,
        )
        db.add(auction_result)
        broadcast_payload = _build_broadcast(listing, winner_id=None, final_price=listing.starting_price, outcome="no_bids")

    else:
        winner_result = await db.execute(select(User).where(User.id == winning_bid.bidder_id))
        winner = winner_result.scalars().first()

        seller_result = await db.execute(select(User).where(User.id == listing.seller_id))
        seller = seller_result.scalars().first()

        # No reserve price set (NULL) means "no reserve" — any bid meets it.
        reserve_met = listing.reserve_price is None or winning_bid.amount >= listing.reserve_price

        if not reserve_met:
            logger.info(
                "settlement: listing %s — reserve not met (bid=%.2f, reserve=%.2f), refunding winner hold",
                listing_id_str, winning_bid.amount, listing.reserve_price,
            )
            if winner:
                winner.balance += winning_bid.amount
                db.add(WalletTransaction(
                    user_id=winner.id,
                    amount=winning_bid.amount,
                    type=TransactionType.bid_release,
                    reference=f"Reserve not met: {listing.title}",
                ))

            auction_result = AuctionResult(
                listing_id=listing.id,
                winner_id=None,
                winning_bid_id=winning_bid.id,
                final_price=winning_bid.amount,
                ended_at=now,
            )
            db.add(auction_result)
            broadcast_payload = _build_broadcast(listing, winner_id=None, final_price=winning_bid.amount, outcome="reserve_not_met")

        else:
            # Winner's funds are already held (balance reduced at bid time); credit the
            # seller and record a settlement transaction for audit.
            logger.info(
                "settlement: listing %s — winner=%s, final_price=%.2f, paying seller=%s",
                listing_id_str, winning_bid.bidder_id, winning_bid.amount, listing.seller_id,
            )
            if seller:
                seller.balance += winning_bid.amount
                db.add(WalletTransaction(
                    user_id=seller.id,
                    amount=winning_bid.amount,
                    type=TransactionType.settlement,
                    reference=f"Sold: {listing.title}",
                ))

            auction_result = AuctionResult(
                listing_id=listing.id,
                winner_id=winning_bid.bidder_id,
                winning_bid_id=winning_bid.id,
                final_price=winning_bid.amount,
                ended_at=now,
            )
            db.add(auction_result)
            broadcast_payload = _build_broadcast(
                listing,
                winner_id=str(winning_bid.bidder_id),
                final_price=winning_bid.amount,
                outcome="sold",
            )

    listing.status = ListingStatus.ended
    listing.updated_at = now

    await db.commit()
    logger.info("settlement: listing %s committed — status=ended", listing_id_str)

    # Broadcast after commit so clients never see a stale state.
    await manager.broadcast(json.dumps(broadcast_payload), listing_id_str)
    logger.info("settlement: listing %s broadcast sent to %d subscriber(s)",
                listing_id_str, len(manager.active_connections.get(listing_id_str, [])))

    # Fire-and-forget: runs after commit/broadcast so a notification failure can't roll back settlement.
    await notification_client.notify_auction_ended(
        listing_id=listing_id_str,
        listing_title=listing.title,
        seller_id=str(listing.seller_id),
        winner_id=str(winning_bid.bidder_id) if winning_bid else None,
        final_price=broadcast_payload["final_price"],
        outcome=broadcast_payload["outcome"],
    )


def _build_broadcast(listing: Listing, winner_id, final_price: float, outcome: str) -> dict:
    return {
        "type": "auction_ended",
        "listing_id": str(listing.id),
        "outcome": outcome,       # "sold" | "reserve_not_met" | "no_bids"
        "winner_id": winner_id,   # str UUID or None
        "final_price": final_price,
        "ended_at": datetime.now(timezone.utc).isoformat(),
    }
