from sqlalchemy import asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.auction import SubscriptionTierConfig


class SubscriptionService:
    @staticmethod
    async def list_active_tiers(db: AsyncSession) -> list[SubscriptionTierConfig]:
        stmt = (
            select(SubscriptionTierConfig)
            .where(SubscriptionTierConfig.is_active == True)  # noqa: E712
            .order_by(asc(SubscriptionTierConfig.price))
        )
        result = await db.execute(stmt)
        return result.scalars().all()
