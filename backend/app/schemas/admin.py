from pydantic import BaseModel


class PlatformStats(BaseModel):
    total_users: int
    active_auctions: int
    total_listings: int
    total_bids: int
    completed_auctions: int
    total_bid_volume: float
