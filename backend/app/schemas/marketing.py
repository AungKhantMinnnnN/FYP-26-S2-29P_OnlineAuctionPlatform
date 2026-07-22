from datetime import datetime
from typing import List
from uuid import UUID
from pydantic import BaseModel


class MarketingVideoItem(BaseModel):
    id: UUID
    url: str
    original_filename: str | None = None
    is_active: bool
    created_at: datetime


class MarketingVideoListResponse(BaseModel):
    items: List[MarketingVideoItem]
