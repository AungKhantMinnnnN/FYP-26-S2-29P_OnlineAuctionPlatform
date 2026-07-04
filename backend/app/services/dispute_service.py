from typing import List, Optional
from uuid import UUID
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.auction import Dispute, Listing, DisputeStatus
from app.schemas.disputes import DisputeCreate, DisputeResolveRequest


class DisputeService:
    @staticmethod
    async def get_disputes(
        db: AsyncSession, dispute_status: Optional[DisputeStatus] = None
    ) -> List[Dispute]:
        query = select(Dispute).order_by(Dispute.created_at.desc())
        if dispute_status:
            query = query.where(Dispute.status == dispute_status)
        result = await db.execute(query)
        return result.scalars().all()


    @staticmethod
    async def get_user_disputes(db: AsyncSession, user_id: UUID) -> List[Dispute]:
        """User: own submitted disputes with current status."""
        result = await db.execute(
            select(Dispute)
            .where(Dispute.reporter_id == user_id)
            .order_by(Dispute.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def resolve_dispute(
        db: AsyncSession, dispute_id: UUID, admin_id: UUID, data: DisputeResolveRequest
    ) -> Dispute:
        result = await db.execute(select(Dispute).where(Dispute.id == dispute_id))
        dispute = result.scalars().first()
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")

        dispute.status = data.status
        dispute.resolution_note = data.resolution_note
        dispute.resolved_by = admin_id
        dispute.resolved_at = datetime.datetime.now(datetime.timezone.utc)
        await db.commit()
        await db.refresh(dispute)
        return dispute

    @staticmethod
    async def create_dispute(
        db: AsyncSession, reporter_id: UUID, data: DisputeCreate
    ) -> Dispute:
        if data.listing_id:
            exists = await db.scalar(
                select(Listing.id).where(Listing.id == data.listing_id)
            )
            if not exists:
                raise HTTPException(status_code=404, detail="Listing not found")

        dispute = Dispute(
            reporter_id=reporter_id,
            listing_id=data.listing_id,
            issue_type_id=data.issue_type_id,
            subject=data.subject,
            category=data.category,
            description=data.description,
        )
        db.add(dispute)
        await db.commit()
        await db.refresh(dispute)
        return dispute
