"""Dependency-free fuzzy matching for prohibited-keyword detection.

Catches direct usage and plurals/suffixes (plain substring), symbol/leetspeak
obfuscation and separator-inserted spelling like "g.u.n" or "9un" (normalized
substring), and simple typos/transpositions like "cocain" or "herion"
(Damerau-Levenshtein distance on individual word tokens).
"""
import re
from typing import List

_LEETSPEAK_MAP = str.maketrans({
    '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
    '@': 'a', '$': 's', '!': 'i', '|': 'l',
})

_NON_ALNUM_RE = re.compile(r'[^a-z0-9]+')


def _normalize(text: str) -> str:
    """Lowercase, apply leetspeak substitutions, strip everything but letters/digits."""
    return _NON_ALNUM_RE.sub('', text.lower().translate(_LEETSPEAK_MAP))


def _tokenize(text: str) -> List[str]:
    lowered = text.lower().translate(_LEETSPEAK_MAP)
    return [t for t in _NON_ALNUM_RE.sub(' ', lowered).split(' ') if t]


def _damerau_levenshtein(a: str, b: str) -> int:
    """Edit distance allowing insert/delete/substitute/adjacent-transpose, each cost 1."""
    la, lb = len(a), len(b)
    d = [[0] * (lb + 1) for _ in range(la + 1)]
    for i in range(la + 1):
        d[i][0] = i
    for j in range(lb + 1):
        d[0][j] = j
    for i in range(1, la + 1):
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            d[i][j] = min(
                d[i - 1][j] + 1,          # deletion
                d[i][j - 1] + 1,          # insertion
                d[i - 1][j - 1] + cost,   # substitution
            )
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + cost)  # adjacent transposition
    return d[la][lb]


def _fuzzy_threshold(keyword_len: int) -> int:
    # Capped at 1: distance 2 flags too many coincidental real words (e.g. "heron"
    # vs "heroin"). Not perfect, but the admin Flagged Attempts log lets an admin
    # retire an overly collision-prone keyword.
    return 1


def keyword_matches(keyword: str, text: str) -> bool:
    """True if `keyword` appears in `text` exactly, obfuscated, or with a minor typo."""
    if not keyword or not text:
        return False

    keyword_lower = keyword.lower()
    text_lower = text.lower()

    # Plain substring — also catches plurals/suffixes ("guns" contains "gun").
    if keyword_lower in text_lower:
        return True

    # Normalized substring — catches symbol substitution ("9un") and separator-inserted
    # spelling ("g.u.n") via leetspeak/punctuation stripping.
    normalized_keyword = _normalize(keyword_lower)
    if normalized_keyword and normalized_keyword in _normalize(text_lower):
        return True

    # Fuzzy token match for typos ("cocain", "herion"); skipped for short keywords
    # where distance-1 is too permissive ("gun" would also match "sun", "fun", "run").
    if len(normalized_keyword) < 4:
        return False

    threshold = _fuzzy_threshold(len(normalized_keyword))
    for token in _tokenize(text_lower):
        if abs(len(token) - len(normalized_keyword)) > threshold:
            continue
        if _damerau_levenshtein(normalized_keyword, token) <= threshold:
            return True

    return False
