from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class BoardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False


class BoardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


class BoardItemAdd(BaseModel):
    auction_result_id: UUID
    note: Optional[str] = None
    sort_order: int = 0


class BoardItemUpdate(BaseModel):
    note: Optional[str] = None
    sort_order: Optional[int] = None
    target_board_id: Optional[UUID] = None  # move item to a different board


class BoardItemReorderEntry(BaseModel):
    item_id: UUID
    sort_order: int


class BoardItemsReorder(BaseModel):
    items: List[BoardItemReorderEntry]


class BoardItemListingSnapshot(BaseModel):
    id: UUID
    title: str
    image_url: Optional[str] = None
    final_price: float
    ended_at: datetime


class BoardItemResponse(BaseModel):
    id: UUID
    board_id: UUID
    auction_result_id: UUID
    note: Optional[str] = None
    sort_order: int
    added_at: datetime
    listing: Optional[BoardItemListingSnapshot] = None


class BoardSummaryResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    is_public: bool
    item_count: int
    created_at: datetime
    updated_at: datetime


class BoardResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    is_public: bool
    created_at: datetime
    updated_at: datetime
    items: List[BoardItemResponse] = []
