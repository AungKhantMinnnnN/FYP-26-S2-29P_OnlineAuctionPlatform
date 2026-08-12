import datetime
import math
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.auction import (
    User, Bid, BidStatus, Listing, ListingStatus, ListingImages, AuctionResult,
    Watchlist, WalletTransaction, TransactionType, SubscriptionTier,
    SubscriptionTierConfig, UserProfiles, UserInterest, Categories,
    UserInteraction, InteractionAction,
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
        # Per-listing dedupe: get each listing the user has bid on, with their max bid + placement time.
        # Only accepted bids -- a cancelled/rejected bid holds no funds and shouldn't be able
        # to surface as the user's "highest bid" or mark them as currently leading.
        sub_stmt = (
            select(
                Bid.listing_id.label("listing_id"),
                func.max(Bid.amount).label("my_highest_bid"),
                func.max(Bid.placed_at).label("last_placed_at"),
            )
            .where(Bid.bidder_id == user.id, Bid.status == BidStatus.accepted)
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
        listing_check = await db.execute(select(Listing.id).where(Listing.id == listing_id))
        if not listing_check.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

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

        # Summed over every transaction the user has, not just the current page -- these
        # feed summary stat cards that must reflect the whole account, not whichever page
        # happens to be loaded.
        totals_stmt = select(
            func.coalesce(
                func.sum(WalletTransaction.amount).filter(WalletTransaction.type == TransactionType.topup), 0.0
            ),
            func.coalesce(
                func.sum(WalletTransaction.amount).filter(WalletTransaction.type == TransactionType.bid_hold), 0.0
            ),
        ).where(WalletTransaction.user_id == user.id)
        total_top_ups, pending_holds = (await db.execute(totals_stmt)).one()

        return {
            "balance": user.balance,
            "total_top_ups": total_top_ups,
            "pending_holds": pending_holds,
            "transactions": {
                "items": items,
                "total": total,
                "page": page,
                "size": size,
                "pages": pages,
            },
        }

    @staticmethod
    async def topup_wallet(db: AsyncSession, user: User, amount: float) -> dict:
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive.")
        user.balance = round(user.balance + amount, 2)
        tx = WalletTransaction(
            id=uuid.uuid4(),
            user_id=user.id,
            amount=amount,
            type=TransactionType.topup,
            reference="Manual top-up",
        )
        db.add(tx)
        await db.commit()
        await db.refresh(user)
        return {
            "balance": user.balance,
            "transaction": {
                "id": tx.id,
                "amount": tx.amount,
                "type": tx.type.value,
                "reference": tx.reference,
                "created_at": tx.created_at,
            },
        }
    # endregion

    # region Profile
    @staticmethod
    async def update_profile(db: AsyncSession, user: User, data: dict) -> dict:
        profile = user.profile
        if not profile:
            profile = UserProfiles(user_id=user.id)
            db.add(profile)

        for field in (
            "full_name", "phone", "address", "city", "country", "bio",
            "email_alerts_enabled", "marketing_emails_enabled",
        ):
            if data.get(field) is not None:
                setattr(profile, field, data[field])

        if data.get("dob") is not None:
            try:
                profile.dob = datetime.date.fromisoformat(data["dob"])
            except ValueError:
                raise HTTPException(status_code=400, detail="dob must be ISO format YYYY-MM-DD")

        profile.updated_at = datetime.datetime.now(datetime.timezone.utc)
        await db.commit()
        await db.refresh(profile)

        return {
            "full_name": profile.full_name,
            "phone": profile.phone,
            "address": profile.address,
            "city": profile.city,
            "country": profile.country,
            "dob": profile.dob.isoformat() if profile.dob else None,
            "bio": profile.bio,
            "email_alerts_enabled": profile.email_alerts_enabled,
            "marketing_emails_enabled": profile.marketing_emails_enabled,
        }
    # endregion

    # region Interests
    @staticmethod
    async def get_interests(db: AsyncSession, user_id: uuid.UUID) -> list:
        stmt = (
            select(Categories)
            .join(UserInterest, UserInterest.category_id == Categories.id)
            .where(UserInterest.user_id == user_id)
            .order_by(Categories.name)
        )
        categories = (await db.execute(stmt)).scalars().all()
        return [{"id": c.id, "name": c.name, "slug": c.slug} for c in categories]

    @staticmethod
    async def update_interests(db: AsyncSession, user_id: uuid.UUID, category_ids: list) -> list:
        if not category_ids:
            raise HTTPException(status_code=400, detail="At least one category is required")

        valid = (await db.execute(
            select(Categories.id).where(Categories.id.in_(category_ids))
        )).scalars().all()
        invalid = set(str(c) for c in category_ids) - set(str(c) for c in valid)
        if invalid:
            raise HTTPException(status_code=404, detail=f"Unknown category IDs: {', '.join(invalid)}")

        await db.execute(delete(UserInterest).where(UserInterest.user_id == user_id))
        for category_id in category_ids:
            db.add(UserInterest(user_id=user_id, category_id=category_id))
        await db.commit()

        return await UserService.get_interests(db=db, user_id=user_id)
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

    # region Stats
    @staticmethod
    async def get_seller_stats(db: AsyncSession, user_id: uuid.UUID) -> dict:
        seller_listing_ids_q = select(Listing.id).where(Listing.seller_id == user_id)

        total_views = await db.scalar(
            select(func.count(UserInteraction.id))
            .where(UserInteraction.listing_id.in_(seller_listing_ids_q))
            .where(UserInteraction.action == InteractionAction.view)
        ) or 0

        total_watchlists = await db.scalar(
            select(func.count(Watchlist.id))
            .where(Watchlist.listing_id.in_(seller_listing_ids_q))
        ) or 0

        sales_result = await db.execute(
            select(func.count(AuctionResult.id), func.coalesce(func.sum(AuctionResult.final_price), 0.0))
            .join(Listing, Listing.id == AuctionResult.listing_id)
            .where(Listing.seller_id == user_id)
            .where(AuctionResult.winner_id.isnot(None))
        )
        total_sales, total_revenue = sales_result.one()

        return {
            "total_views": total_views,
            "total_watchlists": total_watchlists,
            "total_sales": total_sales,
            "total_revenue": float(total_revenue),
        }
    # endregion
