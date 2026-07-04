from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone

from app.models.auction import Listing, ListingStatus, Bid, ListingImages, Categories, ItemConditions, BiddingType
from app.schemas.auction import ListingCreate
from app.core.storage import storage_service
from fastapi import UploadFile
import uuid

class AuctionService:
    @staticmethod
    async def get_auctions(
        db: AsyncSession,
        page: int,
        size: int,
        listing_status: Optional[ListingStatus],
        search: Optional[str]
    ) -> Dict[str, Any]:
        query = select(Listing).options(
            selectinload(Listing.images),
            selectinload(Listing.seller)
        )
        
        if listing_status:
            query = query.where(Listing.status == listing_status)
        else:
            query = query.where(Listing.status != ListingStatus.draft)
            
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

    @staticmethod
    async def get_auction(db: AsyncSession, auction_id: UUID) -> Listing:
        query = select(Listing).options(
            selectinload(Listing.images),
            selectinload(Listing.seller)
        ).where(Listing.id == auction_id)
        
        result = await db.execute(query)
        listing = result.scalars().first()
        
        if not listing:
            raise HTTPException(status_code=404, detail="Auction listing not found")
            
        return listing

    @staticmethod
    async def get_auction_bids(db: AsyncSession, auction_id: UUID) -> List[Bid]:
        query = select(Bid).options(
            selectinload(Bid.bidder)
        ).where(Bid.listing_id == auction_id).order_by(Bid.amount.desc())
        
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create_listing(db: AsyncSession, user_id: UUID, listing_in: ListingCreate) -> Listing:
        listing = Listing(
            seller_id=user_id,
            title=listing_in.title,
            description=listing_in.description,
            condition=listing_in.condition,
            bidding_type=listing_in.bidding_type,
            starting_price=listing_in.starting_price,
            current_price=listing_in.starting_price,
            reserve_price=listing_in.reserve_price,
            min_increment=listing_in.min_increment,
            start_time=listing_in.start_time,
            end_time=listing_in.end_time,
            category_id=listing_in.category_id,
            status=listing_in.status or ListingStatus.active
        )
        db.add(listing)
        await db.commit()
        await db.refresh(listing)
        return listing

    @staticmethod
    async def get_user_listings(
        db: AsyncSession,
        user_id: UUID,
        page: int,
        size: int
    ) -> Dict[str, Any]:
        query = select(Listing).options(
            selectinload(Listing.images),
            selectinload(Listing.seller)
        ).where(Listing.seller_id == user_id)
        
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

    @staticmethod
    async def upload_listing_images(
        db: AsyncSession,
        user_id: UUID,
        auction_id: UUID,
        files: List[UploadFile]
    ) -> List[ListingImages]:
        # 1. Fetch listing
        query = select(Listing).options(selectinload(Listing.images)).where(Listing.id == auction_id)
        result = await db.execute(query)
        listing = result.scalars().first()
        
        if not listing:
            raise HTTPException(status_code=404, detail="Auction listing not found")
            
        if listing.seller_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to upload images for this listing")
            
        uploaded_images = []
        current_images_count = len(listing.images)
        
        for index, file in enumerate(files):
            # Generate unique object name
            ext = file.filename.split('.')[-1] if '.' in file.filename else ''
            unique_filename = f"{uuid.uuid4()}.{ext}"
            s3_key = f"listings/{auction_id}/{unique_filename}"
            
            # Read file bytes
            file_bytes = await file.read()
            
            # Upload to MinIO
            storage_service.upload_file(file_bytes, s3_key, file.content_type)
            
            # Create DB record
            is_primary = (current_images_count == 0 and index == 0)
            sort_order = current_images_count + index
            
            listing_image = ListingImages(
                listing_id=auction_id,
                s3_key=s3_key,
                sort_order=sort_order,
                is_primary=is_primary
            )
            db.add(listing_image)
            uploaded_images.append(listing_image)
            
        await db.commit()
        for img in uploaded_images:
            await db.refresh(img)
            
        return uploaded_images

    @staticmethod
    async def get_form_metadata(db: AsyncSession) -> Dict[str, Any]:
        # Fetch active categories
        query = select(Categories).where(Categories.is_active == True)
        result = await db.execute(query)
        categories = result.scalars().all()
        
        # Enums
        conditions = [{"id": e.value, "name": e.name} for e in ItemConditions]
        bidding_types = [{"id": e.value, "name": e.name} for e in BiddingType]
        
        return {
            "categories": categories,
            "conditions": conditions,
            "biddingTypes": bidding_types
        }
