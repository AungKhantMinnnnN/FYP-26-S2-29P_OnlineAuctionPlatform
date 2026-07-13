import datetime
import logging
import uuid
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

ACTION_WEIGHTS = {
    # From user_interactions table (logged events)
    "bid": 5.0,
    "watchlist": 3.0,
    "view": 1.0,
    "search": 1.0,
    # Virtual actions injected from source tables (stronger explicit signals)
    "bid_placed": 8.0,       # from bids table
    "watchlist_active": 4.0, # from watchlist table (item still saved)
    "purchase": 10.0,        # from auction_results (user won)
    "board_curated": 12.0,   # from board_items (explicitly showcased)
}
TRENDING_WINDOW_DAYS = 7
ENDING_SOON_WINDOW_HOURS = 72
URGENCY_WEIGHT = 0.5    # ending-soon listings get up to +50% score
SEGMENT_WEIGHT = 0.5    # listings trending in the user's age group/location get up to +50% more
CATEGORY_WEIGHT = 0.5   # listings trending in a category the user has interacted with get up to +50% more
BRAND_WEIGHT = 0.4      # listings matching user's brand history get up to +40% more
PRICE_WEIGHT = 0.3      # listings near user's median bid price get up to +30% more
CONDITION_WEIGHT = 0.2  # higher condition_confidence gets up to +20% more (tie-breaker)
CF_WEIGHT = 0.5         # listings popular among similar users get up to +50% more


def age_group(dob: datetime.date | None, today: datetime.date | None = None) -> str | None:
    if dob is None:
        return None
    today = today or datetime.date.today()
    years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if years < 18:
        return "under_18"
    if years <= 24:
        return "18_24"
    if years <= 34:
        return "25_34"
    if years <= 44:
        return "35_44"
    if years <= 54:
        return "45_54"
    return "55_plus"


def popularity_scores(interactions: pd.DataFrame) -> pd.Series:
    if interactions.empty:
        logger.debug("popularity_scores: no interactions → returning empty series")
        return pd.Series(dtype=float)
    weights = interactions["action"].map(ACTION_WEIGHTS).fillna(0)
    scores = weights.groupby(interactions["listing_id"]).sum()
    logger.debug("popularity_scores: %d listings scored, top score=%.2f", len(scores), scores.max() if not scores.empty else 0)
    return scores


def urgency_scores(listings: pd.DataFrame, now: datetime.datetime) -> pd.Series:
    if listings.empty:
        logger.debug("urgency_scores: no listings → returning empty series")
        return pd.Series(dtype=float)
    end_time = pd.to_datetime(listings["end_time"], utc=True)
    hours_remaining = (end_time - now).dt.total_seconds() / 3600
    score = ((ENDING_SOON_WINDOW_HOURS - hours_remaining) / ENDING_SOON_WINDOW_HOURS).clip(lower=0, upper=1)
    score[hours_remaining < 0] = 0
    result = pd.Series(score.values, index=listings["id"])
    urgent_count = (result > 0).sum()
    logger.debug("urgency_scores: %d/%d listings have urgency > 0", urgent_count, len(result))
    return result


def brand_affinity_scores(listing_ids: pd.Index, listings: pd.DataFrame, user_brands: set) -> pd.Series:
    if not user_brands or "brand" not in listings.columns:
        logger.debug("brand_affinity_scores: no user brands or missing column → all 0.0")
        return pd.Series(0.0, index=listing_ids)
    brands = listings.set_index("id")["brand"].reindex(listing_ids)
    result = brands.isin(user_brands).astype(float)
    match_count = int(result.sum())
    logger.debug("brand_affinity_scores: %d/%d listings match user brands %s", match_count, len(listing_ids), user_brands)
    return result


def price_affinity_scores(listing_ids: pd.Index, listings: pd.DataFrame, user_median_price: float | None) -> pd.Series:
    if user_median_price is None or user_median_price <= 0 or "current_price" not in listings.columns:
        logger.debug("price_affinity_scores: no median price → all 0.5 neutral")
        return pd.Series(0.5, index=listing_ids)
    prices = listings.set_index("id")["current_price"].reindex(listing_ids)
    score = (1.0 - (prices - user_median_price).abs() / (2 * user_median_price)).clip(0.0, 1.0)
    result = score.fillna(0.5)
    logger.debug(
        "price_affinity_scores: user_median=%.2f, listing price range=[%.2f, %.2f], score range=[%.3f, %.3f]",
        user_median_price, prices.min(), prices.max(), result.min(), result.max(),
    )
    return result


def condition_quality_scores(listing_ids: pd.Index, listings: pd.DataFrame) -> pd.Series:
    if "condition_confidence" not in listings.columns:
        logger.debug("condition_quality_scores: no condition_confidence column → all 0.5 neutral")
        return pd.Series(0.5, index=listing_ids)
    conf = listings.set_index("id")["condition_confidence"].reindex(listing_ids).fillna(50.0)
    result = (conf / 100.0).clip(0.0, 1.0)
    logger.debug("condition_quality_scores: score range=[%.3f, %.3f]", result.min(), result.max())
    return result


def cf_scores(user_id: uuid.UUID | None, interactions: pd.DataFrame, listing_ids: pd.Index) -> pd.Series:
    """User-based CF: cosine similarity against peer users → weighted listing scores, normalized 0..1.
    # ponytail: recomputed per request; Phase 5 precomputes + caches the similarity matrix."""
    zero = pd.Series(0.0, index=listing_ids)

    if user_id is None:
        logger.debug("cf_scores: no user_id → skipping CF")
        return zero
    if interactions.empty:
        logger.debug("cf_scores: user=%s — no interactions in window → skipping CF", user_id)
        return zero

    df = interactions.dropna(subset=["user_id"]).copy()
    if user_id not in df["user_id"].values:
        logger.debug("cf_scores: user=%s not in interaction window → no CF boost", user_id)
        return zero

    df["weight"] = df["action"].map(ACTION_WEIGHTS).fillna(0)
    matrix = df.groupby(["user_id", "listing_id"])["weight"].sum().unstack(fill_value=0.0)
    logger.debug("cf_scores: user-item matrix shape=%s", matrix.shape)

    if user_id not in matrix.index or len(matrix) < 2:
        logger.debug("cf_scores: user=%s — fewer than 2 users in matrix → skipping CF", user_id)
        return zero

    user_vec = matrix.loc[[user_id]].values          # shape (1, n_listings)
    other = matrix.drop(index=user_id)               # shape (n_peers, n_listings)

    sims = cosine_similarity(user_vec, other.values)[0]  # shape (n_peers,)
    sims = np.clip(sims, 0, None)
    logger.debug(
        "cf_scores: user=%s — %d peers, similarity range=[%.3f, %.3f], non-zero peers=%d",
        user_id, len(sims), sims.min(), sims.max(), int((sims > 0).sum()),
    )

    if sims.sum() == 0:
        logger.debug("cf_scores: user=%s — all peer similarities are 0 → no CF boost", user_id)
        return zero

    raw = pd.Series(sims @ other.values, index=matrix.columns)
    max_raw = raw.max()
    normalized = (raw / max_raw) if max_raw > 0 else raw
    result = normalized.reindex(listing_ids).fillna(0.0)
    logger.debug("cf_scores: user=%s — CF score range=[%.3f, %.3f]", user_id, result.min(), result.max())
    return result


def _relative_boost(index: pd.Index, subset: pd.DataFrame | None) -> pd.Series:
    if subset is None or subset.empty:
        return pd.Series(0.0, index=index)
    pop = popularity_scores(subset).reindex(index).fillna(0)
    max_pop = pop.max()
    return (pop / max_pop) if max_pop > 0 else pd.Series(0.0, index=index)


def rank_listings(
    listings: pd.DataFrame,
    interactions: pd.DataFrame,
    now: datetime.datetime,
    segment_interactions: pd.DataFrame | None = None,
    category_interactions: pd.DataFrame | None = None,
    user_brands: set | None = None,
    user_median_price: float | None = None,
    user_id: uuid.UUID | None = None,
) -> pd.DataFrame:
    logger.info(
        "rank_listings: scoring %d listings against %d interaction rows (user_id=%s)",
        len(listings), len(interactions), user_id,
    )

    scores = pd.DataFrame({"id": listings["id"]}).set_index("id")
    scores["popularity"] = popularity_scores(interactions).reindex(scores.index).fillna(0)
    scores["urgency"] = urgency_scores(listings, now).reindex(scores.index).fillna(0)
    scores["score"] = scores["popularity"] * (1 + URGENCY_WEIGHT * scores["urgency"])
    logger.debug("rank_listings: after popularity+urgency — score range=[%.2f, %.2f]", scores["score"].min(), scores["score"].max())

    scores["segment"] = _relative_boost(scores.index, segment_interactions)
    scores["score"] = scores["score"] * (1 + SEGMENT_WEIGHT * scores["segment"])
    logger.debug("rank_listings: after segment boost — listings with boost>0: %d", int((scores["segment"] > 0).sum()))

    scores["category"] = _relative_boost(scores.index, category_interactions)
    scores["score"] = scores["score"] * (1 + CATEGORY_WEIGHT * scores["category"])
    logger.debug("rank_listings: after category boost — listings with boost>0: %d", int((scores["category"] > 0).sum()))

    scores["cf"] = cf_scores(user_id, interactions, scores.index)
    scores["score"] = scores["score"] * (1 + CF_WEIGHT * scores["cf"])
    logger.debug("rank_listings: after CF boost — listings with boost>0: %d", int((scores["cf"] > 0).sum()))

    scores["brand"] = brand_affinity_scores(scores.index, listings, user_brands or set())
    scores["score"] = scores["score"] * (1 + BRAND_WEIGHT * scores["brand"])
    logger.debug("rank_listings: after brand boost — listings with brand match: %d", int((scores["brand"] > 0).sum()))

    scores["price"] = price_affinity_scores(scores.index, listings, user_median_price)
    scores["score"] = scores["score"] * (1 + PRICE_WEIGHT * scores["price"])
    logger.debug("rank_listings: after price boost — score range=[%.2f, %.2f]", scores["score"].min(), scores["score"].max())

    scores["condition"] = condition_quality_scores(scores.index, listings)
    scores["score"] = scores["score"] * (1 + CONDITION_WEIGHT * scores["condition"])

    result = scores.reset_index().merge(listings, on="id").sort_values("score", ascending=False)
    logger.info(
        "rank_listings: done — top listing_id=%s score=%.4f, bottom score=%.4f",
        result.iloc[0]["id"] if not result.empty else None,
        result.iloc[0]["score"] if not result.empty else 0,
        result.iloc[-1]["score"] if not result.empty else 0,
    )
    return result
