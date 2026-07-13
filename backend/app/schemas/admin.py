import re
from datetime import datetime
from typing import Optional, List, Literal
from uuid import UUID
from pydantic import BaseModel, field_validator

SLUG_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')


class PaginationMeta(BaseModel):
    total: int
    page: int
    size: int
    pages: int


# region Users
class AdminUserItem(BaseModel):
    id: UUID
    username: str
    email: str
    role: str
    status: str
    balance: float
    subscription_tier: str
    email_verified: bool
    full_name: Optional[str] = None
    created_at: datetime


class AdminUsersResponse(PaginationMeta):
    items: List[AdminUserItem]
# endregion


# region Categories
class CategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: Optional[UUID] = None
    is_active: bool = True

    @field_validator('slug')
    def slug_must_be_url_safe(cls, v):
        if not SLUG_PATTERN.match(v):
            raise ValueError('slug must be lowercase alphanumeric with hyphens only (e.g. "vintage-watches")')
        return v


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_active: Optional[bool] = None

    @field_validator('slug')
    def slug_must_be_url_safe(cls, v):
        if v is not None and not SLUG_PATTERN.match(v):
            raise ValueError('slug must be lowercase alphanumeric with hyphens only (e.g. "vintage-watches")')
        return v


class CategoryDeleteResponse(BaseModel):
    id: UUID
    action: Literal["deleted", "deactivated"]
# endregion


# region Bids
class BidCancelResponse(BaseModel):
    bid_id: UUID
    listing_id: UUID
    status: str
    new_current_price: float
    funds_released: bool
# endregion


# region Auction restart
class AuctionRestartRequest(BaseModel):
    end_time: datetime
# endregion


# region Admin logs
class AdminLogItem(BaseModel):
    id: UUID
    admin_id: UUID
    admin_username: Optional[str] = None
    action: str
    target_id: Optional[UUID] = None
    details: Optional[str] = None
    created_at: datetime


class AdminLogsResponse(PaginationMeta):
    items: List[AdminLogItem]
# endregion


# region Stats
class RegistrationsByDay(BaseModel):
    date: str
    count: int


class AdminStatsResponse(BaseModel):
    total_users: int
    active_auctions: int
    total_bids: int
    revenue: float
    suspended_users: int
    new_registrations: List[RegistrationsByDay]
# endregion
