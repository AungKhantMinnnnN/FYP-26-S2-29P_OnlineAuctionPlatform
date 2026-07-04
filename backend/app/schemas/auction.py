from pydantic import BaseModel, ConfigDict, field_validator
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.models.auction import ItemConditions, BiddingType, ListingStatus

class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    parent_id: Optional[UUID] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class EnumResponse(BaseModel):
    id: str
    name: str

class MetadataResponse(BaseModel):
    categories: List[CategoryResponse]
    conditions: List[EnumResponse]
    biddingTypes: List[EnumResponse]

class ListingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    condition: ItemConditions
    bidding_type: BiddingType
    starting_price: float
    reserve_price: float
    min_increment: float = 1.0
    start_time: datetime
    end_time: datetime
    category_id: Optional[UUID] = None
    status: Optional[ListingStatus] = None

    @field_validator('end_time')
    def end_time_must_be_after_start_time(cls, v, info):
        if 'start_time' in info.data and v <= info.data['start_time']:
            raise ValueError('end_time must be after start_time')
        return v

    @field_validator('starting_price')
    def starting_price_must_be_positive(cls, v):
        if v < 0:
            raise ValueError('Starting price cannot be negative')
        return v

    @field_validator('reserve_price')
    def reserve_price_must_be_gte_starting_price(cls, v, info):
        if 'starting_price' in info.data and v < info.data['starting_price']:
            raise ValueError('reserve_price must be greater than or equal to starting_price')
        return v

class UserSellerResponse(BaseModel):
    id: UUID
    username: str
    email: str

    model_config = ConfigDict(from_attributes=True)

class BidResponse(BaseModel):
    id: UUID
    listing_id: UUID
    bidder_id: UUID
    amount: float
    status: str
    placed_at: datetime
    bidder: Optional[UserSellerResponse] = None

    model_config = ConfigDict(from_attributes=True)

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
    brand: Optional[str] = None
    condition: ItemConditions
    condition_confidence: Optional[float] = None
    bidding_type: BiddingType
    starting_price: Optional[float] = None
    reserve_price: Optional[float] = None
    current_price: Optional[float] = None
    min_increment: Optional[float] = None
    status: ListingStatus
    is_draft: bool = True
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    images: List[ListingImageResponse] = []
    seller: Optional[UserSellerResponse] = None

    model_config = ConfigDict(from_attributes=True)

class PaginatedAuctionResponse(BaseModel):
    items: List[AuctionListingResponse]
    total: int
    page: int
    size: int
    pages: int


class ListingStatusUpdate(BaseModel):
    status: ListingStatus
