from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID
from app.db.session import get_db
from app.models.auction import Listing, ListingStatus, Bid
from app.schemas.auction import PaginatedAuctionResponse, AuctionListingResponse, BidResponse

router = APIRouter()

@router.get("/", response_model=PaginatedAuctionResponse)
async def get_auctions(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    listing_status: Optional[ListingStatus] = Query(None, alias="status"),
    search: Optional[str] = None
):
    query = select(Listing).options(
        selectinload(Listing.images),
        selectinload(Listing.seller)
    )
    
    if listing_status:
        query = query.where(Listing.status == listing_status)
        
    if search:
        query = query.where(Listing.title.ilike(f"%{search}%"))
        
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Pagination
    query = query.order_by(Listing.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)
    
    result = await db.execute(query)
    listings = result.scalars().all()
    
    pages = (total + size - 1) // size if total > 0 else 0
        
    return {
        "items": listings,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.get("/{id}", response_model=AuctionListingResponse)
async def get_auction(id: UUID, db: AsyncSession = Depends(get_db)):
    query = select(Listing).options(
        selectinload(Listing.images),
        selectinload(Listing.seller)
    ).where(Listing.id == id)
    
    result = await db.execute(query)
    listing = result.scalars().first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Auction listing not found")
        
    return listing

@router.get("/{id}/bids", response_model=List[BidResponse])
async def get_auction_bids(id: UUID, db: AsyncSession = Depends(get_db)):
    query = select(Bid).options(
        selectinload(Bid.bidder)
    ).where(Bid.listing_id == id).order_by(Bid.amount.desc())
    
    result = await db.execute(query)
    return result.scalars().all()