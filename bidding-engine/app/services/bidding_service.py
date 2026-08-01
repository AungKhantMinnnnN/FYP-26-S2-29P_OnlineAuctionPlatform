import json
import logging
from uuid import UUID
from datetime import datetime, timezone, timedelta
from redis.exceptions import LockError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.auction import Listing, User, Bid, WalletTransaction, UserInteraction, ListingStatus, BidStatus, TransactionType, BiddingType, SubscriptionTier, InteractionAction, UserStatus
from app.core.redis import redis_client
from app.services import notification_client

FREE_BID_HOURLY_LIMIT = 10

# Anti-sniping: if a bid lands within this many seconds of end_time, extend the auction.
# Extension is added to the CURRENT end_time (not to now), so a listing already 30s past
# the window doesn't get a free extra minute just because we're slow to process.
ANTI_SNIPE_WINDOW_SECONDS = 60
ANTI_SNIPE_EXTENSION_SECONDS = 60

logger = logging.getLogger("BiddingEngine")

class BiddingService:
    @staticmethod
    async def process_bid_message(db: AsyncSession, listing_id: str, user_id: str, data: str) -> dict:
        """
        Process an incoming bid message, handle locks, and update the DB securely.
        Returns a dict indicating success/error and the response data.
        """
        try:
            payload = json.loads(data)
            action_type = payload.get("type")
            if action_type != "place_bid":
                logger.error(f"ListingId: [{listing_id}] Invalid action type recieved")
                return {"success": False, "error": "Invalid action type"}
            
            amount = float(payload.get("amount", 0))
            if amount <= 0:
                logger.error(f"ListingId: [{listing_id}] Invalid bid amount")
                return {"success": False, "error": "Invalid bid amount"}
                
        except (json.JSONDecodeError, ValueError):
            logger.error(f"ListingId: [{listing_id}] Invalid message format")
            return {"success": False, "error": "Invalid message format"}

        # Use Redis lock to prevent race conditions on this specific listing
        lock_key = f"lock:bid:{listing_id}"
        # Lock for up to 5 seconds. If blocked, wait for it.
        logger.info(f"ListingId: [{listing_id}] Locking listing for 5 sec. Block will be finished after 3 sec.")
        try:
            async with redis_client.lock(lock_key, timeout=5.0, blocking_timeout=3.0):
                return await BiddingService._execute_bid(db, listing_id, user_id, amount)
        except LockError:
            # blocking_timeout elapsed without acquiring the lock (a hot listing).
            # A retryable error the client can act on, not a reason to drop the socket
            # (the bare except in the websocket loop would otherwise disconnect the user).
            logger.warning(f"ListingId: [{listing_id}] Could not acquire bid lock in time")
            return {"success": False, "error": "This listing is busy right now. Please try your bid again."}

    @staticmethod
    async def _execute_bid(db: AsyncSession, listing_id: str, user_id: str, amount: float) -> dict:
        try:
            listing_uuid = UUID(listing_id)
            user_uuid = UUID(user_id)
        except ValueError:
            logger.error("Invalid IDs")
            return {"success": False, "error": "Invalid IDs"}
        
        logger.info(f"Listing ID: [{listing_id}] User ID: [{user_id}]")

        # 1. Fetch the listing
        result = await db.execute(select(Listing).where(Listing.id == listing_uuid))
        listing = result.scalars().first()
        
        if not listing:
            logger.error("Listing not found")
            return {"success": False, "error": "Listing not found"}
        
        if listing.status != ListingStatus.active:
            logger.error("Listing not active")
            return {"success": False, "error": "Listing is not active"}
            
        if listing.end_time.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            logger.error("Auction has ended")
            return {"success": False, "error": "Auction has ended"}
            
        if listing.seller_id == user_uuid:
            logger.error("Seller cannot bid on their own listing")
            return {"success": False, "error": "Seller cannot bid on their own listing"}

        # 2. Fetch the previous highest bid (to check state and eventually release funds)
        result = await db.execute(
            select(Bid).where(Bid.listing_id == listing_uuid, Bid.status == BidStatus.accepted)
            .order_by(Bid.amount.desc()).limit(1)
        )
        previous_highest_bid = result.scalars().first()
        has_bids = previous_highest_bid is not None

        # 3. Check if amount is high enough
        if listing.bidding_type == BiddingType.public:
            min_required = listing.current_price + 1.0 # Implement $1 as minimum increment for public auctions
        elif listing.bidding_type == BiddingType.low_start and not has_bids:
            min_required = listing.starting_price # In low_start auction, any price can be the lowest price until someone else has already placed a bet
        else:
            min_required = listing.current_price + listing.min_increment if has_bids else listing.starting_price

        if amount < min_required:
            logger.error(f"Listing ID: [{listing_id}] Bid amount must be at least {min_required:.2f}")
            return {"success": False, "error": f"Bid amount must be at least {min_required:.2f}"}

        # 4. Fetch current user (bidder)
        result = await db.execute(select(User).where(User.id == user_uuid))
        current_user = result.scalars().first()
        if not current_user:
            logger.error("User not found")
            return {"success": False, "error": "User not found"}

        # Block suspended/deleted accounts from bidding (status may change mid-session,
        # so this is re-checked per bid rather than only at WS connect time).
        if current_user.status != UserStatus.active:
            logger.warning(f"User [{user_id}] with status [{current_user.status.value}] attempted to bid")
            return {"success": False, "error": "Your account is not active. Bidding is disabled."}

        if current_user.balance < amount:
            logger.error("Insufficient wallet balance")
            return {"success": False, "error": "Insufficient wallet balance"}

        # Free tier: max 10 bids per hour. Counted via an atomic Redis counter keyed by
        # user (not a DB count guarded by the per-listing lock above) -- that per-listing
        # lock doesn't stop the same user from racing this check across two DIFFERENT
        # listings at once, each under its own lock, and slipping past the cap.
        if current_user.subscription_tier == SubscriptionTier.free:
            bid_count_key = f"bidcount:free_tier:{user_id}"
            bid_count = await redis_client.incr(bid_count_key)
            if bid_count == 1:
                await redis_client.expire(bid_count_key, 3600)
            if bid_count > FREE_BID_HOURLY_LIMIT:
                await redis_client.decr(bid_count_key)  # this attempt didn't consume quota
                logger.warning(f"User [{user_id}] hit free tier bid limit")
                return {"success": False, "error": f"Free tier limit: you can place at most {FREE_BID_HOURLY_LIMIT} bids per hour. Upgrade to Premium for unlimited bidding."}

        logger.info(f"Previous highest bid: {previous_highest_bid}")

        outbid_user_id = None  # captured here so notify_outbid can fire after commit
        if previous_highest_bid:
            # release the old bid hold.
            prev_user_id = previous_highest_bid.bidder_id
            outbid_user_id = str(prev_user_id)
            
            # Fetch the previous user
            result = await db.execute(select(User).where(User.id == prev_user_id))
            prev_user = result.scalars().first()
            
            if prev_user:
                # Release funds
                prev_user.balance += previous_highest_bid.amount
                release_tx = WalletTransaction(
                    user_id=prev_user_id,
                    amount=previous_highest_bid.amount,
                    type=TransactionType.bid_release,
                    reference=str(previous_highest_bid.id)
                )
                db.add(release_tx)
                logger.info(f"Previous userId: [{prev_user_id}]'s bid amount [{previous_highest_bid.amount}] has been released.")

        # 5. Hold new bidder's funds
        current_user.balance -= amount
        
        # 6. Create the new bid
        new_bid = Bid(
            listing_id=listing_uuid,
            bidder_id=user_uuid,
            amount=amount,
            status=BidStatus.accepted
        )
        db.add(new_bid)
        await db.flush()  # To get new_bid.id
        
        # 7. Record the hold transaction
        hold_tx = WalletTransaction(
            user_id=user_uuid,
            amount=amount,
            type=TransactionType.bid_hold,
            reference=str(new_bid.id)
        )
        db.add(hold_tx)
        
        # 8. Update listing's current price
        now = datetime.now(timezone.utc)
        listing.current_price = amount
        listing.updated_at = now

        # 9. Anti-sniping: extend end_time if the bid lands in the final 60 seconds.
        # The check uses the end_time that was valid when this bid was accepted — we
        # make it timezone-aware here because the DB column may be stored as naive UTC.
        end_time_aware = listing.end_time if listing.end_time.tzinfo else listing.end_time.replace(tzinfo=timezone.utc)
        seconds_remaining = (end_time_aware - now).total_seconds()
        time_extended = False
        if seconds_remaining <= ANTI_SNIPE_WINDOW_SECONDS:
            listing.end_time = end_time_aware + timedelta(seconds=ANTI_SNIPE_EXTENSION_SECONDS)
            time_extended = True
            logger.info(
                f"ListingId: [{listing_id}] Anti-snipe triggered — {seconds_remaining:.1f}s remaining. "
                f"Extended end_time by {ANTI_SNIPE_EXTENSION_SECONDS}s to {listing.end_time.isoformat()}"
            )

        # 10. Log interaction and commit all changes atomically.
        # The extension is committed in the same transaction as the bid — no partial state.
        db.add(UserInteraction(user_id=user_uuid, listing_id=listing_uuid, action=InteractionAction.bid))
        await db.commit()

        # Fire-and-forget outbid notification — must be after commit so the DB write is durable first
        if outbid_user_id:
            await notification_client.notify_outbid(outbid_user_id, str(listing.id), listing.title, amount)

        # Build success broadcast payload — include extension info so the frontend
        # can update its countdown timer immediately without polling.
        broadcast_data = {
            "type": "new_bid",
            "listing_id": str(listing.id),
            "current_price": listing.current_price,
            "bidder_id": str(current_user.id),
            "bidder_username": current_user.username,
            "amount": amount,
            "timestamp": new_bid.placed_at.isoformat(),
            "end_time": listing.end_time.isoformat(),
            "time_extended": time_extended,
        }

        return {"success": True, "data": broadcast_data}
