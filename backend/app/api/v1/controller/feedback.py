from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.auction import User
from app.api.deps import get_current_user, get_admin_user
from app.schemas.feedback import (
    FeedbackCreate, FeedbackResponse,
    FeedbackTypeCreate, FeedbackTypeUpdate, FeedbackTypeResponse,
    EligibilityResponse,
)
from app.services.feedback_service import FeedbackService, FeedbackTypeService

router = APIRouter()


# ── Public feedback type list (used by the submit form) ──────────────────────

@router.get("/types", response_model=List[FeedbackTypeResponse])
async def list_feedback_types(db: AsyncSession = Depends(get_db)):
    """Public: list all active feedback types."""
    return await FeedbackTypeService.get_all(db, active_only=True)


# ── Admin: manage feedback types ─────────────────────────────────────────────

@router.get("/types/all", response_model=List[FeedbackTypeResponse])
async def list_all_feedback_types(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin: list all feedback types including inactive."""
    return await FeedbackTypeService.get_all(db, active_only=False)


@router.post("/types", response_model=FeedbackTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback_type(
    data: FeedbackTypeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await FeedbackTypeService.create(db, data)


@router.patch("/types/{id}", response_model=FeedbackTypeResponse)
async def update_feedback_type(
    id: UUID,
    data: FeedbackTypeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await FeedbackTypeService.update(db, id, data)


@router.delete("/types/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback_type(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    await FeedbackTypeService.delete(db, id)


# ── Public feedback reads ─────────────────────────────────────────────────────

@router.get("/public", response_model=List[FeedbackResponse])
async def get_public_feedback(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Public: recent public feedback for landing page."""
    return await FeedbackService.get_public(db, limit)


@router.get("/listing/{listing_id}", response_model=List[FeedbackResponse])
async def get_listing_feedback(listing_id: UUID, db: AsyncSession = Depends(get_db)):
    """Public: all public feedback for a specific listing."""
    return await FeedbackService.get_for_listing(db, listing_id)


@router.get("/user/{user_id}", response_model=List[FeedbackResponse])
async def get_user_feedback(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """Public: all public feedback received by a user."""
    return await FeedbackService.get_for_user(db, user_id)


# ── Authenticated: eligibility check + submit ─────────────────────────────────

@router.get("/me/eligibility/{listing_id}", response_model=EligibilityResponse)
async def check_eligibility(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check which feedback types the current user can submit for a listing."""
    return await FeedbackService.get_eligibility(db, current_user.id, listing_id)


@router.get("/me/submitted", response_model=List[FeedbackResponse])
async def get_my_submitted_feedback(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Feedback the current user has submitted (as reviewer), regardless of visibility."""
    return await FeedbackService.get_submitted_by_user(db, current_user.id)


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    data: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await FeedbackService.submit(db, current_user.id, data)
