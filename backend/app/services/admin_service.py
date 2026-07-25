import re
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
from typing import Optional, List, Dict, Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.auction import (
    User, UserRole, UserStatus, UserProfiles, Listing, ListingStatus, Bid, BidStatus,
    AuctionResult, Categories, UserInterest, WalletTransaction, TransactionType,
    AdminLog, BoardItem, Notification, ProhibitedKeyword, FlaggedListingAttempt,
    AIModerationFlag, OptionSet, ItemConditions,
)
from app.schemas.admin import CategoryCreate, CategoryUpdate
from app.schemas.auction import AuctionListingResponse
from app.services.email_service import EmailService

# Matches the formatter in app.core.logger:
# "%(asctime)s | %(levelname)s | %(name)s | %(funcName)s | %(message)s"
_LOG_LINE_RE = re.compile(
    r'^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| '
    r'(?P<level>\w+) \| (?P<name>\S+) \| (?P<func>\S+) \| (?P<message>.*)$'
)

# General log file per microservice -> label shown in the admin UI. Each service's
# general file already contains every level (INFO/WARNING/ERROR) from its module loggers
# via propagation, so reading only these gives a complete, de-duplicated stream.
# The matching -error.log (and any rotated .YYYY-MM-DD files) are skipped as dupes.
_GENERAL_LOG_FILES = {
    "APIGateWay.log": "backend",
    "bidding-engine.log": "bidding-engine",
    "recommendation-engine.log": "recommendation-engine",
}


def _to_summary(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value,
        "status": user.status.value,
        "created_at": user.created_at,
    }


def _to_profile(user: User) -> Optional[dict]:
    if not user.profile:
        return None
    return {
        "full_name": user.profile.full_name,
        "phone": user.profile.phone,
        "address": user.profile.address,
        "dob": user.profile.dob.isoformat() if user.profile.dob else None,
        "bio": user.profile.bio,
    }


async def _to_details(db: AsyncSession, user: User) -> dict:
    suspension_log = None
    if user.status == UserStatus.suspended:
        suspension_log = await db.scalar(
            select(AdminLog)
            .where(AdminLog.target_id == user.id, AdminLog.action == "suspend_user")
            .order_by(AdminLog.created_at.desc())
            .limit(1)
        )
    return {
        **_to_summary(user),
        "subscription_tier": user.subscription_tier.value,
        "balance": user.balance,
        "email_verified": user.email_verified,
        "updated_at": user.updated_at,
        "suspended_at": suspension_log.created_at if suspension_log else None,
        "suspension_reason": suspension_log.details if suspension_log else None,
        "profile": _to_profile(user),
    }


class AdminService:

    # region Users
    @staticmethod
    async def get_users(
        db: AsyncSession,
        search: Optional[str],
        status_filter: Optional[UserStatus],
        role_filter: Optional[UserRole],
        page: int,
        size: int,
    ) -> Dict[str, Any]:
        query = select(User).outerjoin(UserProfiles, UserProfiles.user_id == User.id)
        if status_filter:
            query = query.where(User.status == status_filter)
        if role_filter:
            query = query.where(User.role == role_filter)
        if search:
            like = f"%{search}%"
            query = query.where(or_(
                User.username.ilike(like), User.email.ilike(like), UserProfiles.full_name.ilike(like),
            ))

        # user_profiles.user_id is unique, so this outer join can never duplicate a User row —
        # a plain row count is safe (matches the pattern used everywhere else in this file).
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query)

        query = query.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)
        result = await db.execute(query)
        users = result.scalars().all()

        # Always the true platform-wide count, ignoring search/status/role filters —
        # the "Administrators" stat card means "protected accounts total", not "on this page".
        admin_count = await db.scalar(
            select(func.count()).select_from(User).where(User.role == UserRole.admin)
        )

        pages = (total + size - 1) // size if total else 0
        return {
            "items": [_to_summary(u) for u in users],
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
            "admin_count": admin_count,
        }

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: UUID) -> dict:
        user = await db.scalar(
            select(User).options(selectinload(User.profile)).where(User.id == user_id)
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return await _to_details(db, user)

    @staticmethod
    async def suspend_user(db: AsyncSession, admin: User, user_id: UUID, reason: str) -> dict:
        user = await db.scalar(
            select(User).options(selectinload(User.profile)).where(User.id == user_id)
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.id == admin.id:
            raise HTTPException(status_code=400, detail="You cannot suspend your own account")
        if user.role == UserRole.admin:
            raise HTTPException(status_code=403, detail="Administrator accounts cannot be suspended")
        if user.status == UserStatus.deleted:
            raise HTTPException(status_code=400, detail="Cannot suspend a deleted account")
        if user.status == UserStatus.suspended:
            raise HTTPException(status_code=400, detail="User is already suspended")

        cleaned_reason = reason.strip()
        if not cleaned_reason:
            raise HTTPException(status_code=400, detail="Suspension reason is required")

        now = datetime.now(timezone.utc)
        user.status = UserStatus.suspended
        user.updated_at = now
        db.add(Notification(
            user_id=user.id, title="Account Suspended",
            message=f"Your account has been suspended by an administrator. Reason: {cleaned_reason}",
        ))
        db.add(AdminLog(
            admin_id=admin.id, action="suspend_user", target_id=user.id, details=cleaned_reason,
        ))
        await db.commit()
        await db.refresh(user)

        full_name = user.profile.full_name if user.profile else None
        await EmailService.send_account_suspended(
            recipient=user.email, reason=cleaned_reason, full_name=full_name,
        )

        return await _to_details(db, user)

    @staticmethod
    async def unsuspend_user(db: AsyncSession, admin: User, user_id: UUID) -> dict:
        user = await db.scalar(
            select(User).options(selectinload(User.profile)).where(User.id == user_id)
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.status != UserStatus.suspended:
            raise HTTPException(status_code=400, detail="User is not currently suspended")

        now = datetime.now(timezone.utc)
        user.status = UserStatus.active
        user.updated_at = now
        db.add(Notification(
            user_id=user.id, title="Account Reinstated",
            message="Your account has been reinstated by an administrator. You can now log in as normal.",
        ))
        db.add(AdminLog(
            admin_id=admin.id, action="unsuspend_user", target_id=user.id,
            details=f"Unsuspended user '{user.username}'",
        ))
        await db.commit()
        await db.refresh(user)
        return await _to_details(db, user)

    @staticmethod
    async def delete_user(db: AsyncSession, admin: User, user_id: UUID) -> None:
        user = await db.scalar(select(User).where(User.id == user_id))
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.id == admin.id:
            raise HTTPException(status_code=400, detail="You cannot delete your own account")
        if user.role == UserRole.admin:
            raise HTTPException(status_code=403, detail="Administrator accounts cannot be deleted")
        if user.status == UserStatus.deleted:
            raise HTTPException(status_code=400, detail="User is already deleted")

        now = datetime.now(timezone.utc)
        user.status = UserStatus.deleted
        user.updated_at = now
        db.add(Notification(
            user_id=user.id, title="Account Deleted",
            message="Your account has been deleted by an administrator. You will no longer be able to access the platform.",
        ))
        db.add(AdminLog(
            admin_id=admin.id, action="delete_user", target_id=user.id,
            details=f"Deleted (soft) user '{user.username}'",
        ))
        await db.commit()

        full_name = user.profile.full_name if user.profile else None
        await EmailService.send_account_deleted(recipient=user.email, full_name=full_name)
    # endregion

    # region Listings
    @staticmethod
    async def get_listings(
        db: AsyncSession,
        listing_status: Optional[ListingStatus],
        search: Optional[str],
        page: int,
        size: int,
        category_id: Optional[UUID] = None,
        condition: Optional[ItemConditions] = None,
    ) -> Dict[str, Any]:
        query = select(Listing).options(selectinload(Listing.images), selectinload(Listing.seller))
        if listing_status:
            query = query.where(Listing.status == listing_status)
        if search:
            query = query.where(Listing.title.ilike(f"%{search}%"))
        if category_id:
            query = query.where(Listing.category_id == category_id)
        if condition:
            query = query.where(Listing.condition == condition)

        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query)

        query = query.order_by(Listing.created_at.desc()).offset((page - 1) * size).limit(size)
        result = await db.execute(query)
        listings = result.scalars().all()

        pages = (total + size - 1) // size if total else 0

        # Sell-through = share of this page's ended listings that found a winner.
        # Scoped to the current page (not the whole filtered set) to match the
        # "on this page" semantics of the other admin listing stat cards.
        ended_ids = [item.id for item in listings if item.status == ListingStatus.ended]
        sell_through_pct = None
        if ended_ids:
            sold_count = await db.scalar(
                select(func.count()).select_from(AuctionResult).where(
                    AuctionResult.listing_id.in_(ended_ids),
                    AuctionResult.winner_id.isnot(None),
                )
            )
            sell_through_pct = round((sold_count / len(ended_ids)) * 100, 1)

        return {
            "items": listings, "total": total, "page": page, "size": size, "pages": pages,
            "sell_through_pct": sell_through_pct,
        }

    @staticmethod
    async def get_listing_detail(db: AsyncSession, listing_id: UUID) -> dict:
        listing = await db.scalar(
            select(Listing).options(selectinload(Listing.images), selectinload(Listing.seller))
            .where(Listing.id == listing_id)
        )
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")

        data = AuctionListingResponse.model_validate(listing, from_attributes=True).model_dump()
        data["winner_username"] = None
        data["winning_amount"] = None

        if listing.status == ListingStatus.ended:
            row = (await db.execute(
                select(AuctionResult, User.username)
                .outerjoin(User, User.id == AuctionResult.winner_id)
                .where(AuctionResult.listing_id == listing_id)
            )).first()
            if row:
                auction_result, winner_username = row
                data["winner_username"] = winner_username
                data["winning_amount"] = auction_result.final_price

        return data

    @staticmethod
    async def approve_listing(db: AsyncSession, admin: User, listing_id: UUID) -> Listing:
        listing = await db.scalar(
            select(Listing).options(selectinload(Listing.images), selectinload(Listing.seller))
            .where(Listing.id == listing_id)
        )
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.status not in (ListingStatus.draft, ListingStatus.pending_review):
            raise HTTPException(status_code=400, detail="Only draft or pending review listings can be approved")

        listing.status = ListingStatus.active
        listing.is_draft = False
        listing.updated_at = datetime.now(timezone.utc)
        db.add(AdminLog(
            admin_id=admin.id, action="approve_listing", target_id=listing.id,
            details=f"Approved listing '{listing.title}'",
        ))
        await db.commit()
        await db.refresh(listing)
        return listing

    @staticmethod
    async def remove_listing(db: AsyncSession, admin: User, listing_id: UUID) -> Listing:
        listing = await db.scalar(
            select(Listing).options(selectinload(Listing.images), selectinload(Listing.seller))
            .where(Listing.id == listing_id)
        )
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.status == ListingStatus.removed:
            raise HTTPException(status_code=400, detail="Listing is already removed")

        # Forcing a listing to `removed` while it still has a live bid would otherwise trap that
        # bidder's held funds with no automatic way back. Release the current highest bid's hold —
        # the only bid actually holding funds at any time (see cancel_bid) — same as an explicit
        # cancel, but skip this if the auction is already finalized (settlement already accounted
        # for that money via a different path).
        refunded_bid = False
        finalized = await db.scalar(select(AuctionResult.id).where(AuctionResult.listing_id == listing.id))
        if not finalized:
            current_highest_bid = await db.scalar(
                select(Bid).where(Bid.listing_id == listing.id, Bid.status == BidStatus.accepted)
                .order_by(Bid.amount.desc()).limit(1)
            )
            if current_highest_bid:
                bidder = await db.scalar(select(User).where(User.id == current_highest_bid.bidder_id))
                if bidder:
                    bidder.balance += current_highest_bid.amount
                    db.add(WalletTransaction(
                        user_id=bidder.id, amount=current_highest_bid.amount, type=TransactionType.bid_release,
                        reference=f"Admin override: listing {listing.id} removed",
                    ))
                    refunded_bid = True
                current_highest_bid.status = BidStatus.cancelled

        listing.status = ListingStatus.removed
        listing.updated_at = datetime.now(timezone.utc)
        db.add(AdminLog(
            admin_id=admin.id, action="remove_listing", target_id=listing.id,
            details=f"Removed listing '{listing.title}' (bid count and ownership bypassed); "
                    f"refunded_bid={refunded_bid}",
        ))
        await db.commit()
        await db.refresh(listing)
        return listing

    @staticmethod
    async def restart_auction(db: AsyncSession, admin: User, listing_id: UUID, new_end_time: datetime) -> Listing:
        listing = await db.scalar(
            select(Listing).options(selectinload(Listing.images), selectinload(Listing.seller))
            .where(Listing.id == listing_id)
        )
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.status != ListingStatus.ended:
            raise HTTPException(status_code=400, detail="Only ended auctions can be restarted")
        if new_end_time <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="end_time must be in the future")

        # Auction finalization (winner determination, settlement) isn't automated anywhere in this
        # codebase yet, so an AuctionResult only exists if one was seeded/written some other way.
        # Refunding is genuinely optional: only happens when there's something to reverse.
        refunded = False
        result = await db.scalar(select(AuctionResult).where(AuctionResult.listing_id == listing_id))
        if result:
            # board_items.auction_result_id is a NOT NULL FK with no cascade — deleting a result
            # still pinned to someone's collector board would violate it. Fail clearly instead of
            # crashing the transaction or silently deleting the user's saved board item.
            pinned_to_board = await db.scalar(
                select(BoardItem.id).where(BoardItem.auction_result_id == result.id)
            )
            if pinned_to_board:
                raise HTTPException(
                    status_code=409,
                    detail="Cannot restart: this auction's result has been saved to a user's "
                           "collector board. Remove it from the board first.",
                )
            if result.winner_id:
                winner = await db.scalar(select(User).where(User.id == result.winner_id))
                if winner:
                    winner.balance += result.final_price
                    db.add(WalletTransaction(
                        user_id=winner.id, amount=result.final_price, type=TransactionType.settlement,
                        reference=f"Refund: listing {listing_id} restarted by admin",
                    ))
                    refunded = True
            await db.delete(result)

        listing.status = ListingStatus.active
        listing.end_time = new_end_time
        listing.updated_at = datetime.now(timezone.utc)
        db.add(AdminLog(
            admin_id=admin.id, action="restart_auction", target_id=listing.id,
            details=f"Restarted auction; new end_time={new_end_time.isoformat()}; refunded_winner={refunded}",
        ))
        await db.commit()
        await db.refresh(listing)
        return listing
    # endregion

    # region Categories
    @staticmethod
    async def get_categories(db: AsyncSession) -> List[Categories]:
        result = await db.execute(select(Categories).order_by(Categories.name))
        return result.scalars().all()

    @staticmethod
    async def create_category(db: AsyncSession, data: CategoryCreate) -> Categories:
        existing = await db.scalar(select(Categories).where(Categories.slug == data.slug))
        if existing:
            raise HTTPException(status_code=409, detail="A category with this slug already exists")

        category = Categories(
            name=data.name, slug=data.slug, is_active=data.is_active,
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def update_category(db: AsyncSession, category_id: UUID, data: CategoryUpdate) -> Categories:
        category = await db.scalar(select(Categories).where(Categories.id == category_id))
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        if data.slug is not None and data.slug != category.slug:
            existing = await db.scalar(
                select(Categories).where(Categories.slug == data.slug, Categories.id != category_id)
            )
            if existing:
                raise HTTPException(status_code=409, detail="A category with this slug already exists")
            category.slug = data.slug

        if data.name is not None:
            category.name = data.name

        if data.is_active is not None:
            category.is_active = data.is_active

        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def delete_category(db: AsyncSession, admin: User, category_id: UUID) -> dict:
        category = await db.scalar(select(Categories).where(Categories.id == category_id))
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        category_name = category.name

        in_use = await db.scalar(
            select(func.count()).select_from(Listing).where(Listing.category_id == category_id)
        ) or 0
        has_interest_refs = await db.scalar(
            select(func.count()).select_from(UserInterest).where(UserInterest.category_id == category_id)
        ) or 0

        # Hard-delete only when nothing references this category; otherwise deactivate to avoid
        # breaking FK-referencing listings/interests.
        if in_use or has_interest_refs:
            category.is_active = False
            action_taken = "deactivated"
        else:
            await db.delete(category)
            action_taken = "deleted"

        db.add(AdminLog(
            admin_id=admin.id, action=f"{action_taken}_category", target_id=category_id,
            details=f"Category '{category_name}' {action_taken}",
        ))
        await db.commit()
        return {"id": category_id, "action": action_taken}
    # endregion

    # region Bids
    @staticmethod
    async def cancel_bid(db: AsyncSession, admin: User, bid_id: UUID) -> dict:
        bid = await db.scalar(select(Bid).where(Bid.id == bid_id))
        if not bid:
            raise HTTPException(status_code=404, detail="Bid not found")
        if bid.status != BidStatus.accepted:
            raise HTTPException(status_code=400, detail="Only accepted bids can be cancelled")

        listing = await db.scalar(select(Listing).where(Listing.id == bid.listing_id))
        if not listing:
            raise HTTPException(status_code=404, detail="Listing for this bid not found")

        # An already-finalized auction has its wallet/settlement records tied to the recorded
        # result; overriding a bid there would desync them. Restart the auction instead.
        finalized = await db.scalar(select(AuctionResult.id).where(AuctionResult.listing_id == listing.id))
        if finalized:
            raise HTTPException(
                status_code=409,
                detail="This auction has already been finalized. Use the restart-auction endpoint instead.",
            )

        # Only the current highest bid actually holds funds — every earlier bid on this listing
        # already had its hold released back to the bidder when it was outbid (see bidding-engine).
        # Identify it by row id, not by amount: after a prior cancel resets current_price to
        # starting_price, an unrelated older (already-released) bid could coincidentally match that
        # value in a low_start auction, where the first bid is allowed to equal starting_price.
        current_highest_bid = await db.scalar(
            select(Bid).where(Bid.listing_id == listing.id, Bid.status == BidStatus.accepted)
            .order_by(Bid.amount.desc()).limit(1)
        )
        is_current_highest = current_highest_bid is not None and current_highest_bid.id == bid.id

        bid.status = BidStatus.cancelled
        funds_released = False

        if is_current_highest:
            bidder = await db.scalar(select(User).where(User.id == bid.bidder_id))
            if bidder:
                bidder.balance += bid.amount
                db.add(WalletTransaction(
                    user_id=bidder.id, amount=bid.amount, type=TransactionType.bid_release,
                    reference=f"Admin override: bid {bid.id} cancelled",
                ))
                funds_released = True

            next_highest = await db.scalar(
                select(Bid).where(
                    Bid.listing_id == listing.id, Bid.status == BidStatus.accepted, Bid.id != bid.id,
                ).order_by(Bid.amount.desc()).limit(1)
            )
            if next_highest:
                restored_bidder = await db.scalar(select(User).where(User.id == next_highest.bidder_id))
                if not restored_bidder or restored_bidder.balance < next_highest.amount:
                    raise HTTPException(
                        status_code=409,
                        detail="Cannot restore the previous bid: that bidder no longer has sufficient "
                               "balance to re-hold the funds.",
                    )
                # Re-hold funds for the restored bid, mirroring the bidding engine's own hold logic,
                # so current_price always corresponds to an actually-held amount.
                restored_bidder.balance -= next_highest.amount
                db.add(WalletTransaction(
                    user_id=restored_bidder.id, amount=next_highest.amount, type=TransactionType.bid_hold,
                    reference=f"Admin override: restored as highest bid after cancelling {bid.id}",
                ))
                listing.current_price = next_highest.amount
            else:
                listing.current_price = listing.starting_price

            listing.updated_at = datetime.now(timezone.utc)

        db.add(AdminLog(
            admin_id=admin.id, action="cancel_bid", target_id=bid.id,
            details=f"Cancelled bid of {bid.amount} on listing {listing.id}; funds_released={funds_released}",
        ))
        await db.commit()
        await db.refresh(bid)
        await db.refresh(listing)

        return {
            "bid_id": bid.id,
            "listing_id": listing.id,
            "status": bid.status.value,
            "new_current_price": listing.current_price,
            "funds_released": funds_released,
        }
    # endregion

    # region Options
    @staticmethod
    async def get_options(db: AsyncSession, set_key: str) -> List[dict]:
        rows = (await db.execute(
            select(OptionSet)
            .where(OptionSet.set_key == set_key, OptionSet.is_active == True)
            .order_by(OptionSet.sort_order, OptionSet.label)
        )).scalars().all()
        return [{"value": r.value, "label": r.label} for r in rows]
    # endregion

    # region System logs
    @staticmethod
    def get_system_logs(
        page: int,
        size: int,
        day: Optional[date] = None,
        level: Optional[str] = None,
        service: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Read the general log of every microservice. ALL_LOGS_DIR is a read-only mount of
        # all services' log dirs in Docker, one level deep (all-logs/<svc>/x.log); it falls
        # back to this service's flat LOG_DIR locally. The "<name>*" glob picks up both the
        # current file and rotated daily files (<name>.log.YYYY-MM-DD) so past days stay
        # filterable; the "*/" prefix keeps stale top-level files from duplicating subdir ones.
        base = Path(settings.ALL_LOGS_DIR or settings.LOG_DIR)
        subdir = "*/" if settings.ALL_LOGS_DIR else ""
        level = level.lower() if level else None

        entries: List[dict] = []
        idx = 0

        for fname, svc in _GENERAL_LOG_FILES.items():
            if service and svc != service:
                continue
            for log_path in sorted(base.glob(f"{subdir}{fname}*")):
                with open(log_path, "r", encoding="utf-8", errors="replace") as f:
                    for line in f:
                        match = _LOG_LINE_RE.match(line.strip())
                        if not match:
                            continue
                        lvl = match.group("level").lower()
                        if level and lvl != level:
                            continue
                        # The formatter writes naive local time; the container always runs in UTC
                        # (no TZ override anywhere), so attach it explicitly — otherwise the naive
                        # string round-trips through JSON with no offset and browsers parse it as
                        # local time, skewing every timestamp by the admin's UTC offset.
                        ts = datetime.strptime(match.group("timestamp"), "%Y-%m-%d %H:%M:%S").replace(
                            tzinfo=timezone.utc
                        )
                        if day and ts.date() != day:
                            continue
                        entries.append({
                            "id": str(idx),
                            "timestamp": ts,
                            "level": lvl,
                            "service": svc,
                            "message": match.group("message"),
                        })
                        idx += 1

        entries.sort(key=lambda e: e["timestamp"], reverse=True)  # most recent first, across services

        total = len(entries)
        pages = (total + size - 1) // size if total else 0
        start = (page - 1) * size
        page_items = entries[start:start + size]

        return {"items": page_items, "total": total, "page": page, "size": size, "pages": pages}
    # endregion

    # region Content moderation
    @staticmethod
    async def get_prohibited_keywords(db: AsyncSession) -> List[dict]:
        query = (
            select(ProhibitedKeyword, User.username)
            .outerjoin(User, User.id == ProhibitedKeyword.added_by)
            .order_by(ProhibitedKeyword.keyword)
        )
        rows = (await db.execute(query)).all()
        return [{
            "id": kw.id,
            "keyword": kw.keyword,
            "category": kw.category,
            "added_by_username": username,
            "created_at": kw.created_at,
        } for kw, username in rows]

    @staticmethod
    async def create_prohibited_keyword(db: AsyncSession, admin: User, keyword: str, category: str = "illegal_item") -> dict:
        existing = await db.scalar(
            select(ProhibitedKeyword).where(func.lower(ProhibitedKeyword.keyword) == keyword.lower())
        )
        if existing:
            raise HTTPException(status_code=409, detail="This keyword is already on the prohibited list")

        entry = ProhibitedKeyword(keyword=keyword, category=category, added_by=admin.id)
        db.add(entry)
        db.add(AdminLog(
            admin_id=admin.id, action="add_prohibited_keyword", target_id=entry.id,
            details=f"Added prohibited keyword '{keyword}' ({category})",
        ))
        await db.commit()
        await db.refresh(entry)
        return {
            "id": entry.id,
            "keyword": entry.keyword,
            "category": entry.category,
            "added_by_username": admin.username,
            "created_at": entry.created_at,
        }

    @staticmethod
    async def delete_prohibited_keyword(db: AsyncSession, admin: User, keyword_id: UUID) -> None:
        entry = await db.scalar(select(ProhibitedKeyword).where(ProhibitedKeyword.id == keyword_id))
        if not entry:
            raise HTTPException(status_code=404, detail="Prohibited keyword not found")

        keyword_text = entry.keyword
        await db.delete(entry)
        db.add(AdminLog(
            admin_id=admin.id, action="remove_prohibited_keyword", target_id=keyword_id,
            details=f"Removed prohibited keyword '{keyword_text}'",
        ))
        await db.commit()

    @staticmethod
    async def get_flagged_attempts(db: AsyncSession, page: int, size: int) -> Dict[str, Any]:
        query = select(FlaggedListingAttempt, User.username).join(User, User.id == FlaggedListingAttempt.user_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query)

        query = query.order_by(FlaggedListingAttempt.created_at.desc()).offset((page - 1) * size).limit(size)
        rows = (await db.execute(query)).all()

        items = [{
            "id": attempt.id,
            "user_id": attempt.user_id,
            "username": username,
            "keyword_matched": attempt.keyword_matched,
            "field": attempt.field,
            "attempted_text": attempt.attempted_text,
            "created_at": attempt.created_at,
        } for attempt, username in rows]

        pages = (total + size - 1) // size if total else 0
        return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

    @staticmethod
    async def get_ai_moderation_flags(db: AsyncSession, page: int, size: int) -> Dict[str, Any]:
        query = select(AIModerationFlag, User.username).join(User, User.id == AIModerationFlag.user_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query)

        query = query.order_by(AIModerationFlag.created_at.desc()).offset((page - 1) * size).limit(size)
        rows = (await db.execute(query)).all()

        items = [{
            "id": flag.id,
            "listing_id": flag.listing_id,
            "user_id": flag.user_id,
            "username": username,
            "categories": flag.categories,
            "field": flag.field,
            "flagged_text": flag.flagged_text,
            "reviewed": flag.reviewed,
            "created_at": flag.created_at,
        } for flag, username in rows]

        pages = (total + size - 1) // size if total else 0
        return {"items": items, "total": total, "page": page, "size": size, "pages": pages}
    # endregion

    # region Logs
    @staticmethod
    async def get_logs(
        db: AsyncSession,
        page: int,
        size: int,
        admin_id: Optional[UUID],
        action: Optional[str],
        day: Optional[date] = None,
    ) -> Dict[str, Any]:
        query = select(AdminLog, User.username).join(User, User.id == AdminLog.admin_id)
        if admin_id:
            query = query.where(AdminLog.admin_id == admin_id)
        if action:
            query = query.where(AdminLog.action == action)
        if day:
            start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
            query = query.where(AdminLog.created_at >= start, AdminLog.created_at < start + timedelta(days=1))

        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query)

        query = query.order_by(AdminLog.created_at.desc()).offset((page - 1) * size).limit(size)
        rows = (await db.execute(query)).all()

        items = [{
            "id": log.id,
            "admin_id": log.admin_id,
            "admin_username": username,
            "action": log.action,
            "target_id": log.target_id,
            "details": log.details,
            "created_at": log.created_at,
        } for log, username in rows]

        pages = (total + size - 1) // size if total else 0
        return {"items": items, "total": total, "page": page, "size": size, "pages": pages}
    # endregion

    # region Stats
    @staticmethod
    async def get_stats(db: AsyncSession) -> Dict[str, Any]:
        total_users = await db.scalar(
            select(func.count()).select_from(User).where(User.status != UserStatus.deleted)
        ) or 0
        active_auctions = await db.scalar(
            select(func.count()).select_from(Listing).where(Listing.status == ListingStatus.active)
        ) or 0
        total_bids = await db.scalar(select(func.count()).select_from(Bid)) or 0
        suspended_users = await db.scalar(
            select(func.count()).select_from(User).where(User.status == UserStatus.suspended)
        ) or 0

        # Revenue = money paid BY users TO the platform (negative-signed settlement transactions —
        # currently only premium subscription renewals). Auction settlements aren't platform revenue
        # (they're peer-to-peer value transfer) and aren't counted here.
        revenue = await db.scalar(
            select(func.coalesce(func.sum(-WalletTransaction.amount), 0.0))
            .where(WalletTransaction.type == TransactionType.settlement, WalletTransaction.amount < 0)
        ) or 0.0

        since = datetime.now(timezone.utc) - timedelta(days=30)
        reg_rows = (await db.execute(
            select(func.date(User.created_at), func.count())
            .where(User.created_at >= since)
            .group_by(func.date(User.created_at))
            .order_by(func.date(User.created_at))
        )).all()
        new_registrations = [{"date": str(d), "count": c} for d, c in reg_rows]

        return {
            "total_users": total_users,
            "active_auctions": active_auctions,
            "total_bids": total_bids,
            "revenue": float(revenue),
            "suspended_users": suspended_users,
            "new_registrations": new_registrations,
        }
    # endregion
