from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date
from uuid import UUID

from app.db.session import get_db
from app.models.auction import User, UserStatus, UserRole, ListingStatus, ItemConditions
from app.api.deps import get_admin_user
from app.schemas.admin import (
    AdminUsersResponse, AdminUserDetails, SuspendUserRequest, CategoryCreate, CategoryUpdate,
    CategoryDeleteResponse, BidCancelResponse, AuctionRestartRequest,
    AdminLogsResponse, AdminStatsResponse, SystemLogsResponse,
    ProhibitedKeywordCreate, ProhibitedKeywordResponse, FlaggedAttemptsResponse,
    AdminListingDetailResponse, AdminListingsResponse, OptionItem,
)
from app.schemas.auction import AuctionListingResponse, CategoryResponse
from app.services.admin_service import AdminService

router = APIRouter()


# region Users
@router.get("/users", response_model=AdminUsersResponse)
async def list_users(
    search: Optional[str] = Query(None),
    user_status: Optional[UserStatus] = Query(None, alias="status"),
    role: Optional[UserRole] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.get_users(
        db=db, search=search, status_filter=user_status, role_filter=role, page=page, size=size,
    )


@router.get("/users/{id}", response_model=AdminUserDetails)
async def get_user(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.get_user_by_id(db=db, user_id=id)


@router.patch("/users/{id}/suspend", response_model=AdminUserDetails)
async def suspend_user(
    id: UUID,
    data: SuspendUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await AdminService.suspend_user(db=db, admin=admin, user_id=id, reason=data.reason)


@router.patch("/users/{id}/unsuspend", response_model=AdminUserDetails)
async def unsuspend_user(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await AdminService.unsuspend_user(db=db, admin=admin, user_id=id)


@router.delete("/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    await AdminService.delete_user(db=db, admin=admin, user_id=id)
# endregion


# region Listings
@router.get("/listings", response_model=AdminListingsResponse)
async def list_listings(
    listing_status: Optional[ListingStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    category_id: Optional[UUID] = Query(None),
    condition: Optional[ItemConditions] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.get_listings(
        db=db, listing_status=listing_status, search=search, page=page, size=size,
        category_id=category_id, condition=condition,
    )


@router.get("/listings/{id}", response_model=AdminListingDetailResponse)
async def get_listing_detail(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.get_listing_detail(db=db, listing_id=id)


@router.patch("/listings/{id}/approve", response_model=AuctionListingResponse)
async def approve_listing(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await AdminService.approve_listing(db=db, admin=admin, listing_id=id)


@router.patch("/listings/{id}/remove", response_model=AuctionListingResponse)
async def remove_listing(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await AdminService.remove_listing(db=db, admin=admin, listing_id=id)


@router.post("/listings/{id}/restart", response_model=AuctionListingResponse)
async def restart_auction(
    id: UUID,
    data: AuctionRestartRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await AdminService.restart_auction(db=db, admin=admin, listing_id=id, new_end_time=data.end_time)
# endregion


# region Categories
@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.get_categories(db=db)


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.create_category(db=db, data=data)


@router.patch("/categories/{id}", response_model=CategoryResponse)
async def update_category(
    id: UUID,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.update_category(db=db, category_id=id, data=data)


@router.delete("/categories/{id}", response_model=CategoryDeleteResponse)
async def delete_category(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await AdminService.delete_category(db=db, admin=admin, category_id=id)
# endregion


# region Bids
@router.delete("/bids/{id}", response_model=BidCancelResponse)
async def cancel_bid(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await AdminService.cancel_bid(db=db, admin=admin, bid_id=id)
# endregion


# region Content moderation
@router.get("/prohibited-keywords", response_model=List[ProhibitedKeywordResponse])
async def list_prohibited_keywords(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.get_prohibited_keywords(db=db)


@router.post("/prohibited-keywords", response_model=ProhibitedKeywordResponse, status_code=status.HTTP_201_CREATED)
async def create_prohibited_keyword(
    data: ProhibitedKeywordCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await AdminService.create_prohibited_keyword(db=db, admin=admin, keyword=data.keyword, category=data.category)


@router.delete("/prohibited-keywords/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prohibited_keyword(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    await AdminService.delete_prohibited_keyword(db=db, admin=admin, keyword_id=id)


@router.get("/flagged-attempts", response_model=FlaggedAttemptsResponse)
async def list_flagged_attempts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.get_flagged_attempts(db=db, page=page, size=size)
# endregion


# region Logs & stats
@router.get("/options/{set_key}", response_model=List[OptionItem])
async def get_options(
    set_key: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.get_options(db=db, set_key=set_key)


@router.get("/system-logs", response_model=SystemLogsResponse)
async def get_system_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    day: Optional[date] = Query(None, description="Filter to a single day (YYYY-MM-DD)"),
    level: Optional[str] = Query(None, description="info | warning | error"),
    service: Optional[str] = Query(None, description="backend | bidding-engine | recommendation-engine"),
    _: User = Depends(get_admin_user),
):
    return AdminService.get_system_logs(page=page, size=size, day=day, level=level, service=service)


@router.get("/logs", response_model=AdminLogsResponse)
async def get_admin_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin_id: Optional[UUID] = Query(None),
    action: Optional[str] = Query(None),
    day: Optional[date] = Query(None, description="Filter to a single day (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.get_logs(db=db, page=page, size=size, admin_id=admin_id, action=action, day=day)


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService.get_stats(db=db)
# endregion
