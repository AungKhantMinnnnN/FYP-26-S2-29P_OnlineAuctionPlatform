import datetime
import uuid
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.auction import (
    Listing, ListingStatus, Bid, AuctionResult, Watchlist, CollectorBoard, BoardItem,
    UserInteraction, UserInterest, UserProfiles,
)
from app.services import trending
from app.services.location import parse_location


def _primary_image_url(listing: Listing) -> str | None:
    if not listing.images:
        return None
    primary = next((img for img in listing.images if img.is_primary), None) or listing.images[0]
    return f"{settings.S3_PUBLIC_URL}/{primary.s3_key}"


async def get_trending(db: AsyncSession, user_id: uuid.UUID | None = None, limit: int = 20) -> tuple[list[dict], bool]:
    """Returns (items, personalized)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    window_start = now - datetime.timedelta(days=trending.TRENDING_WINDOW_DAYS)

    # --- Candidate listings (include brand + condition_confidence) ---
    listings_result = await db.execute(
        select(
            Listing.id, Listing.title, Listing.current_price, Listing.end_time,
            Listing.category_id, Listing.brand, Listing.condition_confidence,
        )
        .where(Listing.status == ListingStatus.active)
        .where(Listing.is_draft.is_(False))
        .where(Listing.end_time > now)
    )
    listings_df = pd.DataFrame(listings_result.mappings().all())
    if listings_df.empty:
        return [], False

    active_ids = listings_df["id"].tolist()

    # --- user_interactions (existing signal) ---
    interactions_result = await db.execute(
        select(
            UserInteraction.listing_id,
            UserInteraction.action,
            UserInteraction.user_id,
            UserProfiles.dob,
            UserProfiles.address,
        )
        .outerjoin(UserProfiles, UserProfiles.user_id == UserInteraction.user_id)
        .where(UserInteraction.occurred_at >= window_start)
        .where(UserInteraction.listing_id.in_(active_ids))
    )
    interactions_df = pd.DataFrame(
        interactions_result.mappings().all(),
        columns=["listing_id", "action", "user_id", "dob", "address"],
    )
    if not interactions_df.empty:
        interactions_df["action"] = interactions_df["action"].apply(
            lambda a: a.value if hasattr(a, "value") else a
        )

    # --- bids on active listings (stronger explicit bid signal) ---
    bids_result = await db.execute(
        select(Bid.listing_id, Bid.bidder_id, UserProfiles.dob, UserProfiles.address)
        .outerjoin(UserProfiles, UserProfiles.user_id == Bid.bidder_id)
        .where(Bid.placed_at >= window_start)
        .where(Bid.listing_id.in_(active_ids))
    )
    bids_rows = bids_result.mappings().all()
    if bids_rows:
        bids_df = pd.DataFrame(bids_rows, columns=["listing_id", "user_id", "dob", "address"])
        bids_df["action"] = "bid_placed"
        interactions_df = pd.concat([interactions_df, bids_df], ignore_index=True)

    # --- watchlist entries on active listings ---
    watchlist_result = await db.execute(
        select(Watchlist.listing_id, Watchlist.user_id, UserProfiles.dob, UserProfiles.address)
        .outerjoin(UserProfiles, UserProfiles.user_id == Watchlist.user_id)
        .where(Watchlist.listing_id.in_(active_ids))
    )
    watchlist_rows = watchlist_result.mappings().all()
    if watchlist_rows:
        wl_df = pd.DataFrame(watchlist_rows, columns=["listing_id", "user_id", "dob", "address"])
        wl_df["action"] = "watchlist_active"
        interactions_df = pd.concat([interactions_df, wl_df], ignore_index=True)

    # --- per-user enrichment: segment, category, and RCBF content signals ---
    segment_df = await _segment_interactions(db, user_id, interactions_df)
    category_df = await _category_interactions(db, user_id, interactions_df, listings_df)
    user_brands = await _user_brands(db, user_id, interactions_df, listings_df)
    user_price = await _user_price_profile(db, user_id, interactions_df, listings_df)

    ranked = trending.rank_listings(
        listings_df, interactions_df, now,
        segment_df, category_df,
        user_brands=user_brands,
        user_median_price=user_price,
        user_id=user_id,
    )
    top = ranked.head(limit)[["id", "score"]]
    score_map = dict(zip(top["id"], top["score"]))

    full_result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.images), selectinload(Listing.seller))
        .where(Listing.id.in_(list(score_map.keys())))
    )
    full_listings = {l.id: l for l in full_result.scalars().all()}

    items = []
    for listing_id, score in score_map.items():
        listing = full_listings.get(listing_id)
        if not listing:
            continue
        items.append({
            "id": listing.id,
            "seller_id": listing.seller_id,
            "category_id": listing.category_id,
            "title": listing.title,
            "description": listing.description,
            "brand": listing.brand,
            "condition": listing.condition.value,
            "condition_confidence": listing.condition_confidence,
            "bidding_type": listing.bidding_type.value,
            "starting_price": listing.starting_price,
            "reserve_price": listing.reserve_price,
            "current_price": listing.current_price,
            "min_increment": listing.min_increment,
            "status": listing.status.value,
            "is_draft": listing.is_draft,
            "start_time": listing.start_time,
            "end_time": listing.end_time,
            "created_at": listing.created_at,
            "updated_at": listing.updated_at,
            "images": [
                {
                    "id": img.id,
                    "s3_key": img.s3_key,
                    "sort_order": img.sort_order,
                    "is_primary": img.is_primary,
                    "image_url": f"{settings.S3_PUBLIC_URL}/{img.s3_key}",
                }
                for img in listing.images
            ],
            "seller": {
                "id": listing.seller.id,
                "username": listing.seller.username,
                "email": listing.seller.email,
            } if listing.seller else None,
            "score": score,
        })

    has_cf = user_id is not None and not interactions_df.empty and user_id in interactions_df["user_id"].values
    return items, (segment_df is not None or category_df is not None or bool(user_brands) or user_price is not None or has_cf)


async def _segment_interactions(
    db: AsyncSession, user_id: uuid.UUID | None, interactions_df: pd.DataFrame
) -> pd.DataFrame | None:
    if user_id is None or interactions_df.empty:
        return None

    profile_result = await db.execute(
        select(UserProfiles.dob, UserProfiles.address).where(UserProfiles.user_id == user_id)
    )
    profile = profile_result.mappings().first()
    if not profile or (profile["dob"] is None and not profile["address"]):
        return None

    user_age_group = trending.age_group(profile["dob"])
    user_city = parse_location(profile["address"])["city"] if profile["address"] else None

    df = interactions_df.copy()
    df["age_group"] = df["dob"].apply(trending.age_group)
    df["city"] = df["address"].apply(lambda a: parse_location(a)["city"] if a else None)

    mask = pd.Series(False, index=df.index)
    if user_age_group:
        mask |= df["age_group"] == user_age_group
    if user_city:
        mask |= df["city"] == user_city
    return df[mask] if mask.any() else None


async def _category_interactions(
    db: AsyncSession, user_id: uuid.UUID | None, interactions_df: pd.DataFrame, listings_df: pd.DataFrame
) -> pd.DataFrame | None:
    if user_id is None:
        return None

    # Behavioral history: categories from all signals (interactions + bids + watchlist)
    user_history = interactions_df[interactions_df["user_id"] == user_id] if not interactions_df.empty else pd.DataFrame()

    user_categories: set = set()

    if not user_history.empty:
        merged = user_history.merge(
            listings_df[["id", "category_id"]], left_on="listing_id", right_on="id", how="left"
        )
        user_categories = set(merged["category_id"].dropna().unique())

    # Wins: categories from auction results
    if not user_categories:
        wins_result = await db.execute(
            select(Listing.category_id)
            .join(AuctionResult, AuctionResult.listing_id == Listing.id)
            .where(AuctionResult.winner_id == user_id)
            .where(Listing.category_id.isnot(None))
            .distinct()
        )
        user_categories = {row[0] for row in wins_result.all()}

    # Board items: categories from curated items
    if not user_categories:
        board_result = await db.execute(
            select(Listing.category_id)
            .join(AuctionResult, AuctionResult.listing_id == Listing.id)
            .join(BoardItem, BoardItem.auction_result_id == AuctionResult.id)
            .join(CollectorBoard, CollectorBoard.id == BoardItem.board_id)
            .where(CollectorBoard.user_id == user_id)
            .where(Listing.category_id.isnot(None))
            .distinct()
        )
        user_categories = {row[0] for row in board_result.all()}

    # Cold-start fallback: onboarding interests
    if not user_categories:
        interests_result = await db.execute(
            select(UserInterest.category_id).where(UserInterest.user_id == user_id).distinct()
        )
        user_categories = {row[0] for row in interests_result.all()}

    if not user_categories:
        return None

    merged = interactions_df.merge(
        listings_df[["id", "category_id"]], left_on="listing_id", right_on="id", how="left"
    )
    category_df = merged[merged["category_id"].isin(user_categories)]
    return category_df if not category_df.empty else None


async def _user_brands(
    db: AsyncSession, user_id: uuid.UUID | None, interactions_df: pd.DataFrame, listings_df: pd.DataFrame
) -> set:
    """Collect all brands from the user's interaction history, wins, and board items."""
    if user_id is None:
        return set()

    brands: set = set()

    # From current window interactions (active listings only — has brand column)
    if not interactions_df.empty:
        user_rows = interactions_df[interactions_df["user_id"] == user_id]
        if not user_rows.empty:
            merged = user_rows.merge(
                listings_df[["id", "brand"]], left_on="listing_id", right_on="id", how="left"
            )
            brands.update(merged["brand"].dropna().unique())

    # From all-time bid history (ended listings too)
    bids_brand_result = await db.execute(
        select(Listing.brand)
        .join(Bid, Bid.listing_id == Listing.id)
        .where(Bid.bidder_id == user_id)
        .where(Listing.brand.isnot(None))
        .distinct()
    )
    brands.update(row[0] for row in bids_brand_result.all())

    # From auction wins
    wins_brand_result = await db.execute(
        select(Listing.brand)
        .join(AuctionResult, AuctionResult.listing_id == Listing.id)
        .where(AuctionResult.winner_id == user_id)
        .where(Listing.brand.isnot(None))
        .distinct()
    )
    brands.update(row[0] for row in wins_brand_result.all())

    # From board-curated items
    board_brand_result = await db.execute(
        select(Listing.brand)
        .join(AuctionResult, AuctionResult.listing_id == Listing.id)
        .join(BoardItem, BoardItem.auction_result_id == AuctionResult.id)
        .join(CollectorBoard, CollectorBoard.id == BoardItem.board_id)
        .where(CollectorBoard.user_id == user_id)
        .where(Listing.brand.isnot(None))
        .distinct()
    )
    brands.update(row[0] for row in board_brand_result.all())

    return brands


async def _user_price_profile(
    db: AsyncSession,
    user_id: uuid.UUID | None,
    interactions_df: pd.DataFrame,
    listings_df: pd.DataFrame,
) -> float | None:
    """Median price the user has engaged with. Bid amounts are the primary signal (strongest
    commitment); falls back to current_price of listings in the interaction window."""
    if user_id is None:
        return None

    # Primary: all-time bid amounts (what user actually committed to paying)
    bid_result = await db.execute(
        select(Bid.amount).where(Bid.bidder_id == user_id).limit(200)
    )
    amounts = [row[0] for row in bid_result.all()]

    # Fallback: current prices of listings the user interacted with this window
    if not amounts and not interactions_df.empty:
        user_rows = interactions_df[interactions_df["user_id"] == user_id]
        if not user_rows.empty:
            merged = user_rows.merge(
                listings_df[["id", "current_price"]], left_on="listing_id", right_on="id", how="left"
            )
            amounts = merged["current_price"].dropna().tolist()

    if not amounts:
        return None

    return float(pd.Series(amounts).median())
