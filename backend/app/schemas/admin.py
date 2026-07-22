import re
from datetime import datetime
from typing import Optional, List, Literal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.schemas.auction import AuctionListingResponse

SLUG_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')


class OptionItem(BaseModel):
    value: str
    label: str


class PaginationMeta(BaseModel):
    total: int
    page: int
    size: int
    pages: int


# region Users
class AdminUserSummary(BaseModel):
    id: UUID
    username: str
    email: str
    role: str
    status: str
    created_at: datetime


class AdminUsersResponse(PaginationMeta):
    items: List[AdminUserSummary]
    admin_count: int


class AdminUserProfile(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[str] = None
    bio: Optional[str] = None


class AdminUserDetails(AdminUserSummary):
    subscription_tier: str
    balance: float
    email_verified: bool
    updated_at: datetime
    suspended_at: Optional[datetime] = None
    suspension_reason: Optional[str] = None
    profile: Optional[AdminUserProfile] = None


class SuspendUserRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=1000)
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


# region Listing detail
class AdminListingDetailResponse(AuctionListingResponse):
    winner_username: Optional[str] = None
    winning_amount: Optional[float] = None
# endregion


# region Listings list
class AdminListingsResponse(PaginationMeta):
    items: List[AuctionListingResponse]
    sell_through_pct: Optional[float] = None
# endregion


# region Content moderation
KeywordCategory = Literal['illegal_item', 'profanity']


class ProhibitedKeywordCreate(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=100)
    category: KeywordCategory = 'illegal_item'

    @field_validator('keyword')
    def keyword_must_not_be_blank(cls, v):
        cleaned = v.strip()
        if not cleaned:
            raise ValueError('keyword cannot be blank')
        return cleaned


class ProhibitedKeywordResponse(BaseModel):
    id: UUID
    keyword: str
    category: KeywordCategory
    added_by_username: Optional[str] = None
    created_at: datetime


class FlaggedAttemptItem(BaseModel):
    id: UUID
    user_id: UUID
    username: Optional[str] = None
    keyword_matched: str
    field: str
    attempted_text: str
    created_at: datetime


class FlaggedAttemptsResponse(PaginationMeta):
    items: List[FlaggedAttemptItem]


class AIModerationFlagItem(BaseModel):
    id: UUID
    listing_id: UUID
    user_id: UUID
    username: Optional[str] = None
    categories: str
    field: str
    flagged_text: str
    reviewed: bool
    created_at: datetime


class AIModerationFlagsResponse(PaginationMeta):
    items: List[AIModerationFlagItem]
# endregion


# region System logs
class SystemLogEntry(BaseModel):
    id: str
    timestamp: datetime
    level: str
    service: str
    message: str


class SystemLogsResponse(PaginationMeta):
    items: List[SystemLogEntry]
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
