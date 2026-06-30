from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.auction import DisputeStatus


class DisputeCreate(BaseModel):
    listing_id: Optional[UUID] = None
    category: str
    description: str


class DisputeResolveRequest(BaseModel):
    status: DisputeStatus
    resolution_note: Optional[str] = None


class DisputeResponse(BaseModel):
    id: UUID
    reporter_id: UUID
    listing_id: Optional[UUID] = None
    category: str
    description: str
    status: DisputeStatus
    resolution_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
