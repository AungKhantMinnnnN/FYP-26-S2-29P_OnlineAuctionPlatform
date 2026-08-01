"""
settlement_service.py — Auction settlement logic.

Called by the APScheduler job every 60 seconds. Finds all active listings whose
end_time has passed and settles each one atomically.

Settlement invariant: at any point during bidding, only ONE bid hold is active
per listing. Each new bid immediately releases the previous highest bidder's hold
(see bidding_service.py). So at auction end there is at most one outstanding hold —
the current highest bidder's.

Three settlement outcomes:
  1. No bids placed        → listing ended, no winner, AuctionResult(winner=None)
  2. Reserve price not met → listing ended, no winner, highest bidder's hold refunded
  3. Reserve price met     → listing ended, winner pays seller via settlement transaction

The Redis lock (lock:bid:{listing_id}) is re-used during settlement to prevent a
race between a last-second bid and the settlement job running simultaneously.
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
    """
    Find all active listings whose end_time has passed and settle them.

    Idempotency: each listing is only settled once — `_settle_listing` skips any
    listing that already has an AuctionResult row (guarded by the unique constraint
    on auction_results.listing_id).
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
    """
    Settle a single ended auction under the Redis bid lock.

    Using the same lock:bid:{listing_id} key as the bidding pipeline ensures
    settlement and last-second bids can never run concurrently on the same listing.
    Blocking timeout is short (2s) — if the lock is held by an active bid, the
    scheduler will retry this listing on the next 60-second tick.
    """
    listing_id_str = str(listing.id)
    lock_key = f"lock:bid:{listing_id_str}"

    try:
        async with redis_client.lock(lock_key, timeout=10.0, blocking_timeout=2.0):
            await _execute_settlement(db, listing)
    except Exception as exc:
        # Lock not acquired or settlement failed — log and move on. The rollback matters
        # because `db` is reused across every listing in this batch (see
        # settle_ended_auctions): without it, pending/dirty state left over from this
        # failed settlement would carry into the next listing's session and could get
        # flushed/committed alongside it. The scheduler will retry this listing on the
        # next tick.
        await db.rollback()
        logger.warning("settlement: could not settle listing %s: %s", listing_id_str, exc)


async def _execute_settlement(db: AsyncSession, listing: Listing) -> None:
    """
    Core settlement logic for a single listing. Runs inside the Redis lock.

    Steps:
      1. Skip if already settled (idempotency guard).
      2. Re-fetch listing with a fresh DB read to get the latest state.
      3. Find the highest accepted bid.
      4. Determine outcome (no bids / reserve not met / winner).
      5. Write AuctionResult + wallet transactions atomically.
      6. Mark listing as ended.
      7. Broadcast auction_ended to all connected WS subscribers.
    """
    now = datetime.now(timezone.utc)
    listing_id_str = str(listing.id)

    # 1. Idempotency: skip if already settled
    existing = await db.scalar(
        select(AuctionResult).where(AuctionResult.listing_id == listing.id)
    )
    if existing:
        logger.info("settlement: listing %s already settled — skipping", listing_id_str)
        return

    # 2. Re-read listing status under the lock (a concurrent bid may have just extended end_time)
    await db.refresh(listing)
    end_time_aware = listing.end_time if listing.end_time.tzinfo else listing.end_time.replace(tzinfo=timezone.utc)
    if listing.status != ListingStatus.active or end_time_aware > now:
        logger.info("settlement: listing %s no longer eligible (status=%s, end_time=%s)",
                    listing_id_str, listing.status, listing.end_time)
        return

    # 3. Find the highest accepted bid
    bid_result = await db.execute(
        select(Bid)
        .where(Bid.listing_id == listing.id, Bid.status == BidStatus.accepted)
        .order_by(Bid.amount.desc())
        .limit(1)
    )
    winning_bid = bid_result.scalars().first()

    # 4. Determine outcome and build the AuctionResult
    if winning_bid is None:
        # No bids placed — end with no winner
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
            # Reserve price not met — refund the highest bidder's hold, end with no winner
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
                    reference=f"reserve_not_met:{listing_id_str}",
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
            # Reserve met — pay the seller, record the winner
            # The winner's funds are already held (balance was reduced at bid time).
            # We credit the seller and record a settlement transaction for audit.
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
                    reference=f"auction_won:{listing_id_str}",
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

    # 5. Mark listing as ended
    listing.status = ListingStatus.ended
    listing.updated_at = now

    # 6. Commit everything atomically
    await db.commit()
    logger.info("settlement: listing %s committed — status=ended", listing_id_str)

    # 7. Broadcast auction_ended to all connected WS subscribers.
    # Done after commit so clients never see a stale state.
    await manager.broadcast(json.dumps(broadcast_payload), listing_id_str)
    logger.info("settlement: listing %s broadcast sent to %d subscriber(s)",
                listing_id_str, len(manager.active_connections.get(listing_id_str, [])))

    # 8. Fire-and-forget email + in-app notifications via backend internal API.
    # Runs after commit and broadcast — a notification failure must not roll back a completed settlement.
    await notification_client.notify_auction_ended(
        listing_id=listing_id_str,
        listing_title=listing.title,
        seller_id=str(listing.seller_id),
        winner_id=str(winning_bid.bidder_id) if winning_bid else None,
        final_price=broadcast_payload["final_price"],
        outcome=broadcast_payload["outcome"],
    )


def _build_broadcast(listing: Listing, winner_id, final_price: float, outcome: str) -> dict:
    """Build the auction_ended broadcast payload sent to all WS subscribers."""
    return {
        "type": "auction_ended",
        "listing_id": str(listing.id),
        "outcome": outcome,       # "sold" | "reserve_not_met" | "no_bids"
        "winner_id": winner_id,   # str UUID or None
        "final_price": final_price,
        "ended_at": datetime.now(timezone.utc).isoformat(),
    }
