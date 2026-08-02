from fastapi import APIRouter, BackgroundTasks, Depends, Query, status, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID
from app.db.session import get_db
from app.models.auction import ListingStatus, User, InteractionAction
from app.api.deps import get_current_user, get_optional_user
from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.schemas.auction import PaginatedAuctionResponse, AuctionListingResponse, BidResponse, ListingCreate, ListingUpdate, ListingImageResponse, MetadataResponse, ListingStatusUpdate
from app.services.auction_service import AuctionService
from app.services.interaction_service import log_interaction, log_search_interactions

router = APIRouter()

@router.get("/form_metadata", response_model=MetadataResponse)
async def get_form_metadata(db: AsyncSession = Depends(get_db)):
    return await AuctionService.get_form_metadata(db=db)

@router.get("/", response_model=PaginatedAuctionResponse)
async def get_auctions(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    listing_status: Optional[ListingStatus] = Query(None, alias="status"),
    category_id: Optional[UUID] = Query(None),
    search: Optional[str] = None,
    condition: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    current_user: Optional[User] = Depends(get_optional_user),
):
    result = await AuctionService.get_auctions(
        db=db,
        page=page,
        size=size,
        listing_status=listing_status,
        category_id=category_id,
        search=search,
        condition=condition,
        min_price=min_price,
        max_price=max_price,
    )
    if current_user and search and result.get("items"):
        listing_ids = [item.id for item in result["items"]]
        background_tasks.add_task(log_search_interactions, current_user.id, listing_ids)
    return result

@router.post("/create_listing", response_model=AuctionListingResponse, status_code=status.HTTP_201_CREATED,
              dependencies=[Depends(rate_limiter("create-listing", limit=settings.RATE_LIMIT_CREATE_LISTING, window_seconds=60))])
async def create_listing(
    listing_in: ListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await AuctionService.create_listing(db=db, user_id=current_user.id, listing_in=listing_in)

@router.patch("/{id}", response_model=AuctionListingResponse)
async def update_listing(
    id: UUID,
    listing_in: ListingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await AuctionService.update_listing(db=db, auction_id=id, user_id=current_user.id, listing_in=listing_in)

@router.post("/upload_auction_images/{id}", response_model=List[ListingImageResponse])
async def upload_auction_images(
    id: UUID,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed_content_types = {"image/png", "image/jpeg", "image/webp"}
    for file in files:
        if file.content_type not in allowed_content_types:
            raise HTTPException(status_code=400, detail="Only PNG, JPG, and WEBP images are supported")
            
    return await AuctionService.upload_listing_images(
        db=db,
        user_id=current_user.id,
        auction_id=id,
        files=files
    )

@router.get("/get_user_listings", response_model=PaginatedAuctionResponse)
async def get_user_listings(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    listing_status: Optional[ListingStatus] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user)
):
    return await AuctionService.get_user_listings(
        db=db,
        user_id=current_user.id,
        page=page,
        size=size,
        listing_status=listing_status
    )

@router.get("/get_auction/{id}", response_model=AuctionListingResponse)
async def get_auction(
    id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    listing = await AuctionService.get_auction(db=db, auction_id=id)
    if current_user:
        background_tasks.add_task(log_interaction, current_user.id, id, InteractionAction.view)
    return listing

@router.get("/get_auction_bids/{id}/bids", response_model=List[BidResponse])
async def get_auction_bids(id: UUID, db: AsyncSession = Depends(get_db)):
    return await AuctionService.get_auction_bids(db=db, auction_id=id)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await AuctionService.delete_listing(db=db, auction_id=id, user_id=current_user.id)

@router.post("/{id}/status", response_model=AuctionListingResponse)
async def update_listing_status(
    id: UUID,
    body: ListingStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await AuctionService.update_listing_status(
        db=db, auction_id=id, user_id=current_user.id, new_status=body.status
    )