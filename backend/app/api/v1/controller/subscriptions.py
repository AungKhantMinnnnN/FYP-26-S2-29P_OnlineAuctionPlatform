from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.subscription import SubscriptionTiersResponse, SubscriptionTierItem
from app.services.subscription_service import SubscriptionService

router = APIRouter()


@router.get("", response_model=SubscriptionTiersResponse)
async def list_subscription_tiers(
    db: AsyncSession = Depends(get_db),
):
    tiers = await SubscriptionService.list_active_tiers(db=db)
    return SubscriptionTiersResponse(
        items=[
            SubscriptionTierItem(
                id=t.id,
                tier=t.tier.value,
                price=t.price,
                duration_days=t.duration_days,
                description=t.description,
                is_active=t.is_active,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in tiers
        ],
    )
