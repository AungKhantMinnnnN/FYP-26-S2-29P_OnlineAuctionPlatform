from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.db.session import get_db
from app.models.auction import Listing, ListingStatus
from app.schemas.auction import PaginatedAuctionResponse

router = APIRouter()

@router.get("/", response_model=PaginatedAuctionResponse)
async def get_auctions(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    listing_status: Optional[ListingStatus] = Query(None, alias="status"),
    search: Optional[str] = None
):
    query = select(Listing).options(selectinload(Listing.images))
    
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