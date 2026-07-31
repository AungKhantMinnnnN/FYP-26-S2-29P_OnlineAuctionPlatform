"""Unit tests for the pure scoring functions in app.services.trending.

All functions here are stateless (DataFrame in -> Series/DataFrame out), so these
run with no DB, no Redis, no network. See the module docstring in trending.py.
"""
import datetime
import uuid

import numpy as np
import pandas as pd
import pytest

from app.services import trending as t

UTC = datetime.timezone.utc


# --------------------------------------------------------------------------- age_group
def test_age_group_none_returns_none():
    assert t.age_group(None) is None


@pytest.mark.parametrize("years,expected", [
    (10, "under_18"), (17, "under_18"),
    (18, "18_24"), (24, "18_24"),
    (25, "25_34"), (34, "25_34"),
    (35, "35_44"), (44, "35_44"),
    (45, "45_54"), (54, "45_54"),
    (55, "55_plus"), (90, "55_plus"),
])
def test_age_group_buckets(years, expected):
    today = datetime.date(2026, 6, 15)
    dob = datetime.date(today.year - years, 6, 15)  # birthday already passed this year
    assert t.age_group(dob, today) == expected


def test_age_group_birthday_not_yet_this_year():
    # Born Dec 31; on Jun 15 the birthday hasn't occurred -> one year younger.
    today = datetime.date(2026, 6, 15)
    dob = datetime.date(2008, 12, 31)  # turns 18 on Dec 31 2026, so still 17 today
    assert t.age_group(dob, today) == "under_18"


# --------------------------------------------------------------------- popularity_scores
def test_popularity_scores_empty():
    out = t.popularity_scores(pd.DataFrame(columns=["listing_id", "action"]))
    assert out.empty


def test_popularity_scores_weighted_sum_per_listing():
    df = pd.DataFrame({
        "listing_id": ["a", "a", "b"],
        "action": ["view", "bid", "watchlist"],  # 1 + 5 = 6 ; 3
    })
    out = t.popularity_scores(df)
    assert out["a"] == pytest.approx(6.0)
    assert out["b"] == pytest.approx(3.0)


def test_popularity_scores_unknown_action_is_zero_weight():
    df = pd.DataFrame({"listing_id": ["a"], "action": ["frobnicate"]})
    assert t.popularity_scores(df)["a"] == pytest.approx(0.0)


# ------------------------------------------------------------------------ urgency_scores
def test_urgency_scores_empty():
    assert t.urgency_scores(pd.DataFrame(columns=["id", "end_time"]), datetime.datetime.now(UTC)).empty


def test_urgency_scores_linear_and_clamped():
    now = datetime.datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
    listings = pd.DataFrame({
        "id": ["soon", "boundary", "ended"],
        "end_time": [now + datetime.timedelta(hours=1),
                     now + datetime.timedelta(hours=72),
                     now - datetime.timedelta(hours=1)],
    })
    out = t.urgency_scores(listings, now)
    assert out["soon"] == pytest.approx((72 - 1) / 72, rel=1e-3)  # approx 0.986
    assert out["boundary"] == pytest.approx(0.0)                  # exactly at window edge
    assert out["ended"] == pytest.approx(0.0)                     # already ended -> 0


# ----------------------------------------------------------------- brand_affinity_scores
def test_brand_affinity_binary_match():
    listings = pd.DataFrame({"id": ["a", "b"], "brand": ["Nike", "Adidas"]})
    ids = pd.Index(["a", "b"])
    out = t.brand_affinity_scores(ids, listings, {"Nike"})
    assert out["a"] == 1.0 and out["b"] == 0.0


def test_brand_affinity_no_user_brands_all_zero():
    listings = pd.DataFrame({"id": ["a"], "brand": ["Nike"]})
    assert (t.brand_affinity_scores(pd.Index(["a"]), listings, set()) == 0.0).all()


def test_brand_affinity_missing_column_all_zero():
    listings = pd.DataFrame({"id": ["a"]})
    assert (t.brand_affinity_scores(pd.Index(["a"]), listings, {"Nike"}) == 0.0).all()


# ----------------------------------------------------------------- price_affinity_scores
def test_price_affinity_formula():
    listings = pd.DataFrame({"id": ["a", "b", "c"], "current_price": [100.0, 300.0, 50.0]})
    ids = pd.Index(["a", "b", "c"])
    out = t.price_affinity_scores(ids, listings, user_median_price=100.0)
    assert out["a"] == pytest.approx(1.0)    # exact median
    assert out["b"] == pytest.approx(0.0)    # 3x median -> 0
    assert out["c"] == pytest.approx(0.75)   # 1 - 50/200


@pytest.mark.parametrize("median", [None, 0, -5])
def test_price_affinity_no_history_neutral_half(median):
    listings = pd.DataFrame({"id": ["a"], "current_price": [100.0]})
    assert (t.price_affinity_scores(pd.Index(["a"]), listings, median) == 0.5).all()


# ------------------------------------------------------------- condition_quality_scores
def test_condition_quality_scaled_and_default():
    listings = pd.DataFrame({"id": ["a", "b"], "condition_confidence": [80.0, np.nan]})
    out = t.condition_quality_scores(pd.Index(["a", "b"]), listings)
    assert out["a"] == pytest.approx(0.8)
    assert out["b"] == pytest.approx(0.5)  # missing -> 50 -> 0.5


def test_condition_quality_missing_column_neutral():
    listings = pd.DataFrame({"id": ["a"]})
    assert (t.condition_quality_scores(pd.Index(["a"]), listings) == 0.5).all()


# ----------------------------------------------------------------------------- cf_scores
def _interactions_two_users():
    u1, u2 = uuid.uuid4(), uuid.uuid4()
    df = pd.DataFrame({
        "user_id": [u1, u1, u2, u2],
        "listing_id": ["a", "b", "b", "c"],
        "action": ["bid", "view", "bid", "bid"],
    })
    return u1, u2, df


def test_cf_scores_anonymous_returns_zero():
    _, _, df = _interactions_two_users()
    assert (t.cf_scores(None, df, pd.Index(["a", "b", "c"])) == 0.0).all()


def test_cf_scores_user_absent_returns_zero():
    _, _, df = _interactions_two_users()
    stranger = uuid.uuid4()
    assert (t.cf_scores(stranger, df, pd.Index(["a", "b", "c"])) == 0.0).all()


def test_cf_scores_empty_interactions_returns_zero():
    assert (t.cf_scores(uuid.uuid4(), pd.DataFrame(columns=["user_id", "listing_id", "action"]),
                        pd.Index(["a"])) == 0.0).all()


def test_cf_scores_propagates_from_similar_peer():
    u1, _, df = _interactions_two_users()
    out = t.cf_scores(u1, df, pd.Index(["a", "b", "c"]))
    # u1 already engaged 'a'; peer u2 engaged 'b' and 'c'. Similarity propagates b/c to u1.
    assert out["a"] == pytest.approx(0.0)         # only u1 touched 'a' -> no peer signal
    assert out["b"] == pytest.approx(1.0)         # normalised to max
    assert out["c"] == pytest.approx(1.0)
    assert out.between(0.0, 1.0).all()


# ------------------------------------------------------------------------ _relative_boost
def test_relative_boost_none_and_empty_are_zero():
    idx = pd.Index(["a", "b"])
    assert (t._relative_boost(idx, None) == 0.0).all()
    assert (t._relative_boost(idx, pd.DataFrame(columns=["listing_id", "action"])) == 0.0).all()


def test_relative_boost_normalised_to_max():
    subset = pd.DataFrame({"listing_id": ["a", "a", "b"], "action": ["bid", "view", "view"]})
    out = t._relative_boost(pd.Index(["a", "b", "c"]), subset)  # a=6, b=1, max=6
    assert out["a"] == pytest.approx(1.0)
    assert out["b"] == pytest.approx(1 / 6)
    assert out["c"] == pytest.approx(0.0)  # not in subset


# --------------------------------------------------------------------------- rank_listings
def _rank_fixture():
    now = datetime.datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
    listings = pd.DataFrame({
        "id": ["a", "b"],
        "end_time": [now + datetime.timedelta(hours=100)] * 2,  # not ending soon
        "brand": ["Nike", "Other"],
        "current_price": [100.0, 100.0],
        "condition_confidence": [50.0, 50.0],
    })
    interactions = pd.DataFrame({"listing_id": ["a"], "user_id": [None], "action": ["bid"]})
    return listings, interactions, now


def test_rank_listings_zero_popularity_scores_zero():
    """A listing with no interactions scores 0 regardless of personalisation matches."""
    listings, interactions, now = _rank_fixture()
    out = t.rank_listings(listings, interactions, now)
    b_row = out[out["id"] == "b"].iloc[0]
    assert b_row["score"] == pytest.approx(0.0)


def test_rank_listings_sorted_descending_and_has_score_column():
    listings, interactions, now = _rank_fixture()
    out = t.rank_listings(listings, interactions, now)
    assert "score" in out.columns
    assert out.iloc[0]["id"] == "a"                       # only 'a' has popularity
    assert out.iloc[0]["score"] > out.iloc[-1]["score"]
    assert list(out["score"]) == sorted(out["score"], reverse=True)


def test_rank_listings_empty_listings_empty_result():
    _, interactions, now = _rank_fixture()
    empty = pd.DataFrame({"id": [], "end_time": [], "brand": [], "current_price": [], "condition_confidence": []})
    out = t.rank_listings(empty, interactions, now)
    assert out.empty
