import datetime
import uuid
from pydantic import BaseModel


class TrendingListing(BaseModel):
    id: uuid.UUID
    title: str
    current_price: float
    end_time: datetime.datetime | None
    score: float

    class Config:
        from_attributes = True


class TrendingResponse(BaseModel):
    items: list[TrendingListing]
    count: int
    type: str
