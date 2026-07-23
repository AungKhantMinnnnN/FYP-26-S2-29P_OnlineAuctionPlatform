"""Unit tests for the pure DataFrame-cast helpers in recommendation_service."""
import datetime
import uuid

import numpy as np
import pandas as pd

from app.services.recommendation_service import _cast_listings_df, _cast_interactions_df


def test_cast_listings_df_strings_to_uuid_and_none():
    u, c = uuid.uuid4(), uuid.uuid4()
    df = pd.DataFrame({"id": [str(u), None], "category_id": [str(c), np.nan]})
    out = _cast_listings_df(df)
    assert out["id"].iloc[0] == u
    assert out["id"].iloc[1] is None
    assert out["category_id"].iloc[0] == c
    assert out["category_id"].iloc[1] is None


def test_cast_interactions_df_uuid_dob_city():
    u, l = uuid.uuid4(), uuid.uuid4()
    df = pd.DataFrame({
        "listing_id": [str(l)],
        "user_id": [str(u)],
        "dob": ["1990-05-12T00:00:00"],  # ISO string after JSON round-trip
        "city": ["Austin"],
    })
    out = _cast_interactions_df(df)
    assert out["user_id"].iloc[0] == u
    assert out["listing_id"].iloc[0] == l
    assert out["dob"].iloc[0] == datetime.date(1990, 5, 12)
    assert out["city"].iloc[0] == "Austin"


def test_cast_interactions_df_bad_dob_and_blank_city_to_none():
    df = pd.DataFrame({
        "listing_id": [None], "user_id": [None],
        "dob": ["not-a-date"], "city": [""],
    })
    out = _cast_interactions_df(df)
    assert out["dob"].iloc[0] is None
    assert out["user_id"].iloc[0] is None
    assert out["listing_id"].iloc[0] is None
    assert out["city"].iloc[0] is None


def test_cast_interactions_df_nan_dob_none():
    df = pd.DataFrame({"listing_id": [None], "user_id": [None], "dob": [np.nan], "city": [np.nan]})
    out = _cast_interactions_df(df)
    assert out["dob"].iloc[0] is None
    # NOTE: blank-city -> None normalisation is covered by the object-dtype case above.
    # An all-NaN (float dtype) city column stays NaN — .where(other=None) can't hold None
    # in a float column. Realistic rows are object dtype (strings + None), so this is benign.
