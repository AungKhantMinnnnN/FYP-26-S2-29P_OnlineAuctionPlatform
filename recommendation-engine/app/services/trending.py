"""
trending.py — Pure scoring functions for the recommendation pipeline.

All functions here are stateless and side-effect-free: they take DataFrames and
return DataFrames or Series. No DB access, no caching. This keeps them fast,
testable, and reusable across different call paths.

Scoring pipeline applied in rank_listings():
  popularity × (1 + 0.5·urgency) × (1 + 0.5·segment) × (1 + 0.5·category)
            × (1 + 0.5·cf) × (1 + 0.4·brand) × (1 + 0.3·price) × (1 + 0.2·condition)

Each multiplier is additive on top of the base score, so a listing needs real
popularity before any personalisation boost matters much.
"""

import datetime
import logging
import uuid
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Action weights — how much each interaction type contributes to a listing's
# popularity score. Higher = stronger signal of genuine user interest.
# Bid/purchase signals are sourced directly from the bids/auction_results tables
# (not user_interactions) to avoid double-counting logged events.
# ---------------------------------------------------------------------------
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

# How many days of interaction history to consider for trending signals.
# Older interactions are stale — a listing popular 3 months ago is no longer trending.
TRENDING_WINDOW_DAYS = 7

# Listings ending within this many hours are considered "ending soon" and get
# an urgency boost. 72h = 3 days gives enough runway to surface them before they expire.
ENDING_SOON_WINDOW_HOURS = 72

# Multiplier weights — each controls the maximum percentage boost a signal can add.
# These are tuned so no single signal dominates; popularity is always the base.
URGENCY_WEIGHT = 0.5    # ending-soon listings get up to +50% score
SEGMENT_WEIGHT = 0.5    # listings trending in the user's age group/location get up to +50% more
CATEGORY_WEIGHT = 0.5   # listings trending in a category the user has interacted with get up to +50% more
BRAND_WEIGHT = 0.4      # listings matching user's brand history get up to +40% more
PRICE_WEIGHT = 0.3      # listings near user's median bid price get up to +30% more
CONDITION_WEIGHT = 0.2  # higher condition_confidence gets up to +20% more (tie-breaker)
CF_WEIGHT = 0.5         # listings popular among similar users get up to +50% more


def age_group(dob: datetime.date | None, today: datetime.date | None = None) -> str | None:
    """
    Map a date of birth to a demographic age bucket.

    The explicit birthday comparison (month, day) correctly handles the case where
    the birthday hasn't occurred yet this calendar year — avoids off-by-one errors
    in the first few months after a birthday boundary.

    Returns None if dob is None so callers can skip segment matching gracefully.
    """
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
    """
    Compute a raw popularity score per listing by summing weighted interaction counts.

    Each row in interactions is one user event. The weight depends on the action type
    (see ACTION_WEIGHTS). Summing across all users gives a listing-level signal:
    a listing that many users bid on scores much higher than one that was only viewed.

    Returns a Series indexed by listing_id. Listings with zero interactions are absent
    (not 0.0) — callers must use .reindex(...).fillna(0) to align with the full listing set.
    """
    if interactions.empty:
        logger.debug("popularity_scores: no interactions → returning empty series")
        return pd.Series(dtype=float)
    weights = interactions["action"].map(ACTION_WEIGHTS).fillna(0)
    scores = weights.groupby(interactions["listing_id"]).sum()
    logger.debug("popularity_scores: %d listings scored, top score=%.2f", len(scores), scores.max() if not scores.empty else 0)
    return scores


def urgency_scores(listings: pd.DataFrame, now: datetime.datetime) -> pd.Series:
    """
    Compute an urgency score (0..1) per listing based on how close it is to ending.

    Formula: (ENDING_SOON_WINDOW_HOURS - hours_remaining) / ENDING_SOON_WINDOW_HOURS,
    clipped to [0, 1]. A listing ending in 1 hour scores ~0.986; one ending in 72h
    scores 0.0. Listings that have already ended get 0.

    The score is intentionally linear (not exponential) to avoid a single ending-soon
    listing dominating the entire feed regardless of popularity.
    """
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
    """
    Binary match: 1.0 if the listing's brand is in the user's brand history, else 0.0.

    Binary is intentional here — we don't have enough signal to rank brands relative
    to each other (a user who bid on 5 Nike items vs 1 is not meaningfully different
    from the perspective of "does this listing appeal to them").

    user_brands is built from: window interactions + all-time bids + wins + board items.
    """
    if not user_brands or "brand" not in listings.columns:
        logger.debug("brand_affinity_scores: no user brands or missing column → all 0.0")
        return pd.Series(0.0, index=listing_ids)
    brands = listings.set_index("id")["brand"].reindex(listing_ids)
    result = brands.isin(user_brands).astype(float)
    match_count = int(result.sum())
    logger.debug("brand_affinity_scores: %d/%d listings match user brands %s", match_count, len(listing_ids), user_brands)
    return result


def price_affinity_scores(listing_ids: pd.Index, listings: pd.DataFrame, user_median_price: float | None) -> pd.Series:
    """
    Score listings by how close their current price is to the user's median bid price.

    Formula: 1 - |listing_price - median| / (2 * median), clipped to [0, 1].
    A listing priced at exactly the user's median scores 1.0; one priced at 3× the
    median scores 0.0. The denominator (2 * median) creates a ±100% tolerance band.

    Defaults to 0.5 neutral when user has no price history, so unpriced users get a
    small non-zero price boost rather than being excluded entirely.
    """
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
    """
    Score listings by the AI-generated condition confidence score (0–100 → 0.0–1.0).

    condition_confidence is set by the intelligence-engine's vision model when listing
    images are uploaded. It's an objective quality signal that acts as a tie-breaker:
    among equally popular listings, better-condition items rank higher.

    Defaults to 0.5 neutral for listings without an AI assessment, so unscored items
    are not penalised — just not boosted.
    """
    if "condition_confidence" not in listings.columns:
        logger.debug("condition_quality_scores: no condition_confidence column → all 0.5 neutral")
        return pd.Series(0.5, index=listing_ids)
    conf = listings.set_index("id")["condition_confidence"].reindex(listing_ids).fillna(50.0)
    result = (conf / 100.0).clip(0.0, 1.0)
    logger.debug("condition_quality_scores: score range=[%.3f, %.3f]", result.min(), result.max())
    return result


def cf_scores(user_id: uuid.UUID | None, interactions: pd.DataFrame, listing_ids: pd.Index) -> pd.Series:
    """
    User-based Collaborative Filtering: surface listings that similar users engaged with.

    Algorithm:
      1. Build a user × listing weight matrix from the interaction window.
         Each cell = sum of ACTION_WEIGHTS for that (user, listing) pair.
      2. Compute cosine similarity between the requesting user's row and all peer rows.
         Cosine is chosen over dot-product because it normalises for activity level —
         a highly active user doesn't dominate similarity just because they interact more.
      3. Clip similarities to [0, ∞) — negative cosine (opposite taste) should not
         subtract from a listing's score.
      4. Weighted sum: each peer's listing weights are multiplied by their similarity
         to the requesting user, then summed. This propagates engagement from
         taste-similar peers to listings the requesting user hasn't seen yet.
      5. Normalise to [0, 1] by dividing by the max raw score so the CF signal
         stays proportionate with the other boosts in rank_listings().

    Returns zero for all listings if the user is absent from the interaction window
    (cold start for CF — other signals still apply).
    """
    zero = pd.Series(0.0, index=listing_ids)

    if user_id is None:
        logger.debug("cf_scores: no user_id → skipping CF")
        return zero
    if interactions.empty:
        logger.debug("cf_scores: user=%s — no interactions in window → skipping CF", user_id)
        return zero

    df = interactions.dropna(subset=["user_id"]).copy()
    if user_id not in df["user_id"].values:
        # User has no activity in the trending window — CF can't help them yet.
        logger.debug("cf_scores: user=%s not in interaction window → no CF boost", user_id)
        return zero

    df["weight"] = df["action"].map(ACTION_WEIGHTS).fillna(0)
    # Pivot to user × listing matrix; missing (user, listing) pairs become 0.
    matrix = df.groupby(["user_id", "listing_id"])["weight"].sum().unstack(fill_value=0.0)
    logger.debug("cf_scores: user-item matrix shape=%s", matrix.shape)

    if user_id not in matrix.index or len(matrix) < 2:
        # Need at least 2 users to compute similarity.
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
        # All peers have zero similarity — no useful signal.
        logger.debug("cf_scores: user=%s — all peer similarities are 0 → no CF boost", user_id)
        return zero

    # Weighted sum: (1, n_peers) @ (n_peers, n_listings) → (n_listings,)
    raw = pd.Series(sims @ other.values, index=matrix.columns)
    max_raw = raw.max()
    normalized = (raw / max_raw) if max_raw > 0 else raw
    # Reindex to the full listing set — listings not in the matrix get 0.
    result = normalized.reindex(listing_ids).fillna(0.0)
    logger.debug("cf_scores: user=%s — CF score range=[%.3f, %.3f]", user_id, result.min(), result.max())
    return result


def _relative_boost(index: pd.Index, subset: pd.DataFrame | None) -> pd.Series:
    """
    Convert a subset of interactions into a normalised boost signal (0..1) per listing.

    Used for segment and category boosts. The subset is a filtered slice of the full
    interactions_df (e.g. only rows from users in the same age group/city, or only
    rows for listings in the user's preferred categories).

    Normalising by the subset's max popularity ensures the boost is always relative —
    the most popular listing in the subset scores 1.0 regardless of absolute volume,
    so this works consistently even in low-traffic periods.
    """
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
    """
    Apply the full 8-factor scoring pipeline and return listings sorted by final score.

    Each factor multiplies the running score by (1 + weight × signal), so the
    pipeline is purely multiplicative. A listing must have baseline popularity before
    personalisation boosts matter — a listing with 0 interactions scores 0 regardless
    of how well it matches the user's profile.

    Factor application order matters: urgency is applied first (time pressure should
    amplify popular items early), then personalisation signals in decreasing
    specificity (segment → category → CF → brand → price → condition).

    Returns a DataFrame with an added 'score' column, sorted descending.
    Callers should .head(limit) to get the top N results.
    """
    logger.info(
        "rank_listings: scoring %d listings against %d interaction rows (user_id=%s)",
        len(listings), len(interactions), user_id,
    )

    scores = pd.DataFrame({"id": listings["id"]}).set_index("id")

    # --- Base: popularity weighted by action type ---
    scores["popularity"] = popularity_scores(interactions).reindex(scores.index).fillna(0)
    scores["urgency"] = urgency_scores(listings, now).reindex(scores.index).fillna(0)
    scores["score"] = scores["popularity"] * (1 + URGENCY_WEIGHT * scores["urgency"])
    logger.debug("rank_listings: after popularity+urgency — score range=[%.2f, %.2f]", scores["score"].min(), scores["score"].max())

    # --- Segment boost: listings popular among users in the same age group / city ---
    scores["segment"] = _relative_boost(scores.index, segment_interactions)
    scores["score"] = scores["score"] * (1 + SEGMENT_WEIGHT * scores["segment"])
    logger.debug("rank_listings: after segment boost — listings with boost>0: %d", int((scores["segment"] > 0).sum()))

    # --- Category boost: listings in categories the user has interacted with ---
    scores["category"] = _relative_boost(scores.index, category_interactions)
    scores["score"] = scores["score"] * (1 + CATEGORY_WEIGHT * scores["category"])
    logger.debug("rank_listings: after category boost — listings with boost>0: %d", int((scores["category"] > 0).sum()))

    # --- CF boost: listings popular among taste-similar peer users ---
    scores["cf"] = cf_scores(user_id, interactions, scores.index)
    scores["score"] = scores["score"] * (1 + CF_WEIGHT * scores["cf"])
    logger.debug("rank_listings: after CF boost — listings with boost>0: %d", int((scores["cf"] > 0).sum()))

    # --- Brand affinity: binary match against user's brand history ---
    scores["brand"] = brand_affinity_scores(scores.index, listings, user_brands or set())
    scores["score"] = scores["score"] * (1 + BRAND_WEIGHT * scores["brand"])
    logger.debug("rank_listings: after brand boost — listings with brand match: %d", int((scores["brand"] > 0).sum()))

    # --- Price affinity: proximity to user's median bid price ---
    scores["price"] = price_affinity_scores(scores.index, listings, user_median_price)
    scores["score"] = scores["score"] * (1 + PRICE_WEIGHT * scores["price"])
    logger.debug("rank_listings: after price boost — score range=[%.2f, %.2f]", scores["score"].min(), scores["score"].max())

    # --- Condition quality: AI vision confidence score as final tie-breaker ---
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
