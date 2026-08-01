from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone

from app.models.auction import (
    Listing, ListingStatus, Bid, ListingImages, Categories, ItemConditions, BiddingType,
    AuctionDuration, User, SubscriptionTier, ProhibitedKeyword, FlaggedListingAttempt,
)
from app.schemas.auction import ListingCreate, ListingUpdate
from datetime import timedelta
from app.core.storage import storage_service
from app.core.text_matching import keyword_matches
from fastapi import UploadFile
import uuid

_EXTENSION_BY_CONTENT_TYPE = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


def _sniff_image_type(file_bytes: bytes) -> Optional[str]:
    """Identify PNG/JPEG/WEBP from magic bytes, ignoring whatever the client claimed."""
    if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if file_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"WEBP":
        return "image/webp"
    return None


class AuctionService:
    @staticmethod
    async def get_auctions(
        db: AsyncSession,
        page: int,
        size: int,
        listing_status: Optional[ListingStatus],
        search: Optional[str],
        category_id: Optional[UUID] = None,
        condition: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
    ) -> Dict[str, Any]:
        query = select(Listing).options(
            selectinload(Listing.images),
            selectinload(Listing.seller)
        )

        if listing_status:
            query = query.where(Listing.status == listing_status)
        else:
            query = query.where(Listing.status.not_in([ListingStatus.draft, ListingStatus.removed]))

        if category_id:
            query = query.where(Listing.category_id == category_id)

        if search:
            query = query.where(Listing.title.ilike(f"%{search}%"))

        if condition:
            query = query.where(Listing.condition == condition)

        if min_price is not None:
            query = query.where(Listing.current_price >= min_price)

        if max_price is not None:
            query = query.where(Listing.current_price <= max_price)
            
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

    FREE_LISTING_HOURLY_LIMIT = 5

    @staticmethod
    async def _check_prohibited_keywords(
        db: AsyncSession,
        user_id: UUID,
        title: Optional[str],
        description: Optional[str],
        brand: Optional[str],
    ) -> None:
        # Applies to every listing save — draft or active — so prohibited content can't be
        # smuggled in via a draft that's never published. keyword_matches() catches direct
        # usage, symbol/leetspeak obfuscation, and minor typos — see app.core.text_matching.
        keywords = (await db.execute(select(ProhibitedKeyword.keyword))).scalars().all()
        if not keywords:
            return

        for field_name, text in (("title", title), ("description", description), ("brand", brand)):
            if not text:
                continue
            for keyword in keywords:
                if keyword_matches(keyword, text):
                    # Log the attempt before raising — this is what powers the admin's
                    # flagged-attempts view, so it must persist even though the save is rejected.
                    db.add(FlaggedListingAttempt(
                        user_id=user_id, keyword_matched=keyword, field=field_name, attempted_text=text,
                    ))
                    await db.commit()
                    raise HTTPException(
                        status_code=400,
                        detail=f"Your listing could not be saved: the {field_name} contains a "
                               f"prohibited term ('{keyword}'). Please remove it and try again.",
                    )

    @staticmethod
    async def create_listing(db: AsyncSession, user_id: UUID, listing_in: ListingCreate) -> Listing:
        user = await db.scalar(select(User).where(User.id == user_id))
        if user and user.subscription_tier == SubscriptionTier.free:
            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
            recent = await db.scalar(
                select(func.count()).select_from(Listing)
                .where(Listing.seller_id == user_id, Listing.created_at >= one_hour_ago)
            )
            if recent >= AuctionService.FREE_LISTING_HOURLY_LIMIT:
                raise HTTPException(
                    status_code=429,
                    detail=f"Free tier limit reached: you can create at most {AuctionService.FREE_LISTING_HOURLY_LIMIT} listings per hour. Upgrade to Premium for unlimited listings."
                )

        await AuctionService._check_prohibited_keywords(
            db, user_id, listing_in.title, listing_in.description, listing_in.brand
        )

        listing = Listing(
            seller_id=user_id,
            title=listing_in.title,
            description=listing_in.description,
            condition=listing_in.condition,
            brand=listing_in.brand,
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

    EDITABLE_STATUSES = (ListingStatus.draft, ListingStatus.pending_review)

    @staticmethod
    async def update_listing(db: AsyncSession, auction_id: UUID, user_id: UUID, listing_in: ListingUpdate) -> Listing:
        result = await db.execute(
            select(Listing)
            .options(selectinload(Listing.images), selectinload(Listing.seller))
            .where(Listing.id == auction_id)
        )
        listing = result.scalars().first()
        if not listing:
            raise HTTPException(status_code=404, detail="Auction listing not found")
        if listing.seller_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorised to edit this listing")
        if listing.status not in AuctionService.EDITABLE_STATUSES:
            raise HTTPException(status_code=400, detail="Only draft listings can be edited")

        data = listing_in.model_dump(exclude_unset=True, exclude={"status"})

        # Check the prospective merged values (not yet applied to `listing`) so a blocked
        # edit can't leave partial field mutations sitting on the tracked ORM object.
        await AuctionService._check_prohibited_keywords(
            db, user_id,
            data.get("title", listing.title),
            data.get("description", listing.description),
            data.get("brand", listing.brand),
        )

        for field, value in data.items():
            setattr(listing, field, value)
        if "starting_price" in data:
            listing.current_price = data["starting_price"]

        if listing.reserve_price is not None and listing.reserve_price < listing.starting_price:
            raise HTTPException(status_code=400, detail="reserve_price must be greater than or equal to starting_price")
        if listing.start_time and listing.end_time and listing.end_time <= listing.start_time:
            raise HTTPException(status_code=400, detail="end_time must be after start_time")

        if listing_in.status is not None and listing_in.status != listing.status:
            if listing_in.status == ListingStatus.ended:
                raise HTTPException(status_code=400, detail="Status 'ended' is set by the system only")
            listing.status = listing_in.status
            listing.is_draft = listing_in.status == ListingStatus.draft

        listing.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(listing)
        return listing

    @staticmethod
    async def get_user_listings(
        db: AsyncSession,
        user_id: UUID,
        page: int,
        size: int,
        listing_status: Optional[ListingStatus] = None,
    ) -> Dict[str, Any]:
        query = select(Listing).options(
            selectinload(Listing.images),
            selectinload(Listing.seller)
        ).where(Listing.seller_id == user_id)

        if listing_status:
            query = query.where(Listing.status == listing_status)
        
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
            # Read file bytes
            file_bytes = await file.read()

            # The controller already checked the client-sent Content-Type header, but
            # that header is just a client claim -- sniff the actual bytes so a
            # relabeled non-image file can't ride through as one.
            sniffed_type = _sniff_image_type(file_bytes)
            if sniffed_type is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' does not look like a valid PNG, JPEG, or WEBP image.",
                )

            # Extension is derived from the verified content, never from the client-
            # supplied filename -- a crafted filename (e.g. containing "/" or "..")
            # could otherwise inject a path into the generated S3 object key.
            ext = _EXTENSION_BY_CONTENT_TYPE[sniffed_type]
            unique_filename = f"{uuid.uuid4()}.{ext}"
            s3_key = f"listings/{auction_id}/{unique_filename}"

            # Upload to MinIO
            storage_service.upload_file(file_bytes, s3_key, sniffed_type)
            
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
    async def delete_listing(db: AsyncSession, auction_id: UUID, user_id: UUID) -> None:
        result = await db.execute(select(Listing).where(Listing.id == auction_id))
        listing = result.scalars().first()
        if not listing:
            raise HTTPException(status_code=404, detail="Auction listing not found")
        if listing.seller_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorised to delete this listing")
        if listing.status == ListingStatus.ended:
            raise HTTPException(status_code=400, detail="Cannot delete an ended auction")
        bid_count = await db.scalar(
            select(func.count()).select_from(Bid).where(Bid.listing_id == auction_id)
        )
        if bid_count:
            raise HTTPException(status_code=409, detail="Cannot delete a listing that has bids")
        listing.status = ListingStatus.removed
        listing.updated_at = datetime.now(timezone.utc)
        await db.commit()

    @staticmethod
    async def update_listing_status(
        db: AsyncSession, auction_id: UUID, user_id: UUID, new_status: ListingStatus
    ) -> Listing:
        result = await db.execute(
            select(Listing)
            .options(selectinload(Listing.images), selectinload(Listing.seller))
            .where(Listing.id == auction_id)
        )
        listing = result.scalars().first()
        if not listing:
            raise HTTPException(status_code=404, detail="Auction listing not found")
        if listing.seller_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorised to update this listing")
        if listing.status == ListingStatus.ended:
            raise HTTPException(status_code=400, detail="Cannot change the status of an ended auction")
        if new_status == ListingStatus.ended:
            raise HTTPException(status_code=400, detail="Status 'ended' is set by the system only")
        # Prevent unpublishing an active listing that already has bids
        if listing.status == ListingStatus.active and new_status in (
            ListingStatus.draft, ListingStatus.pending_review
        ):
            bid_count = await db.scalar(
                select(func.count()).select_from(Bid).where(Bid.listing_id == auction_id)
            )
            if bid_count:
                raise HTTPException(
                    status_code=409, detail="Cannot revert a listing that already has bids"
                )
        listing.status = new_status
        listing.is_draft = new_status == ListingStatus.draft
        listing.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(listing)
        return listing

    @staticmethod
    async def get_form_metadata(db: AsyncSession) -> Dict[str, Any]:
        # Fetch active categories
        query = select(Categories).where(Categories.is_active == True)
        result = await db.execute(query)
        categories = result.scalars().all()
        
        # Enums
        conditions = [{"id": e.value, "name": e.name} for e in ItemConditions]
        bidding_types = [{"id": e.value, "name": e.name} for e in BiddingType]

        # Durations from DB
        duration_result = await db.execute(
            select(AuctionDuration)
            .where(AuctionDuration.is_active == True)
            .order_by(AuctionDuration.sort_order)
        )
        durations = duration_result.scalars().all()

        return {
            "categories": categories,
            "conditions": conditions,
            "biddingTypes": bidding_types,
            "durations": durations,
        }
