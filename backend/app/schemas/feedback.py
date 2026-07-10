from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ── Feedback Types ────────────────────────────────────────────────────────────

class FeedbackTypeCreate(BaseModel):
    name: str
    reviewer_role: str = Field(..., pattern="^(buyer|seller)$")


class FeedbackTypeUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class FeedbackTypeResponse(BaseModel):
    id: UUID
    name: str
    reviewer_role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Item Feedback ─────────────────────────────────────────────────────────────

class FeedbackCreate(BaseModel):
    listing_id: UUID
    reviewee_id: UUID
    feedback_type_id: UUID
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class FeedbackReviewerInfo(BaseModel):
    id: UUID
    username: str

    model_config = ConfigDict(from_attributes=True)


class FeedbackListingInfo(BaseModel):
    id: UUID
    title: str

    model_config = ConfigDict(from_attributes=True)


class FeedbackResponse(BaseModel):
    id: UUID
    listing_id: UUID
    reviewer_id: UUID
    reviewee_id: UUID
    feedback_type_id: UUID
    rating: int
    comment: Optional[str]
    is_public: bool
    created_at: datetime
    reviewer: Optional[FeedbackReviewerInfo] = None
    reviewee: Optional[FeedbackReviewerInfo] = None
    feedback_type: Optional[FeedbackTypeResponse] = None
    listing: Optional[FeedbackListingInfo] = None

    model_config = ConfigDict(from_attributes=True)


class EligibilityResponse(BaseModel):
    eligible_type_ids: List[UUID]
    already_submitted_type_ids: List[UUID]
    seller_id: Optional[UUID] = None
