import datetime
import pandas as pd

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
    """Weighted interaction count per listing_id."""
    if interactions.empty:
        return pd.Series(dtype=float)
    weights = interactions["action"].map(ACTION_WEIGHTS).fillna(0)
    return weights.groupby(interactions["listing_id"]).sum()


def urgency_scores(listings: pd.DataFrame, now: datetime.datetime) -> pd.Series:
    """0..1, rising linearly as end_time approaches; 0 outside the window or past end_time."""
    if listings.empty:
        return pd.Series(dtype=float)
    end_time = pd.to_datetime(listings["end_time"], utc=True)
    hours_remaining = (end_time - now).dt.total_seconds() / 3600
    score = ((ENDING_SOON_WINDOW_HOURS - hours_remaining) / ENDING_SOON_WINDOW_HOURS).clip(lower=0, upper=1)
    score[hours_remaining < 0] = 0
    return pd.Series(score.values, index=listings["id"])


def brand_affinity_scores(listing_ids: pd.Index, listings: pd.DataFrame, user_brands: set) -> pd.Series:
    """Binary 0/1 — listing's brand is in the user's brand history."""
    if not user_brands or "brand" not in listings.columns:
        return pd.Series(0.0, index=listing_ids)
    brands = listings.set_index("id")["brand"].reindex(listing_ids)
    return brands.isin(user_brands).astype(float)


def price_affinity_scores(listing_ids: pd.Index, listings: pd.DataFrame, user_median_price: float | None) -> pd.Series:
    """Linear decay: 1.0 at exact median match, 0.0 at 2× deviation. Null price → 0.5 neutral."""
    if user_median_price is None or user_median_price <= 0 or "current_price" not in listings.columns:
        return pd.Series(0.5, index=listing_ids)
    prices = listings.set_index("id")["current_price"].reindex(listing_ids)
    score = (1.0 - (prices - user_median_price).abs() / (2 * user_median_price)).clip(0.0, 1.0)
    return score.fillna(0.5)


def condition_quality_scores(listing_ids: pd.Index, listings: pd.DataFrame) -> pd.Series:
    """Normalised condition_confidence 0..1. Null confidence treated as 0.5 (neutral)."""
    if "condition_confidence" not in listings.columns:
        return pd.Series(0.5, index=listing_ids)
    conf = listings.set_index("id")["condition_confidence"].reindex(listing_ids).fillna(50.0)
    return (conf / 100.0).clip(0.0, 1.0)


def _relative_boost(index: pd.Index, subset: pd.DataFrame | None) -> pd.Series:
    """Each listing's popularity within `subset`, normalized 0..1 against the subset's top listing."""
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
) -> pd.DataFrame:
    scores = pd.DataFrame({"id": listings["id"]}).set_index("id")
    scores["popularity"] = popularity_scores(interactions).reindex(scores.index).fillna(0)
    scores["urgency"] = urgency_scores(listings, now).reindex(scores.index).fillna(0)
    scores["score"] = scores["popularity"] * (1 + URGENCY_WEIGHT * scores["urgency"])

    scores["segment"] = _relative_boost(scores.index, segment_interactions)
    scores["score"] = scores["score"] * (1 + SEGMENT_WEIGHT * scores["segment"])

    scores["category"] = _relative_boost(scores.index, category_interactions)
    scores["score"] = scores["score"] * (1 + CATEGORY_WEIGHT * scores["category"])

    scores["brand"] = brand_affinity_scores(scores.index, listings, user_brands or set())
    scores["score"] = scores["score"] * (1 + BRAND_WEIGHT * scores["brand"])

    scores["price"] = price_affinity_scores(scores.index, listings, user_median_price)
    scores["score"] = scores["score"] * (1 + PRICE_WEIGHT * scores["price"])

    scores["condition"] = condition_quality_scores(scores.index, listings)
    scores["score"] = scores["score"] * (1 + CONDITION_WEIGHT * scores["condition"])

    return scores.reset_index().merge(listings, on="id").sort_values("score", ascending=False)
