"""Unit tests for app.core.text_matching — dependency-free fuzzy keyword matching."""
from app.core.text_matching import (
    keyword_matches, _normalize, _tokenize, _damerau_levenshtein, _fuzzy_threshold,
)


def test_normalize_strips_and_deleets():
    assert _normalize("G.U.N") == "gun"     # separators removed
    assert _normalize("9un") == "gun"       # leetspeak 9 -> g


def test_tokenize_splits_on_non_alnum():
    assert _tokenize("hello, world") == ["hello", "world"]
    # tokenize also de-leets: '!' maps to 'i', so "world!" tokenizes to "worldi"
    assert _tokenize("world!") == ["worldi"]


def test_damerau_levenshtein_known_distances():
    assert _damerau_levenshtein("abc", "abc") == 0
    assert _damerau_levenshtein("cocaine", "cocain") == 1   # single deletion
    assert _damerau_levenshtein("ab", "ba") == 1            # adjacent transposition


def test_fuzzy_threshold_capped_at_one():
    assert _fuzzy_threshold(4) == 1
    assert _fuzzy_threshold(20) == 1


def test_empty_inputs_never_match():
    assert keyword_matches("", "some text") is False
    assert keyword_matches("gun", "") is False


def test_plain_substring_and_plural():
    assert keyword_matches("gun", "these guns are illegal") is True


def test_obfuscation_leetspeak_and_separators():
    assert keyword_matches("gun", "buying a 9un cheap") is True
    assert keyword_matches("gun", "g.u.n for sale") is True


def test_typo_matches_for_long_keyword():
    assert keyword_matches("cocaine", "selling cocain here") is True


def test_short_keyword_skips_fuzzy():
    # "gun" is only 3 chars, so a distance-1 typo like "gum" must NOT match.
    assert keyword_matches("gun", "chewing gum") is False


def test_clean_text_no_false_positive():
    assert keyword_matches("heroin", "the weather is lovely today") is False
