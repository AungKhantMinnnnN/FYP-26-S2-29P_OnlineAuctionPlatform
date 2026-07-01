import datetime
import math
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.auction import (
    User, Bid, Listing, ListingStatus, ListingImages, AuctionResult,
    Watchlist, WalletTransaction, TransactionType, SubscriptionTier,
    SubscriptionTierConfig,
)


def _primary_image_url(listing: Listing) -> Optional[str]:
    if not listing.images:
        return None
    primary = next((img for img in listing.images if img.is_primary), None) or listing.images[0]
    return primary.image_url


class UserService:

    # region Bids
    @staticmethod
    async def get_my_bids(
        db: AsyncSession,
        user: User,
        page: int,
        size: int,
        result_filter: str,
    ) -> dict:
        # Per-listing dedupe: get each listing the user has bid on, with their max bid + placement time
        sub_stmt = (
            select(
                Bid.listing_id.label("listing_id"),
                func.max(Bid.amount).label("my_highest_bid"),
                func.max(Bid.placed_at).label("last_placed_at"),
            )
            .where(Bid.bidder_id == user.id)
            .group_by(Bid.listing_id)
            .subquery()
        )

        stmt = (
            select(Listing, sub_stmt.c.my_highest_bid, sub_stmt.c.last_placed_at)
            .join(sub_stmt, Listing.id == sub_stmt.c.listing_id)
            .options(selectinload(Listing.images))
            .order_by(desc(sub_stmt.c.last_placed_at))
        )

        result_rows = await db.execute(stmt)
        rows = result_rows.all()

        # Resolve "won" for ended listings by joining AuctionResult
        ended_listing_ids = [r[0].id for r in rows if r[0].status == ListingStatus.ended]
        winner_map = {}
        if ended_listing_ids:
            ar_stmt = select(AuctionResult).where(AuctionResult.listing_id.in_(ended_listing_ids))
            ar_result = await db.execute(ar_stmt)
            for ar in ar_result.scalars().all():
                winner_map[ar.listing_id] = ar.winner_id

        # Build items with result label
        items = []
        for listing, my_highest_bid, last_placed_at in rows:
            if listing.status == ListingStatus.ended:
                if winner_map.get(listing.id) == user.id:
                    bid_result = "won"
                else:
                    bid_result = "outbid"
            else:
                if my_highest_bid >= listing.current_price:
                    bid_result = "leading"
                else:
                    bid_result = "outbid"

            items.append({
                "listing_id": listing.id,
                "listing_title": listing.title,
                "listing_image_url": _primary_image_url(listing),
                "listing_status": listing.status.value,
                "listing_end_time": listing.end_time,
                "my_highest_bid": my_highest_bid,
                "current_price": listing.current_price,
                "result": bid_result,
                "placed_at": last_placed_at,
            })

        # Apply result filter post-aggregation
        if result_filter == "won":
            items = [i for i in items if i["result"] == "won"]
        elif result_filter == "outbid":
            items = [i for i in items if i["result"] == "outbid"]

        # Paginate the filtered list in-memory (volumes per-user are small)
        total = len(items)
        start = (page - 1) * size
        end = start + size
        paged = items[start:end]
        pages = max(1, math.ceil(total / size)) if total else 0

        return {
            "items": paged,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        }
    # endregion

    # region Purchases
    @staticmethod
    async def get_my_purchases(
        db: AsyncSession,
        user: User,
        page: int,
        size: int,
    ) -> dict:
        count_stmt = select(func.count()).select_from(AuctionResult).where(AuctionResult.winner_id == user.id)
        total = (await db.execute(count_stmt)).scalar_one()

        stmt = (
            select(AuctionResult, Listing)
            .join(Listing, Listing.id == AuctionResult.listing_id)
            .options(selectinload(Listing.images))
            .where(AuctionResult.winner_id == user.id)
            .order_by(desc(AuctionResult.ended_at))
            .offset((page - 1) * size)
            .limit(size)
        )
        rows = (await db.execute(stmt)).all()

        items = [{
            "auction_result_id": ar.id,
            "listing_id": listing.id,
            "listing_title": listing.title,
            "listing_image_url": _primary_image_url(listing),
            "final_price": ar.final_price,
            "ended_at": ar.ended_at,
        } for ar, listing in rows]

        pages = max(1, math.ceil(total / size)) if total else 0
        return {"items": items, "total": total, "page": page, "size": size, "pages": pages}
    # endregion

    # region Watchlist
    @staticmethod
    async def get_my_watchlist(db: AsyncSession, user: User) -> dict:
        stmt = (
            select(Watchlist, Listing)
            .join(Listing, Listing.id == Watchlist.listing_id)
            .options(selectinload(Listing.images))
            .where(Watchlist.user_id == user.id)
            .order_by(desc(Watchlist.added_at))
        )
        rows = (await db.execute(stmt)).all()

        items = []
        listing_ids = []
        for w, listing in rows:
            listing_ids.append(listing.id)
            items.append({
                "watchlist_id": w.id,
                "listing_id": listing.id,
                "added_at": w.added_at,
                "listing": {
                    "id": listing.id,
                    "title": listing.title,
                    "description": listing.description,
                    "condition": listing.condition.value,
                    "current_price": listing.current_price,
                    "starting_price": listing.starting_price,
                    "status": listing.status.value,
                    "start_time": listing.start_time,
                    "end_time": listing.end_time,
                    "image_url": _primary_image_url(listing),
                },
            })

        return {"items": items, "listing_ids": listing_ids}

    @staticmethod
    async def add_to_watchlist(db: AsyncSession, user: User, listing_id: uuid.UUID) -> Watchlist:
        # Confirm listing exists
        listing_check = await db.execute(select(Listing.id).where(Listing.id == listing_id))
        if not listing_check.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

        # Idempotent check
        existing_stmt = select(Watchlist).where(
            (Watchlist.user_id == user.id) & (Watchlist.listing_id == listing_id)
        )
        existing = (await db.execute(existing_stmt)).scalars().first()
        if existing:
            return existing

        new_item = Watchlist(
            id=uuid.uuid4(),
            user_id=user.id,
            listing_id=listing_id,
            added_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(new_item)
        await db.commit()
        await db.refresh(new_item)
        return new_item

    @staticmethod
    async def remove_from_watchlist(db: AsyncSession, user: User, listing_id: uuid.UUID) -> None:
        stmt = select(Watchlist).where(
            (Watchlist.user_id == user.id) & (Watchlist.listing_id == listing_id)
        )
        existing = (await db.execute(stmt)).scalars().first()
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not in watchlist")

        await db.delete(existing)
        await db.commit()
    # endregion

    # region Wallet
    @staticmethod
    async def get_my_wallet(db: AsyncSession, user: User, page: int, size: int) -> dict:
        count_stmt = select(func.count()).select_from(WalletTransaction).where(WalletTransaction.user_id == user.id)
        total = (await db.execute(count_stmt)).scalar_one()

        tx_stmt = (
            select(WalletTransaction)
            .where(WalletTransaction.user_id == user.id)
            .order_by(desc(WalletTransaction.created_at))
            .offset((page - 1) * size)
            .limit(size)
        )
        tx_rows = (await db.execute(tx_stmt)).scalars().all()

        items = [{
            "id": tx.id,
            "amount": tx.amount,
            "type": tx.type.value,
            "reference": tx.reference,
            "created_at": tx.created_at,
        } for tx in tx_rows]

        pages = max(1, math.ceil(total / size)) if total else 0

        return {
            "balance": user.balance,
            "transactions": {
                "items": items,
                "total": total,
                "page": page,
                "size": size,
                "pages": pages,
            },
        }
    # endregion

    # region Subscription
    @staticmethod
    async def manage_subscription(db: AsyncSession, user: User, action: str) -> dict:
        now = datetime.datetime.now(datetime.timezone.utc)

        if action == "cancel":
            user.subscription_tier = SubscriptionTier.free
            user.subscription_expires_at = None
            user.updated_at = now
            await db.commit()
            await db.refresh(user)
            return {
                "subscription_tier": user.subscription_tier.value,
                "subscription_expires_at": None,
                "balance": user.balance,
                "message": "Subscription cancelled. You are now on the Free tier.",
            }

        if action == "renew":
            tier_stmt = select(SubscriptionTierConfig).where(
                (SubscriptionTierConfig.tier == SubscriptionTier.premium)
                & (SubscriptionTierConfig.is_active == True)  # noqa: E712
            )
            tier_config = (await db.execute(tier_stmt)).scalars().first()
            if not tier_config:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Premium tier is not currently available.",
                )

            price = tier_config.price
            if user.balance < price:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient balance. Premium renewal costs ${price:.2f}.",
                )

            user.balance = user.balance - price
            user.subscription_tier = SubscriptionTier.premium
            user.subscription_expires_at = now + datetime.timedelta(days=tier_config.duration_days)
            user.updated_at = now

            tx = WalletTransaction(
                id=uuid.uuid4(),
                user_id=user.id,
                amount=-price,
                type=TransactionType.settlement,
                reference="Subscription renewal - Premium tier (1 year)",
                created_at=now,
            )
            db.add(tx)
            await db.commit()
            await db.refresh(user)

            expires_str = user.subscription_expires_at.strftime("%Y-%m-%d")
            return {
                "subscription_tier": user.subscription_tier.value,
                "subscription_expires_at": user.subscription_expires_at,
                "balance": user.balance,
                "message": f"Subscription renewed. Premium tier active until {expires_str}.",
            }

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'renew' or 'cancel'.",
        )
    # endregion
