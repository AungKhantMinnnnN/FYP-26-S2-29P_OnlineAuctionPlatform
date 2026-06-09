from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.models.auction import ItemConditions, BiddingType, ListingStatus

class ListingImageResponse(BaseModel):
    id: UUID
    s3_key: str
    sort_order: int
    is_primary: bool
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AuctionListingResponse(BaseModel):
    id: UUID
    seller_id: UUID
    category_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    condition: ItemConditions
    bidding_type: BiddingType
    starting_price: Optional[float] = None
    reserve_price: Optional[float] = None
    current_price: Optional[float] = None
    min_increment: Optional[float] = None
    status: ListingStatus
    start_time: datetime
    end_time: datetime
    created_at: datetime
    updated_at: datetime
    
    images: List[ListingImageResponse] = []

    model_config = ConfigDict(from_attributes=True)

class PaginatedAuctionResponse(BaseModel):
    items: List[AuctionListingResponse]
    total: int
    page: int
    size: int
    pages: int
