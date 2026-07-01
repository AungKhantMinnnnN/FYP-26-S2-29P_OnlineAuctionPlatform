from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID


class TestimonialCreate(BaseModel):
    content: str
    rating: int

    @field_validator("rating")
    def rating_in_range(cls, v):
        if not 1 <= v <= 5:
            raise ValueError("rating must be between 1 and 5")
        return v


class TestimonialResponse(BaseModel):
    id: UUID
    user_id: UUID
    content: str
    rating: int
    is_featured: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
