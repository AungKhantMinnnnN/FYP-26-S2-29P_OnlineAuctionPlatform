import datetime
import uuid
from typing import Optional
from pydantic import BaseModel


class ListingImageItem(BaseModel):
    id: uuid.UUID
    s3_key: str
    sort_order: int
    is_primary: bool
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class SellerItem(BaseModel):
    id: uuid.UUID
    username: str
    email: str

    class Config:
        from_attributes = True


class TrendingListing(BaseModel):
    id: uuid.UUID
    seller_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    brand: Optional[str] = None
    condition: str
    condition_confidence: Optional[float] = None
    bidding_type: str
    starting_price: Optional[float] = None
    reserve_price: Optional[float] = None
    current_price: Optional[float] = None
    min_increment: Optional[float] = None
    status: str
    is_draft: bool
    start_time: Optional[datetime.datetime] = None
    end_time: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    images: list[ListingImageItem] = []
    seller: Optional[SellerItem] = None
    score: float


class TrendingResponse(BaseModel):
    items: list[TrendingListing]
    count: int
    type: str
