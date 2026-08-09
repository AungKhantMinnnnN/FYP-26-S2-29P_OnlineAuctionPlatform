from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, exists, func
from fastapi import HTTPException

from app.models.auction import FeedbackType, ItemFeedback, Listing, Bid, User
from app.schemas.feedback import FeedbackCreate, FeedbackTypeCreate, FeedbackTypeUpdate, EligibilityResponse


class FeedbackTypeService:
    @staticmethod
    async def get_all(db: AsyncSession, active_only: bool = False) -> List[FeedbackType]:
        q = select(FeedbackType).order_by(FeedbackType.name)
        if active_only:
            q = q.where(FeedbackType.is_active == True)
        result = await db.execute(q)
        return result.scalars().all()

    @staticmethod
    async def create(db: AsyncSession, data: FeedbackTypeCreate) -> FeedbackType:
        existing = await db.scalar(select(FeedbackType).where(FeedbackType.name == data.name))
        if existing:
            raise HTTPException(status_code=409, detail="Feedback type with this name already exists")
        ft = FeedbackType(name=data.name, reviewer_role=data.reviewer_role)
        db.add(ft)
        await db.commit()
        await db.refresh(ft)
        return ft

    @staticmethod
    async def update(db: AsyncSession, ft_id: UUID, data: FeedbackTypeUpdate) -> FeedbackType:
        ft = await db.scalar(select(FeedbackType).where(FeedbackType.id == ft_id))
        if not ft:
            raise HTTPException(status_code=404, detail="Feedback type not found")
        if data.name is not None:
            clash = await db.scalar(
                select(FeedbackType).where(FeedbackType.name == data.name, FeedbackType.id != ft_id)
            )
            if clash:
                raise HTTPException(status_code=409, detail="Feedback type with this name already exists")
            ft.name = data.name
        if data.is_active is not None:
            ft.is_active = data.is_active
        await db.commit()
        await db.refresh(ft)
        return ft

    @staticmethod
    async def delete(db: AsyncSession, ft_id: UUID) -> None:
        ft = await db.scalar(select(FeedbackType).where(FeedbackType.id == ft_id))
        if not ft:
            raise HTTPException(status_code=404, detail="Feedback type not found")
        in_use = await db.scalar(select(exists().where(ItemFeedback.feedback_type_id == ft_id)))
        if in_use:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete: feedback records reference this type. Deactivate it instead."
            )
        await db.delete(ft)
        await db.commit()


class FeedbackService:
    @staticmethod
    async def _check_eligibility(
        db: AsyncSession, reviewer_id: UUID, listing_id: UUID, ft: FeedbackType
    ) -> None:
        """Raise 403 if the reviewer is not eligible to submit this feedback type."""
        listing = await db.scalar(select(Listing).where(Listing.id == listing_id))
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")

        if ft.reviewer_role == "buyer":
            has_bid = await db.scalar(
                select(exists().where(
                    Bid.listing_id == listing_id,
                    Bid.bidder_id == reviewer_id
                ))
            )
            if not has_bid:
                raise HTTPException(
                    status_code=403,
                    detail="You must have placed a bid on this listing to submit this feedback."
                )
        else:
            if listing.seller_id != reviewer_id:
                raise HTTPException(status_code=403, detail="Only the listing seller can submit this feedback type.")

    @staticmethod
    async def get_eligibility(
        db: AsyncSession, reviewer_id: UUID, listing_id: UUID
    ) -> EligibilityResponse:
        listing = await db.scalar(select(Listing).where(Listing.id == listing_id))
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")

        all_types = await FeedbackTypeService.get_all(db, active_only=True)

        has_bid = await db.scalar(
            select(exists().where(Bid.listing_id == listing_id, Bid.bidder_id == reviewer_id))
        )
        is_seller = listing.seller_id == reviewer_id

        eligible_ids = []
        for ft in all_types:
            if ft.reviewer_role == "buyer" and has_bid:
                eligible_ids.append(ft.id)
            elif ft.reviewer_role == "seller" and is_seller:
                eligible_ids.append(ft.id)

        submitted = await db.execute(
            select(ItemFeedback.feedback_type_id).where(
                ItemFeedback.listing_id == listing_id,
                ItemFeedback.reviewer_id == reviewer_id
            )
        )
        already_submitted = [row[0] for row in submitted.all()]

        return EligibilityResponse(
            eligible_type_ids=eligible_ids,
            already_submitted_type_ids=already_submitted,
            seller_id=listing.seller_id,
        )

    @staticmethod
    async def submit(db: AsyncSession, reviewer_id: UUID, data: FeedbackCreate) -> ItemFeedback:
        ft = await db.scalar(select(FeedbackType).where(FeedbackType.id == data.feedback_type_id))
        if not ft or not ft.is_active:
            raise HTTPException(status_code=404, detail="Feedback type not found or inactive")

        await FeedbackService._check_eligibility(db, reviewer_id, data.listing_id, ft)

        listing = await db.scalar(select(Listing).where(Listing.id == data.listing_id))
        if ft.reviewer_role == "buyer" and data.reviewee_id != listing.seller_id:
            raise HTTPException(status_code=400, detail="Reviewee must be the listing seller for buyer feedback types.")

        existing = await db.scalar(
            select(ItemFeedback).where(
                ItemFeedback.listing_id == data.listing_id,
                ItemFeedback.reviewer_id == reviewer_id,
                ItemFeedback.feedback_type_id == data.feedback_type_id
            )
        )
        if existing:
            raise HTTPException(status_code=409, detail="You have already submitted this feedback type for this listing.")

        feedback = ItemFeedback(
            listing_id=data.listing_id,
            reviewer_id=reviewer_id,
            reviewee_id=data.reviewee_id,
            feedback_type_id=data.feedback_type_id,
            rating=data.rating,
            comment=data.comment,
        )
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)

        # Seller rating shown on listings is built only from buyer->seller feedback
        # (reviewer_role == "buyer") -- seller->buyer feedback rates the buyer, not
        # this reviewee's standing as a seller, so it's excluded from this aggregate.
        if ft.reviewer_role == "buyer":
            agg = await db.execute(
                select(func.avg(ItemFeedback.rating), func.count(ItemFeedback.id))
                .join(FeedbackType, ItemFeedback.feedback_type_id == FeedbackType.id)
                .where(
                    ItemFeedback.reviewee_id == data.reviewee_id,
                    FeedbackType.reviewer_role == "buyer",
                )
            )
            avg_rating, count = agg.one()
            reviewee = await db.scalar(select(User).where(User.id == data.reviewee_id))
            reviewee.rating_avg = float(avg_rating) if avg_rating is not None else None
            reviewee.rating_count = count or 0
            await db.commit()

        return feedback

    @staticmethod
    async def get_public(db: AsyncSession, limit: int = 10) -> List[ItemFeedback]:
        result = await db.execute(
            select(ItemFeedback)
            .where(ItemFeedback.is_public == True)
            .order_by(ItemFeedback.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_for_listing(db: AsyncSession, listing_id: UUID) -> List[ItemFeedback]:
        result = await db.execute(
            select(ItemFeedback)
            .where(ItemFeedback.listing_id == listing_id, ItemFeedback.is_public == True)
            .order_by(ItemFeedback.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_for_user(db: AsyncSession, user_id: UUID) -> List[ItemFeedback]:
        result = await db.execute(
            select(ItemFeedback)
            .where(ItemFeedback.reviewee_id == user_id, ItemFeedback.is_public == True)
            .order_by(ItemFeedback.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_submitted_by_user(db: AsyncSession, reviewer_id: UUID) -> List[ItemFeedback]:
        # No is_public filter: this is the submitter's own history, unlike get_for_user
        # (public feedback received by someone else) — they can see it regardless.
        result = await db.execute(
            select(ItemFeedback)
            .where(ItemFeedback.reviewer_id == reviewer_id)
            .order_by(ItemFeedback.created_at.desc())
        )
        return result.scalars().all()
