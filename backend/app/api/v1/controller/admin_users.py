import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_admin_user
from app.db.session import get_db
from app.models.auction import User, UserStatus
from app.schemas.admin_user import (
    AdminUserDetails,
    AdminUsersResponse,
    SuspendUserRequest,
)
from app.services.admin_user_service import AdminUserService


router = APIRouter()


@router.get(
    "/",
    response_model=AdminUsersResponse,
)
async def get_users(
    search: str = Query(
        default="",
        max_length=255,
        description="Search by username, email or full name",
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    size: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    status_filter: Optional[UserStatus] = Query(
        default=None,
        alias="status",
    ),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    return await AdminUserService.get_users(
        db=db,
        search=search,
        page=page,
        size=size,
        status_filter=status_filter,
    )


@router.get(
    "/{user_id}",
    response_model=AdminUserDetails,
)
async def get_user_by_id(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    return await AdminUserService.get_user_by_id(
        db=db,
        user_id=user_id,
    )


@router.patch(
    "/{user_id}/suspend",
    response_model=AdminUserDetails,
)
async def suspend_user(
    user_id: uuid.UUID,
    request: SuspendUserRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    return await AdminUserService.suspend_user(
        db=db,
        admin=current_admin,
        user_id=user_id,
        reason=request.reason,
    )


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    await AdminUserService.delete_user(
        db=db,
        admin=current_admin,
        user_id=user_id,
    )

    return None