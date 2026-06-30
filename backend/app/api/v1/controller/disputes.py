from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.db.session import get_db
from app.models.auction import User, DisputeStatus
from app.api.deps import get_current_user, get_admin_user
from uuid import UUID
from app.schemas.disputes import DisputeCreate, DisputeResolveRequest, DisputeResponse
from app.services.dispute_service import DisputeService

router = APIRouter()


@router.get("/", response_model=List[DisputeResponse])
async def list_all_disputes(
    dispute_status: Optional[DisputeStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin: all disputes across all users, optional ?status filter."""
    return await DisputeService.get_disputes(db=db, dispute_status=dispute_status)


@router.get("/me", response_model=List[DisputeResponse])
async def get_my_disputes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """User: own submitted disputes with current resolution status."""
    return await DisputeService.get_user_disputes(db=db, user_id=current_user.id)


@router.post("/{id}/respond", response_model=DisputeResponse)
async def respond_to_dispute(
    id: UUID,
    data: DisputeResolveRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    """Admin: update dispute status and add a resolution note."""
    return await DisputeService.resolve_dispute(
        db=db, dispute_id=id, admin_id=current_admin.id, data=data
    )


@router.post("/", response_model=DisputeResponse, status_code=status.HTTP_201_CREATED)
async def create_dispute(
    data: DisputeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DisputeService.create_dispute(
        db=db, reporter_id=current_user.id, data=data
    )
