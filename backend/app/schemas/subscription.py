from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class SubscriptionTierItem(BaseModel):
    id: UUID
    tier: str
    price: float
    duration_days: int
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubscriptionTiersResponse(BaseModel):
    items: List[SubscriptionTierItem]
