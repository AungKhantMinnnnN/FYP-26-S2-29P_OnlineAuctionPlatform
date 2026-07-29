"""Unit tests for app.services.location — pure address parsing."""
import numpy as np
import pytest

from app.services import location as loc


@pytest.mark.parametrize("bad", [None, "", "   ", np.nan, 12345])
def test_parse_location_non_string_or_blank(bad):
    assert loc.parse_location(bad) == {"city": None, "region": None}


def test_parse_location_single_part_is_city_only():
    assert loc.parse_location("Singapore") == {"city": "singapore", "region": None}


def test_parse_location_city_and_state_zip():
    # last part matches "<2 letters><optional zip>" -> region, second-to-last -> city
    assert loc.parse_location("123 Main St, Austin, TX 78701") == {"city": "austin", "region": "TX"}


def test_parse_location_no_state_falls_back_to_last_part():
    assert loc.parse_location("Downtown, Kuala Lumpur") == {"city": "kuala lumpur", "region": None}


def test_normalize_collapses_whitespace_and_lowercases():
    assert loc._normalize("  New   YORK ") == "new york"
