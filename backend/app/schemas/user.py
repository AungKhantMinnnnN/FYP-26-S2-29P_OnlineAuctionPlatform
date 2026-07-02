from datetime import datetime
from typing import Optional, Literal, List
from uuid import UUID
from pydantic import BaseModel


class PaginationMeta(BaseModel):
    total: int
    page: int
    size: int
    pages: int


# region Bids
class BidHistoryItem(BaseModel):
    listing_id: UUID
    listing_title: str
    listing_image_url: Optional[str] = None
    listing_status: str
    listing_end_time: datetime
    my_highest_bid: float
    current_price: float
    result: Literal["won", "outbid", "leading", "active"]
    placed_at: datetime


class BidHistoryResponse(PaginationMeta):
    items: List[BidHistoryItem]
# endregion


# region Purchases
class PurchaseItem(BaseModel):
    auction_result_id: UUID
    listing_id: UUID
    listing_title: str
    listing_image_url: Optional[str] = None
    final_price: float
    ended_at: datetime


class PurchasesResponse(PaginationMeta):
    items: List[PurchaseItem]
# endregion


# region Watchlist
class WatchlistListing(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    condition: str
    current_price: float
    starting_price: float
    status: str
    start_time: datetime
    end_time: datetime
    image_url: Optional[str] = None


class WatchlistItem(BaseModel):
    watchlist_id: UUID
    listing_id: UUID
    added_at: datetime
    listing: WatchlistListing


class WatchlistResponse(BaseModel):
    items: List[WatchlistItem]
    listing_ids: List[UUID]


class WatchlistAddRequest(BaseModel):
    listing_id: UUID


class WatchlistAddResponse(BaseModel):
    watchlist_id: UUID
    listing_id: UUID
    added_at: datetime
# endregion


# region Wallet
class WalletTransactionItem(BaseModel):
    id: UUID
    amount: float
    type: str
    reference: Optional[str] = None
    created_at: datetime


class WalletTransactionsPage(PaginationMeta):
    items: List[WalletTransactionItem]


class WalletResponse(BaseModel):
    balance: float
    transactions: WalletTransactionsPage
# endregion


# region Profile
class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[str] = None  # ISO date string: YYYY-MM-DD
    bio: Optional[str] = None


class ProfileResponse(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[str] = None
    bio: Optional[str] = None
# endregion


# region Interests
class InterestCategory(BaseModel):
    id: UUID
    name: str
    slug: str


class InterestsResponse(BaseModel):
    items: List[InterestCategory]
# endregion


# region Subscription
class SubscriptionActionRequest(BaseModel):
    action: Literal["renew", "cancel"]


class SubscriptionResponse(BaseModel):
    subscription_tier: str
    subscription_expires_at: Optional[datetime] = None
    balance: float
    message: str
# endregion
