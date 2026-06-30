from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.auction import Testimonial
from app.schemas.testimonials import TestimonialCreate


class TestimonialService:
    @staticmethod
    async def get_featured(db: AsyncSession) -> List[Testimonial]:
        """Public: only admin-approved testimonials."""
        result = await db.execute(
            select(Testimonial)
            .where(Testimonial.is_featured.is_(True))
            .order_by(Testimonial.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_all(db: AsyncSession) -> List[Testimonial]:
        """Admin: all testimonials pending or approved."""
        result = await db.execute(
            select(Testimonial).order_by(Testimonial.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_by_user(db: AsyncSession, user_id: UUID) -> List[Testimonial]:
        """User: own submissions with current is_featured status."""
        result = await db.execute(
            select(Testimonial)
            .where(Testimonial.user_id == user_id)
            .order_by(Testimonial.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def approve_testimonial(db: AsyncSession, testimonial_id: UUID) -> Testimonial:
        result = await db.execute(select(Testimonial).where(Testimonial.id == testimonial_id))
        testimonial = result.scalars().first()
        if not testimonial:
            raise HTTPException(status_code=404, detail="Testimonial not found")
        testimonial.is_featured = True
        await db.commit()
        await db.refresh(testimonial)
        return testimonial

    @staticmethod
    async def create_testimonial(
        db: AsyncSession, user_id: UUID, data: TestimonialCreate
    ) -> Testimonial:
        testimonial = Testimonial(user_id=user_id, content=data.content, rating=data.rating)
        db.add(testimonial)
        await db.commit()
        await db.refresh(testimonial)
        return testimonial
