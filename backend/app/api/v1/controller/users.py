import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.auction import User
from app.schemas.user import (
    BidHistoryResponse, PurchasesResponse, WatchlistResponse,
    WatchlistAddRequest, WatchlistAddResponse, WalletResponse,
    SubscriptionActionRequest, SubscriptionResponse,
    ProfileUpdateRequest, ProfileResponse, InterestsResponse,
)
from app.services.user_service import UserService

router = APIRouter()


@router.post("/me/profile", response_model=ProfileResponse)
async def update_profile(
    data: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UserService.update_profile(db=db, user=current_user, data=data.model_dump(exclude_none=True))


@router.get("/me/interests", response_model=InterestsResponse)
async def get_my_interests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await UserService.get_interests(db=db, user_id=current_user.id)
    return {"items": items}


@router.get("/me/bids", response_model=BidHistoryResponse)
async def get_my_bids(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    result: Literal["all", "won", "outbid"] = Query("all"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UserService.get_my_bids(db=db, user=current_user, page=page, size=size, result_filter=result)


@router.get("/me/purchases", response_model=PurchasesResponse)
async def get_my_purchases(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UserService.get_my_purchases(db=db, user=current_user, page=page, size=size)


@router.get("/me/watchlist", response_model=WatchlistResponse)
async def get_my_watchlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UserService.get_my_watchlist(db=db, user=current_user)


@router.post("/me/watchlist", response_model=WatchlistAddResponse, status_code=status.HTTP_200_OK)
async def add_to_watchlist(
    request: WatchlistAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = await UserService.add_to_watchlist(db=db, user=current_user, listing_id=request.listing_id)
    return WatchlistAddResponse(
        watchlist_id=item.id,
        listing_id=item.listing_id,
        added_at=item.added_at,
    )


@router.delete("/me/watchlist/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await UserService.remove_from_watchlist(db=db, user=current_user, listing_id=listing_id)
    return None


@router.get("/me/wallet", response_model=WalletResponse)
async def get_my_wallet(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UserService.get_my_wallet(db=db, user=current_user, page=page, size=size)


@router.post("/me/subscription", response_model=SubscriptionResponse)
async def manage_subscription(
    request: SubscriptionActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UserService.manage_subscription(db=db, user=current_user, action=request.action)
