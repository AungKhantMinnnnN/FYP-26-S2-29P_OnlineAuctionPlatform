from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.auction import IssueType, Dispute
from app.schemas.issue_types import IssueTypeCreate, IssueTypeUpdate


class IssueTypeService:
    @staticmethod
    async def get_all(db: AsyncSession) -> List[IssueType]:
        result = await db.execute(select(IssueType).order_by(IssueType.name))
        return result.scalars().all()

    @staticmethod
    async def create(db: AsyncSession, data: IssueTypeCreate) -> IssueType:
        existing = await db.scalar(select(IssueType).where(IssueType.name == data.name))
        if existing:
            raise HTTPException(status_code=409, detail="Issue type with this name already exists")
        issue_type = IssueType(name=data.name)
        db.add(issue_type)
        await db.commit()
        await db.refresh(issue_type)
        return issue_type

    @staticmethod
    async def update(db: AsyncSession, issue_type_id: UUID, data: IssueTypeUpdate) -> IssueType:
        result = await db.execute(select(IssueType).where(IssueType.id == issue_type_id))
        issue_type = result.scalars().first()
        if not issue_type:
            raise HTTPException(status_code=404, detail="Issue type not found")
        existing = await db.scalar(
            select(IssueType).where(IssueType.name == data.name, IssueType.id != issue_type_id)
        )
        if existing:
            raise HTTPException(status_code=409, detail="Issue type with this name already exists")
        issue_type.name = data.name
        await db.commit()
        await db.refresh(issue_type)
        return issue_type

    @staticmethod
    async def delete(db: AsyncSession, issue_type_id: UUID) -> None:
        result = await db.execute(select(IssueType).where(IssueType.id == issue_type_id))
        issue_type = result.scalars().first()
        if not issue_type:
            raise HTTPException(status_code=404, detail="Issue type not found")
        # ON DELETE SET NULL in DB handles nullifying disputes.issue_type_id automatically
        await db.delete(issue_type)
        await db.commit()
