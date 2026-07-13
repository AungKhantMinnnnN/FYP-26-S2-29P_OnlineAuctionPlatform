import datetime
import logging
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
from app.services import trending, cache_service
from app.services.location import parse_location

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# DataFrame cast helpers — undo JSON serialisation side-effects
# ---------------------------------------------------------------------------

def _cast_listings_df(df: pd.DataFrame) -> pd.DataFrame:
    """Restore UUID types lost during JSON round-trip."""
    df["id"] = df["id"].apply(lambda x: uuid.UUID(x) if pd.notna(x) and x else None)
    df["category_id"] = df["category_id"].apply(lambda x: uuid.UUID(x) if pd.notna(x) and x else None)
    return df


def _cast_interactions_df(df: pd.DataFrame) -> pd.DataFrame:
    """Restore UUID and date types lost during JSON round-trip."""
    df["listing_id"] = df["listing_id"].apply(lambda x: uuid.UUID(x) if pd.notna(x) and x else None)
    df["user_id"] = df["user_id"].apply(lambda x: uuid.UUID(x) if pd.notna(x) and x else None)

    def _parse_dob(val):
        if not val or (isinstance(val, float) and pd.isna(val)):
            return None
        try:
            return datetime.date.fromisoformat(str(val)[:10])
        except (ValueError, TypeError):
            return None

    df["dob"] = df["dob"].apply(_parse_dob)
    return df


# ---------------------------------------------------------------------------
# DB fetch helpers — called on cache miss only
# ---------------------------------------------------------------------------

async def _fetch_listings(db: AsyncSession, now: datetime.datetime) -> pd.DataFrame:
    logger.info("_fetch_listings: querying DB")
    result = await db.execute(
        select(
            Listing.id, Listing.title, Listing.current_price, Listing.end_time,
            Listing.category_id, Listing.brand, Listing.condition_confidence,
        )
        .where(Listing.status == ListingStatus.active)
        .where(Listing.is_draft.is_(False))
        .where(Listing.end_time > now)
    )
    df = pd.DataFrame(result.mappings().all())
    logger.info("_fetch_listings: %d active listings fetched", len(df))
    return df


async def _fetch_interactions(
    db: AsyncSession, active_ids: list, window_start: datetime.datetime
) -> pd.DataFrame:
    logger.info("_fetch_interactions: querying DB")

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
    df = pd.DataFrame(
        interactions_result.mappings().all(),
        columns=["listing_id", "action", "user_id", "dob", "address"],
    )
    if not df.empty:
        df["action"] = df["action"].apply(lambda a: a.value if hasattr(a, "value") else a)
    logger.info("_fetch_interactions: %d user_interaction rows", len(df))

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
        df = pd.concat([df, bids_df], ignore_index=True)
        logger.info("_fetch_interactions: +%d bid_placed rows (total=%d)", len(bids_df), len(df))

    watchlist_result = await db.execute(
        select(Watchlist.listing_id, Watchlist.user_id, UserProfiles.dob, UserProfiles.address)
        .outerjoin(UserProfiles, UserProfiles.user_id == Watchlist.user_id)
        .where(Watchlist.listing_id.in_(active_ids))
    )
    watchlist_rows = watchlist_result.mappings().all()
    if watchlist_rows:
        wl_df = pd.DataFrame(watchlist_rows, columns=["listing_id", "user_id", "dob", "address"])
        wl_df["action"] = "watchlist_active"
        df = pd.concat([df, wl_df], ignore_index=True)
        logger.info("_fetch_interactions: +%d watchlist_active rows (total=%d)", len(wl_df), len(df))

    return df


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def get_trending(
    db: AsyncSession, user_id: uuid.UUID | None = None, limit: int = 20
) -> tuple[list[dict], bool]:
    """Returns (items, personalized)."""
    logger.info("get_trending: start — user_id=%s limit=%d", user_id, limit)

    # Anonymous short-circuit — serve pre-scored result directly from cache
    if user_id is None:
        cached = await cache_service.get_json(f"recs:anonymous:{limit}")
        if cached is not None:
            logger.info("get_trending: anonymous cache HIT — returning %d items", len(cached))
            return cached, False

    now = datetime.datetime.now(datetime.timezone.utc)
    window_start = now - datetime.timedelta(days=trending.TRENDING_WINDOW_DAYS)

    # --- listings_df (cache-first) ---
    listings_df = await cache_service.get_df("recs:global:listings")
    if listings_df is not None:
        listings_df = _cast_listings_df(listings_df)
    else:
        listings_df = await _fetch_listings(db, now)
        await cache_service.set_df("recs:global:listings", listings_df, settings.RECS_LISTINGS_CACHE_TTL)

    if listings_df.empty:
        logger.info("get_trending: no active listings — returning empty")
        return [], False

    active_ids = listings_df["id"].tolist()
    logger.info("get_trending: %d candidate listings", len(active_ids))

    # --- interactions_df (cache-first) ---
    interactions_df = await cache_service.get_df("recs:global:interactions")
    if interactions_df is not None:
        interactions_df = _cast_interactions_df(interactions_df)
    else:
        interactions_df = await _fetch_interactions(db, active_ids, window_start)
        await cache_service.set_df("recs:global:interactions", interactions_df, settings.RECS_INTERACTIONS_CACHE_TTL)

    logger.info(
        "get_trending: interactions_df=%d rows, %d distinct listings",
        len(interactions_df),
        interactions_df["listing_id"].nunique() if not interactions_df.empty else 0,
    )

    # --- per-user enrichment ---
    # segment + category: fast pandas ops on the already-loaded interactions_df — not cached
    segment_df = await _segment_interactions(db, user_id, interactions_df)
    category_df = await _category_interactions(db, user_id, interactions_df, listings_df)

    # brands + price: multiple DB queries each — cached for 24h per user
    if user_id is not None:
        signals = await cache_service.get_json(f"recs:user:{user_id}:signals")
        if signals is not None:
            user_brands = set(signals["brands"])
            user_price = signals["median_price"]
            logger.info("get_trending: user signals cache HIT — %d brands, price=%.2f", len(user_brands), user_price or 0)
        else:
            user_brands = await _user_brands(db, user_id, interactions_df, listings_df)
            user_price = await _user_price_profile(db, user_id, interactions_df, listings_df)
            await cache_service.set_json(
                f"recs:user:{user_id}:signals",
                {"brands": list(user_brands), "median_price": user_price},
                settings.RECS_USER_SIGNALS_CACHE_TTL,
            )
    else:
        user_brands = set()
        user_price = None

    # --- rank ---
    ranked = trending.rank_listings(
        listings_df, interactions_df, now,
        segment_df, category_df,
        user_brands=user_brands,
        user_median_price=user_price,
        user_id=user_id,
    )
    top = ranked.head(limit)[["id", "score"]]
    score_map = dict(zip(top["id"], top["score"]))
    logger.info("get_trending: top %d listings selected", len(score_map))

    # --- full listing fetch ---
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
            logger.warning("get_trending: listing_id=%s missing from full fetch", listing_id)
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
            "score": float(score),
        })

    # Cache anonymous result after first computation
    if user_id is None:
        await cache_service.set_json(f"recs:anonymous:{limit}", items, settings.RECS_ANONYMOUS_CACHE_TTL)

    has_cf = user_id is not None and not interactions_df.empty and user_id in interactions_df["user_id"].values
    personalized = (
        segment_df is not None or category_df is not None
        or bool(user_brands) or user_price is not None or has_cf
    )
    logger.info(
        "get_trending: done — %d items, personalized=%s (segment=%s, category=%s, brands=%d, price=%s, cf=%s)",
        len(items), personalized,
        segment_df is not None, category_df is not None, len(user_brands), user_price, has_cf,
    )
    return items, personalized


# ---------------------------------------------------------------------------
# Per-user enrichment helpers
# ---------------------------------------------------------------------------

async def _segment_interactions(
    db: AsyncSession, user_id: uuid.UUID | None, interactions_df: pd.DataFrame
) -> pd.DataFrame | None:
    if user_id is None or interactions_df.empty:
        logger.debug("_segment_interactions: user_id=%s or empty interactions → skipping", user_id)
        return None

    profile_result = await db.execute(
        select(UserProfiles.dob, UserProfiles.address).where(UserProfiles.user_id == user_id)
    )
    profile = profile_result.mappings().first()
    if not profile or (profile["dob"] is None and not profile["address"]):
        logger.debug("_segment_interactions: user=%s has no dob/address → skipping", user_id)
        return None

    user_age_group = trending.age_group(profile["dob"])
    user_city = parse_location(profile["address"])["city"] if profile["address"] else None
    logger.debug("_segment_interactions: user=%s age_group=%s city=%s", user_id, user_age_group, user_city)

    df = interactions_df.copy()
    df["age_group"] = df["dob"].apply(trending.age_group)
    df["city"] = df["address"].apply(lambda a: parse_location(a)["city"] if a else None)

    mask = pd.Series(False, index=df.index)
    if user_age_group:
        mask |= df["age_group"] == user_age_group
    if user_city:
        mask |= df["city"] == user_city

    result = df[mask] if mask.any() else None
    logger.debug("_segment_interactions: user=%s → %d matching rows", user_id, len(result) if result is not None else 0)
    return result


async def _category_interactions(
    db: AsyncSession, user_id: uuid.UUID | None, interactions_df: pd.DataFrame, listings_df: pd.DataFrame
) -> pd.DataFrame | None:
    if user_id is None:
        return None

    user_history = interactions_df[interactions_df["user_id"] == user_id] if not interactions_df.empty else pd.DataFrame()
    user_categories: set = set()

    if not user_history.empty:
        merged = user_history.merge(
            listings_df[["id", "category_id"]], left_on="listing_id", right_on="id", how="left"
        )
        user_categories = set(merged["category_id"].dropna().unique())
        logger.debug("_category_interactions: user=%s — %d categories from interaction history", user_id, len(user_categories))

    if not user_categories:
        wins_result = await db.execute(
            select(Listing.category_id)
            .join(AuctionResult, AuctionResult.listing_id == Listing.id)
            .where(AuctionResult.winner_id == user_id)
            .where(Listing.category_id.isnot(None))
            .distinct()
        )
        user_categories = {row[0] for row in wins_result.all()}
        logger.debug("_category_interactions: user=%s — %d categories from wins", user_id, len(user_categories))

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
        logger.debug("_category_interactions: user=%s — %d categories from board items", user_id, len(user_categories))

    if not user_categories:
        interests_result = await db.execute(
            select(UserInterest.category_id).where(UserInterest.user_id == user_id).distinct()
        )
        user_categories = {row[0] for row in interests_result.all()}
        logger.debug("_category_interactions: user=%s — %d categories from onboarding interests (cold-start)", user_id, len(user_categories))

    if not user_categories:
        logger.debug("_category_interactions: user=%s — no categories found → no boost", user_id)
        return None

    merged = interactions_df.merge(
        listings_df[["id", "category_id"]], left_on="listing_id", right_on="id", how="left"
    )
    category_df = merged[merged["category_id"].isin(user_categories)]
    logger.debug("_category_interactions: user=%s — %d matching rows", user_id, len(category_df))
    return category_df if not category_df.empty else None


async def _user_brands(
    db: AsyncSession, user_id: uuid.UUID | None, interactions_df: pd.DataFrame, listings_df: pd.DataFrame
) -> set:
    if user_id is None:
        return set()

    brands: set = set()

    if not interactions_df.empty:
        user_rows = interactions_df[interactions_df["user_id"] == user_id]
        if not user_rows.empty:
            merged = user_rows.merge(
                listings_df[["id", "brand"]], left_on="listing_id", right_on="id", how="left"
            )
            brands.update(merged["brand"].dropna().unique())
            logger.debug("_user_brands: user=%s — %d brands from window interactions", user_id, len(brands))

    bids_brand_result = await db.execute(
        select(Listing.brand)
        .join(Bid, Bid.listing_id == Listing.id)
        .where(Bid.bidder_id == user_id)
        .where(Listing.brand.isnot(None))
        .distinct()
    )
    bid_brands = {row[0] for row in bids_brand_result.all()}
    brands.update(bid_brands)
    logger.debug("_user_brands: user=%s — +%d from bid history (total=%d)", user_id, len(bid_brands), len(brands))

    wins_brand_result = await db.execute(
        select(Listing.brand)
        .join(AuctionResult, AuctionResult.listing_id == Listing.id)
        .where(AuctionResult.winner_id == user_id)
        .where(Listing.brand.isnot(None))
        .distinct()
    )
    brands.update(row[0] for row in wins_brand_result.all())

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

    logger.info("_user_brands: user=%s — final set: %d brands", user_id, len(brands))
    return brands


async def _user_price_profile(
    db: AsyncSession,
    user_id: uuid.UUID | None,
    interactions_df: pd.DataFrame,
    listings_df: pd.DataFrame,
) -> float | None:
    if user_id is None:
        return None

    bid_result = await db.execute(
        select(Bid.amount).where(Bid.bidder_id == user_id).limit(200)
    )
    amounts = [row[0] for row in bid_result.all()]
    logger.debug("_user_price_profile: user=%s — %d bid amounts", user_id, len(amounts))

    if not amounts and not interactions_df.empty:
        user_rows = interactions_df[interactions_df["user_id"] == user_id]
        if not user_rows.empty:
            merged = user_rows.merge(
                listings_df[["id", "current_price"]], left_on="listing_id", right_on="id", how="left"
            )
            amounts = merged["current_price"].dropna().tolist()
            logger.debug("_user_price_profile: user=%s — falling back to %d interaction prices", user_id, len(amounts))

    if not amounts:
        logger.debug("_user_price_profile: user=%s — no price signal", user_id)
        return None

    median = float(pd.Series(amounts).median())
    logger.info("_user_price_profile: user=%s — median=%.2f (%d points)", user_id, median, len(amounts))
    return median
