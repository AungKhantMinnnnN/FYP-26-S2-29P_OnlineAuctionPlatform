"""
recommendation_service.py — Orchestration layer for the trending/recommendation pipeline.

Responsibilities:
  - Cache-first data loading (listings_df, interactions_df, user signals)
  - DB fetch on cache miss (delegated to _fetch_* helpers)
  - Per-user enrichment (segment, category, brand, price, CF signals)
  - Calling trending.rank_listings() with the assembled signals
  - Assembling the final item payload from full ORM objects

Cache strategy (request-driven, no scheduler):
  - recs:global:listings      — active listings snapshot, TTL 5 min
  - recs:global:interactions  — interaction window (7d), TTL 5 min
  - recs:anonymous:{limit}    — pre-scored anonymous result, TTL 5 min
  - recs:user:{id}:signals    — per-user brand set + median price, TTL 24h

Staleness trade-off: a bid placed now won't appear in recommendations until
the interactions TTL expires (~5 min). User signals (brands, price median) are
stable enough for 24h caching. See RECS_*_CACHE_TTL settings to tune.
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

    pandas.read_json deserialises UUIDs as plain strings. The CF scoring function
    compares user_id against df["user_id"].values using Python equality — this silently
    fails if one side is a UUID object and the other is a string, producing zero CF
    scores for all users. Casting explicitly on every cache read prevents this.
    """
    df["id"] = df["id"].apply(lambda x: uuid.UUID(x) if pd.notna(x) and x else None)
    df["category_id"] = df["category_id"].apply(lambda x: uuid.UUID(x) if pd.notna(x) and x else None)
    return df


def _cast_interactions_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Restore UUID and date types after JSON round-trip through Redis.

    Three casts needed:
      - listing_id / user_id: UUIDs become strings (same issue as _cast_listings_df).
      - dob: datetime.date objects become ISO strings like "1990-05-12T00:00:00".
             We slice [:10] to extract just the date part before fromisoformat().
      - city: NaN (missing) and empty string both represent "no city" — normalise
              to None so downstream comparisons work consistently.
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

    Only selects the columns needed by the scoring pipeline (not full ORM objects)
    to keep the DataFrame small and serialisation fast. Full ORM objects are fetched
    separately at the end of get_trending() only for the top-N results.
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
    Build the interaction DataFrame from three sources and merge them into one.

    Sources:
      1. user_interactions — general engagement events (view, search, watchlist, bid).
         Filtered to the 7-day window and only for currently active listings.
      2. bids table — explicit bid events with weight 8.0, stronger than logged "bid" events.
         Pulling directly from source avoids reliance on interaction logging being perfect.
      3. watchlist table — items currently saved. Unlike user_interactions "watchlist" events
         which log add/remove, this reflects the current saved state (weight 4.0).

    All three are concatenated into a single DataFrame with a synthetic "action" column
    so the scoring functions can treat them uniformly via ACTION_WEIGHTS.

    UserProfiles is outer-joined to each source so we get dob, address, and city for
    segment matching. The outer join ensures we don't drop interactions from users
    who have no profile row.
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

    Cache-first flow:
      1. Anonymous users: try recs:anonymous:{limit} — if hit, return immediately
         (no DB or pandas work needed).
      2. Load listings_df from recs:global:listings or DB.
      3. Load interactions_df from recs:global:interactions or DB.
      4. Per-user enrichment:
           - segment_df / category_df: derived from the cached interactions_df
             via fast pandas ops — not separately cached (cheap to recompute).
           - user signals (brands + median price): cached at recs:user:{id}:signals
             for 24h because they require multiple DB queries across all-time history.
      5. rank_listings() applies the 8-factor scoring pipeline.
      6. Full ORM fetch for the top-N listing IDs (images, seller).
      7. Cache anonymous result for next caller.

    personalized=True means at least one user-specific signal influenced the ranking.
    """
    logger.info("get_trending: start — user_id=%s limit=%d", user_id, limit)

    # Anonymous short-circuit — serve pre-scored result directly from cache.
    # Skips all DB queries and pandas work for the most common call pattern.
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
    # segment + category: fast pandas ops on the already-loaded interactions_df — not cached
    segment_df = await _segment_interactions(db, user_id, interactions_df)
    category_df = await _category_interactions(db, user_id, interactions_df, listings_df)

    # brands + price: require multiple DB queries across all-time history — cached 24h per user.
    # The 24h TTL is acceptable because brand affinity and price profile shift slowly.
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
    # Preserve the ranked order as a dict so we can re-sort after the ORM fetch
    score_map = dict(zip(top["id"], top["score"]))
    logger.info("get_trending: top %d listings selected", len(score_map))

    # Full ORM fetch for the top-N only — images and seller are needed for the API response
    full_result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.images), selectinload(Listing.seller))
        .where(Listing.id.in_(list(score_map.keys())))
    )
    full_listings = {l.id: l for l in full_result.scalars().all()}

    # Build response items in ranked order (score_map preserves insertion order from ranked)
    items = []
    for listing_id, score in score_map.items():
        listing = full_listings.get(listing_id)
        if not listing:
            # Listing was in the cache snapshot but ended or was deleted between cache fill
            # and now — skip it silently rather than returning a broken item.
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

    # Cache the anonymous result after first computation so subsequent anonymous calls
    # bypass all DB and pandas work entirely.
    if user_id is None:
        await cache_service.set_json(f"recs:anonymous:{limit}", items, settings.RECS_ANONYMOUS_CACHE_TTL)

    # personalized=True if any user-specific signal influenced the ranking
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
    as the requesting user (same age group OR same city).

    This produces a "what's trending among people like me" sub-signal. The result is
    passed to rank_listings() as segment_interactions, where _relative_boost() converts
    it into a 0..1 normalised boost per listing.

    City resolution (Phase 6):
      - Prefers the structured `city` column added in Phase 6.
      - Falls back to parse_location(address) for users whose profiles predate Phase 6
        or who haven't filled in their city yet.
      - The same dual-source logic applies to both the requesting user's profile and
        the peer rows in interactions_df.

    Returns None if the user has no demographic data or no peers match — callers treat
    None as "no segment signal" and apply zero boost.
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
    # Prefer structured city; fall back to parse_location for users who haven't updated yet
    user_city = profile["city"] or (parse_location(profile["address"])["city"] if profile["address"] else None)
    logger.debug("_segment_interactions: user=%s age_group=%s city=%s", user_id, user_age_group, user_city)

    df = interactions_df.copy()
    df["age_group"] = df["dob"].apply(trending.age_group)

    # Resolve city for each peer row using the same dual-source logic:
    # structured city column wins; address heuristic is the fallback.
    if "city" in df.columns:
        df["resolved_city"] = df["city"].where(
            df["city"].notna() & (df["city"] != ""),
            df["address"].apply(lambda a: parse_location(a)["city"] if a else None),
        )
    else:
        # Pre-Phase-6 cached DataFrame — city column doesn't exist yet
        df["resolved_city"] = df["address"].apply(lambda a: parse_location(a)["city"] if a else None)

    # Match any row from a user sharing the same age group OR same city.
    # OR logic intentionally broadens the segment — a narrow intersection (same age AND city)
    # would return too few peers in most regions.
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

    Category preference is derived from a 4-level fallback chain (most to least recent):
      1. Interaction history (window) — categories from listings the user viewed/bid in the last 7d.
      2. Auction wins (all-time) — categories from listings the user has won.
      3. Collector board items — categories the user curated into their boards.
      4. Onboarding interests — categories selected during registration (cold-start fallback).

    The chain stops at the first level that yields at least one category. This ensures
    new users (levels 1-3 empty) still get category personalisation via onboarding picks,
    while active users get dynamically updated preferences from their recent behaviour.

    Returns None if no categories are found at any level — callers treat this as no boost.
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
    Build the complete set of brands the user has engaged with across all history.

    Four sources (all merged into one set):
      1. Window interactions — brands from listings the user viewed/bid on in the last 7d.
         Fast: derived from already-loaded DataFrames, no extra DB query.
      2. All-time bid history — brands from every listing the user has ever bid on.
      3. Auction wins — brands from listings the user has won.
      4. Collector board items — brands from items the user curated into boards.

    Sources 2-4 use all-time data (no window filter) because brand affinity develops
    over the user's full history, not just recent activity. This result is cached for
    24h to avoid repeating these DB queries on every request.
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

    Median is preferred over mean because auction prices have a long right tail —
    a single high-value bid would pull the mean up and de-rank most affordable listings.
    Median is stable and represents the price range the user most commonly operates in.

    Fallback: if the user has never bid, we use the current prices of listings they've
    interacted with in the window. This gives a rough price signal for browsers who
    haven't committed to bids yet.

    Capped at 200 bid rows — enough for a stable median; beyond that, recency bias
    from unlimited history would make the signal less useful anyway.

    Returns None if no price signal is available — price_affinity_scores() will use
    a neutral 0.5 value for this user.
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
