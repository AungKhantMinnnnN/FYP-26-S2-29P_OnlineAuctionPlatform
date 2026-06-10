from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID
from app.db.session import get_db
from app.models.auction import ListingStatus
from app.schemas.auction import PaginatedAuctionResponse, AuctionListingResponse, BidResponse
from app.services.auction_service import AuctionService

router = APIRouter()

@router.get("/", response_model=PaginatedAuctionResponse)
async def get_auctions(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    listing_status: Optional[ListingStatus] = Query(None, alias="status"),
    search: Optional[str] = None
):
    return await AuctionService.get_auctions(
        db=db,
        page=page,
        size=size,
        listing_status=listing_status,
        search=search
    )

@router.get("/{id}", response_model=AuctionListingResponse)
async def get_auction(id: UUID, db: AsyncSession = Depends(get_db)):
    return await AuctionService.get_auction(db=db, auction_id=id)

@router.get("/{id}/bids", response_model=List[BidResponse])
async def get_auction_bids(id: UUID, db: AsyncSession = Depends(get_db)):
    return await AuctionService.get_auction_bids(db=db, auction_id=id)