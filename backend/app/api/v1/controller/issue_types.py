from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.auction import User
from app.api.deps import get_admin_user
from app.schemas.issue_types import IssueTypeCreate, IssueTypeUpdate, IssueTypeResponse
from app.services.issue_type_service import IssueTypeService

router = APIRouter()


@router.get("/", response_model=List[IssueTypeResponse])
async def get_issue_types(db: AsyncSession = Depends(get_db)):
    """Public: list all issue types for the support page form."""
    return await IssueTypeService.get_all(db=db)


@router.post("/", response_model=IssueTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_issue_type(
    data: IssueTypeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await IssueTypeService.create(db=db, data=data)


@router.patch("/{id}", response_model=IssueTypeResponse)
async def update_issue_type(
    id: UUID,
    data: IssueTypeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await IssueTypeService.update(db=db, issue_type_id=id, data=data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue_type(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    await IssueTypeService.delete(db=db, issue_type_id=id)
