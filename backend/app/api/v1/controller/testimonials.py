from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.auction import User
from app.api.deps import get_current_user, get_admin_user
from app.schemas.testimonials import TestimonialCreate, TestimonialResponse
from app.services.testimonial_service import TestimonialService

router = APIRouter()


@router.get("/", response_model=List[TestimonialResponse])
async def get_featured_testimonials(db: AsyncSession = Depends(get_db)):
    return await TestimonialService.get_featured(db=db)


@router.get("/admin", response_model=List[TestimonialResponse])
async def get_all_testimonials(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """All submitted testimonials, regardless of approval."""
    return await TestimonialService.get_all(db=db)


@router.get("/me", response_model=List[TestimonialResponse])
async def get_my_testimonials(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TestimonialService.get_by_user(db=db, user_id=current_user.id)


@router.post("/{id}/approve", response_model=TestimonialResponse)
async def approve_testimonial(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await TestimonialService.approve_testimonial(db=db, testimonial_id=id)


@router.post("/{id}/unfeature", response_model=TestimonialResponse)
async def unfeature_testimonial(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await TestimonialService.unfeature_testimonial(db=db, testimonial_id=id)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_testimonial(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Works whether the testimonial is pending or already approved."""
    await TestimonialService.delete_testimonial(db=db, testimonial_id=id)


@router.post("/", response_model=TestimonialResponse, status_code=status.HTTP_201_CREATED)
async def create_testimonial(
    data: TestimonialCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TestimonialService.create_testimonial(
        db=db, user_id=current_user.id, data=data
    )
