import json
import logging
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import WebSocket

from app.models.auction import Listing, User, Bid, WalletTransaction, ListingStatus, BidStatus, TransactionType
from app.core.redis import redis_client

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
        async with redis_client.lock(lock_key, timeout=5.0, blocking_timeout=3.0):
            return await BiddingService._execute_bid(db, listing_id, user_id, amount)

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

        # 2. Check if amount is high enough
        min_required = listing.current_price + listing.min_increment if listing.current_price > 0 else listing.starting_price
        if amount < min_required:
            logger.error(f"Listing ID: [{listing_id}] Bid amount must be at least {min_required:.2f}")
            return {"success": False, "error": f"Bid amount must be at least {min_required:.2f}"}

        # 3. Fetch current user (bidder)
        result = await db.execute(select(User).where(User.id == user_uuid))
        current_user = result.scalars().first()
        if not current_user:
            logger.error("User not found")
            return {"success": False, "error": "User not found"}
            
        if current_user.balance < amount:
            logger.error("Insufficient wallet balance")
            return {"success": False, "error": "Insufficient wallet balance"}

        # 4. Find the previous highest bid (to release their held funds)
        result = await db.execute(
            select(Bid).where(Bid.listing_id == listing_uuid, Bid.status == BidStatus.accepted)
            .order_by(Bid.amount.desc()).limit(1)
        )
        previous_highest_bid = result.scalars().first()

        logger.info(f"Previous highest bid: {previous_highest_bid}")

        if previous_highest_bid:
            # release the old bid hold.
            prev_user_id = previous_highest_bid.bidder_id
            
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
        listing.current_price = amount
        listing.updated_at = datetime.now(timezone.utc)
        
        # 9. Commit all changes
        await db.commit()

        # Build success broadcast payload
        broadcast_data = {
            "type": "new_bid",
            "listing_id": str(listing.id),
            "current_price": listing.current_price,
            "bidder_id": str(current_user.id),
            "amount": amount,
            "timestamp": new_bid.placed_at.isoformat()
        }

        return {"success": True, "data": broadcast_data}
