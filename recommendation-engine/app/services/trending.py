import datetime
import pandas as pd

ACTION_WEIGHTS = {
    "bid": 5.0,
    "watchlist": 3.0,
    "view": 1.0,
    "search": 1.0,
}
TRENDING_WINDOW_DAYS = 7
ENDING_SOON_WINDOW_HOURS = 72
URGENCY_WEIGHT = 0.5    # ending-soon listings get up to +50% score
SEGMENT_WEIGHT = 0.5    # listings trending in the user's age group/location get up to +50% more
CATEGORY_WEIGHT = 0.5   # listings trending in a category the user has interacted with get up to +50% more


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
) -> pd.DataFrame:
    scores = pd.DataFrame({"id": listings["id"]}).set_index("id")
    scores["popularity"] = popularity_scores(interactions).reindex(scores.index).fillna(0)
    scores["urgency"] = urgency_scores(listings, now).reindex(scores.index).fillna(0)
    scores["score"] = scores["popularity"] * (1 + URGENCY_WEIGHT * scores["urgency"])

    scores["segment"] = _relative_boost(scores.index, segment_interactions)
    scores["score"] = scores["score"] * (1 + SEGMENT_WEIGHT * scores["segment"])

    scores["category"] = _relative_boost(scores.index, category_interactions)
    scores["score"] = scores["score"] * (1 + CATEGORY_WEIGHT * scores["category"])

    return scores.reset_index().merge(listings, on="id").sort_values("score", ascending=False)
