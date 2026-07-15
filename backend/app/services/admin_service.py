from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict

from app.models.auction import User, Listing, Bid, AuctionResult, ListingStatus


class AdminService:
    @staticmethod
    async def get_platform_stats(db: AsyncSession) -> Dict[str, Any]:
        total_users = (await db.execute(
            select(func.count()).select_from(User)
        )).scalar()

        active_auctions = (await db.execute(
            select(func.count()).select_from(Listing).where(Listing.status == ListingStatus.active)
        )).scalar()

        total_listings = (await db.execute(
            select(func.count()).select_from(Listing)
        )).scalar()

        total_bids = (await db.execute(
            select(func.count()).select_from(Bid)
        )).scalar()

        completed_auctions = (await db.execute(
            select(func.count()).select_from(Listing).where(Listing.status == ListingStatus.ended)
        )).scalar()

        # Settled transaction volume (GMV) — sum of final prices of concluded auctions.
        total_bid_volume = (await db.execute(
            select(func.coalesce(func.sum(AuctionResult.final_price), 0.0))
        )).scalar()

        return {
            "total_users": total_users or 0,
            "active_auctions": active_auctions or 0,
            "total_listings": total_listings or 0,
            "total_bids": total_bids or 0,
            "completed_auctions": completed_auctions or 0,
            "total_bid_volume": total_bid_volume or 0.0,
        }
