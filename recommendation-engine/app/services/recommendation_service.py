"""
recommendation_service.py — Orchestration layer for the trending/recommendation pipeline.

Loads listings/interactions/user-signals cache-first (DB fetch on miss via _fetch_*
helpers), enriches with per-user signals, calls trending.rank_listings(), then hydrates
the top-N with full ORM objects for the response.

Cache keys: recs:global:listings, recs:global:interactions (both TTL 5 min),
recs:anonymous:{limit} (TTL 5 min), recs:user:{id}:signals (TTL 24h — brand/price
profiles shift slowly, unlike interaction counts). A bid placed now won't affect
rankings until the interactions TTL expires. See RECS_*_CACHE_TTL to tune.
"""

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
    """
    Restore Python UUID objects after JSON round-trip through Redis.

    pandas.read_json deserialises UUIDs as plain strings, and the CF scoring function's
    user_id equality check silently returns zero matches for everyone if one side is a
    UUID object and the other a string. Cast explicitly on every cache read to avoid this.
    """
    df["id"] = df["id"].apply(lambda x: uuid.UUID(x) if pd.notna(x) and x else None)
    df["category_id"] = df["category_id"].apply(lambda x: uuid.UUID(x) if pd.notna(x) and x else None)
    return df


def _cast_interactions_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Restore UUID and date types after JSON round-trip through Redis (same issue as
    _cast_listings_df). dob comes back as an ISO string like "1990-05-12T00:00:00",
    hence the [:10] slice before fromisoformat().
    """
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
    # city is a plain string — ensure missing values are None not NaN
    if "city" in df.columns:
        df["city"] = df["city"].where(df["city"].notna() & (df["city"] != ""), other=None)
    return df


# ---------------------------------------------------------------------------
# DB fetch helpers — called on cache miss only
# ---------------------------------------------------------------------------

async def _fetch_listings(db: AsyncSession, now: datetime.datetime) -> pd.DataFrame:
    """
    Query active, non-draft listings that haven't ended yet.

    Only selects the columns needed by the scoring pipeline, not full ORM objects --
    those are fetched separately for the top-N results at the end of get_trending().
    """
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
    """
    Build the interaction DataFrame from three sources, concatenated with a synthetic
    "action" column so scoring can treat them uniformly via ACTION_WEIGHTS:
      1. user_interactions — logged view/search/watchlist/bid events, 7-day window.
      2. bids table — pulled directly rather than relying on interaction logging being
         complete; weighted higher (8.0) than a logged "bid" event.
      3. watchlist table — current saved state, unlike the logged watchlist add/remove events.

    UserProfiles is outer-joined to each source (for segment matching) so interactions
    from users without a profile row aren't dropped.
    """
    logger.info("_fetch_interactions: querying DB")

    interactions_result = await db.execute(
        select(
            UserInteraction.listing_id,
            UserInteraction.action,
            UserInteraction.user_id,
            UserProfiles.dob,
            UserProfiles.address,
            UserProfiles.city,
        )
        .outerjoin(UserProfiles, UserProfiles.user_id == UserInteraction.user_id)
        .where(UserInteraction.occurred_at >= window_start)
        .where(UserInteraction.listing_id.in_(active_ids))
    )
    df = pd.DataFrame(
        interactions_result.mappings().all(),
        columns=["listing_id", "action", "user_id", "dob", "address", "city"],
    )
    if not df.empty:
        # Convert SQLAlchemy enum objects to their string values for uniform handling
        df["action"] = df["action"].apply(lambda a: a.value if hasattr(a, "value") else a)
    logger.info("_fetch_interactions: %d user_interaction rows", len(df))

    bids_result = await db.execute(
        select(Bid.listing_id, Bid.bidder_id, UserProfiles.dob, UserProfiles.address, UserProfiles.city)
        .outerjoin(UserProfiles, UserProfiles.user_id == Bid.bidder_id)
        .where(Bid.placed_at >= window_start)
        .where(Bid.listing_id.in_(active_ids))
    )
    bids_rows = bids_result.mappings().all()
    if bids_rows:
        bids_df = pd.DataFrame(bids_rows, columns=["listing_id", "user_id", "dob", "address", "city"])
        bids_df["action"] = "bid_placed"
        df = pd.concat([df, bids_df], ignore_index=True)
        logger.info("_fetch_interactions: +%d bid_placed rows (total=%d)", len(bids_df), len(df))

    watchlist_result = await db.execute(
        select(Watchlist.listing_id, Watchlist.user_id, UserProfiles.dob, UserProfiles.address, UserProfiles.city)
        .outerjoin(UserProfiles, UserProfiles.user_id == Watchlist.user_id)
        .where(Watchlist.listing_id.in_(active_ids))
    )
    watchlist_rows = watchlist_result.mappings().all()
    if watchlist_rows:
        wl_df = pd.DataFrame(watchlist_rows, columns=["listing_id", "user_id", "dob", "address", "city"])
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
    """
    Return (items, personalized) for the trending endpoint.

    Anonymous requests short-circuit on the recs:anonymous:{limit} cache. Otherwise
    loads listings/interactions cache-first, enriches with per-user signals (segment
    and category are cheap to recompute from interactions_df; brands/price are cached
    24h since they need all-time DB queries), ranks via trending.rank_listings(), then
    hydrates the top-N with full ORM objects. personalized=True if any user-specific
    signal influenced the ranking.
    """
    logger.info("get_trending: start — user_id=%s limit=%d", user_id, limit)

    # Anonymous short-circuit — serve pre-scored result directly from cache, skipping
    # all DB queries and pandas work for the most common call pattern.
    if user_id is None:
        cached = await cache_service.get_json(f"recs:anonymous:{limit}")
        if cached is not None:
            logger.info("get_trending: anonymous cache HIT — returning %d items", len(cached))
            return cached, False
        else:
            logger.info("get_trending: anonymous cache MISS")

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
    segment_df = await _segment_interactions(db, user_id, interactions_df)
    category_df = await _category_interactions(db, user_id, interactions_df, listings_df)

    # brands + price require multiple DB queries across all-time history, so they're
    # cached 24h per user — acceptable since both signals shift slowly.
    if user_id is not None:
        signals = await cache_service.get_json(f"recs:user:{user_id}:signals")
        if signals is not None:
            user_brands = set(signals["brands"])
            user_price = signals["median_price"]
            logger.info("get_trending: user signals cache HIT — %d brands, price=%.2f", len(user_brands), user_price or 0)
        else:
            logger.info("get_trending: user signals cache MISS.")
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
    # dict preserves ranked order so we can restore it after the ORM fetch below
    score_map = dict(zip(top["id"], top["score"]))
    logger.info("get_trending: top %d listings selected", len(score_map))

    # Full ORM fetch for the top-N only — images and seller are needed for the API response
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
            # Listing was in the cache snapshot but ended or was deleted since then --
            # skip silently rather than return a broken item.
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
            } if listing.seller else None,
            "score": float(score),
        })

    # Cache the anonymous result so subsequent anonymous calls skip DB and pandas work.
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
    """
    Filter the interaction window to rows from users in the same demographic segment
    as the requesting user (same age group OR same city) — a "trending among people
    like me" sub-signal, passed to rank_listings() as segment_interactions.

    City resolution prefers the structured `city` column, falling back to
    parse_location(address) for profiles that only have a freeform address.

    Returns None if the user has no demographic data or no peers match.
    """
    if user_id is None or interactions_df.empty:
        logger.debug("_segment_interactions: user_id=%s or empty interactions → skipping", user_id)
        return None

    profile_result = await db.execute(
        select(UserProfiles.dob, UserProfiles.address, UserProfiles.city).where(UserProfiles.user_id == user_id)
    )
    profile = profile_result.mappings().first()
    if not profile or (profile["dob"] is None and not profile["address"] and not profile["city"]):
        logger.debug("_segment_interactions: user=%s has no dob/address/city → skipping", user_id)
        return None

    user_age_group = trending.age_group(profile["dob"])
    user_city = profile["city"] or (parse_location(profile["address"])["city"] if profile["address"] else None)
    logger.debug("_segment_interactions: user=%s age_group=%s city=%s", user_id, user_age_group, user_city)

    df = interactions_df.copy()
    df["age_group"] = df["dob"].apply(trending.age_group)

    if "city" in df.columns:
        df["resolved_city"] = df["city"].where(
            df["city"].notna() & (df["city"] != ""),
            df["address"].apply(lambda a: parse_location(a)["city"] if a else None),
        )
    else:
        # Older cached DataFrame without a city column yet
        df["resolved_city"] = df["address"].apply(lambda a: parse_location(a)["city"] if a else None)

    # OR (not AND) intentionally broadens the segment -- same age AND city would
    # return too few peers in most regions.
    mask = pd.Series(False, index=df.index)
    if user_age_group:
        mask |= df["age_group"] == user_age_group
    if user_city:
        mask |= df["resolved_city"] == user_city

    result = df[mask] if mask.any() else None
    logger.debug("_segment_interactions: user=%s → %d matching rows", user_id, len(result) if result is not None else 0)
    return result


async def _category_interactions(
    db: AsyncSession, user_id: uuid.UUID | None, interactions_df: pd.DataFrame, listings_df: pd.DataFrame
) -> pd.DataFrame | None:
    """
    Filter the interaction window to rows for listings in categories the user cares about.

    Category preference comes from a 4-level fallback chain, stopping at the first
    level with at least one category: (1) recent interaction history, (2) all-time
    auction wins, (3) collector board items, (4) onboarding interests. This lets new
    users get category personalisation from their onboarding picks while active users
    get preferences driven by recent behaviour.

    Returns None if no categories are found at any level.
    """
    if user_id is None:
        return None

    user_history = interactions_df[interactions_df["user_id"] == user_id] if not interactions_df.empty else pd.DataFrame()
    user_categories: set = set()

    # Level 1: recent interaction window
    if not user_history.empty:
        merged = user_history.merge(
            listings_df[["id", "category_id"]], left_on="listing_id", right_on="id", how="left"
        )
        user_categories = set(merged["category_id"].dropna().unique())
        logger.debug("_category_interactions: user=%s — %d categories from interaction history", user_id, len(user_categories))

    # Level 2: all-time wins
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

    # Level 3: collector board items
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

    # Level 4: onboarding interests (cold-start)
    if not user_categories:
        interests_result = await db.execute(
            select(UserInterest.category_id).where(UserInterest.user_id == user_id).distinct()
        )
        user_categories = {row[0] for row in interests_result.all()}
        logger.debug("_category_interactions: user=%s — %d categories from onboarding interests (cold-start)", user_id, len(user_categories))

    if not user_categories:
        logger.debug("_category_interactions: user=%s — no categories found → no boost", user_id)
        return None

    # Filter the global interaction window to listings in the user's preferred categories
    merged = interactions_df.merge(
        listings_df[["id", "category_id"]], left_on="listing_id", right_on="id", how="left"
    )
    category_df = merged[merged["category_id"].isin(user_categories)]
    logger.debug("_category_interactions: user=%s — %d matching rows", user_id, len(category_df))
    return category_df if not category_df.empty else None


async def _user_brands(
    db: AsyncSession, user_id: uuid.UUID | None, interactions_df: pd.DataFrame, listings_df: pd.DataFrame
) -> set:
    """
    Build the complete set of brands the user has engaged with, merging window
    interactions (no extra DB query) with all-time bid history, auction wins, and
    collector board items. Sources 2-4 are all-time (not window-filtered) because
    brand affinity develops over a user's full history, not just recent activity.
    """
    if user_id is None:
        return set()

    brands: set = set()

    # Source 1: window interactions (from cached DataFrame — no DB hit)
    if not interactions_df.empty:
        user_rows = interactions_df[interactions_df["user_id"] == user_id]
        if not user_rows.empty:
            merged = user_rows.merge(
                listings_df[["id", "brand"]], left_on="listing_id", right_on="id", how="left"
            )
            brands.update(merged["brand"].dropna().unique())
            logger.debug("_user_brands: user=%s — %d brands from window interactions", user_id, len(brands))

    # Source 2: all-time bid history
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

    # Source 3: auction wins
    wins_brand_result = await db.execute(
        select(Listing.brand)
        .join(AuctionResult, AuctionResult.listing_id == Listing.id)
        .where(AuctionResult.winner_id == user_id)
        .where(Listing.brand.isnot(None))
        .distinct()
    )
    brands.update(row[0] for row in wins_brand_result.all())

    # Source 4: collector board items
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
    """
    Compute the user's median price point from their bidding history.

    Median rather than mean because auction prices have a long right tail — a single
    high-value bid would pull the mean up and de-rank affordable listings. Falls back
    to prices of interacted-with listings if the user has never bid. Capped at 200 bid
    rows, enough for a stable median. Returns None if no signal is available, in which
    case price_affinity_scores() uses a neutral 0.5.
    """
    if user_id is None:
        return None

    bid_result = await db.execute(
        select(Bid.amount).where(Bid.bidder_id == user_id).limit(200)
    )
    amounts = [row[0] for row in bid_result.all()]
    logger.debug("_user_price_profile: user=%s — %d bid amounts", user_id, len(amounts))

    if not amounts and not interactions_df.empty:
        # No bids yet — fall back to prices of listings the user viewed/interacted with
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
