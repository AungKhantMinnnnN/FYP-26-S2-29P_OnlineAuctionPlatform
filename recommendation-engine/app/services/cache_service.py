"""
cache_service.py — Redis cache helpers for the recommendation pipeline.

All functions swallow exceptions and return None on failure. This means Redis
being down or unreachable is treated as a cache miss — the pipeline falls back
to a DB fetch automatically. The recommendation engine never crashes because
of a cache layer problem.

Two storage formats:
  - DataFrames (listings_df, interactions_df): serialised with orient="split" which
    preserves column names and produces more compact JSON than orient="records".
    Dates are written as ISO strings and must be explicitly re-cast on read
    (see _cast_listings_df / _cast_interactions_df in recommendation_service.py).
  - JSON (user signals, anonymous result): standard json.dumps with a custom
    default handler for numpy scalars (score values are numpy.float64 and would
    raise TypeError with the default serialiser).

RECS_CACHE_ENABLED=false bypasses all reads and writes, letting you test the
pipeline with fresh DB hits on every request without flushing Redis.
"""

import json
import logging
from io import StringIO

import numpy as np
import pandas as pd

from app.core.config import settings
from app.core.redis import redis_client

logger = logging.getLogger(__name__)


def _json_default(obj):
    """
    Custom JSON serialiser for types that json.dumps can't handle by default.

    numpy.float64 / numpy.int64 values appear in the score map because pandas
    arithmetic produces numpy scalars. Calling .item() converts them to native
    Python floats/ints which json.dumps can serialise. Everything else falls back
    to str() — this is a last resort for unexpected types and avoids hard crashes.
    """
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.integer):
        return int(obj)
    return str(obj)


async def set_df(key: str, df: pd.DataFrame, ttl: int) -> None:
    """
    Serialise a DataFrame to JSON and store it in Redis with a TTL.

    orient="split" format: {"columns": [...], "index": [...], "data": [[...], ...]}.
    More compact than orient="records" for wide DataFrames (column names written once).
    convert_dates=False on read (in get_df) is paired with date_format="iso" here —
    dates are stored as strings and re-parsed explicitly to avoid pandas auto-detection
    converting them to Timestamps when we need datetime.date objects.

    Skipped silently if caching is disabled or the DataFrame is empty — no point
    caching an empty result that would just mask a real DB problem.
    """
    if not settings.RECS_CACHE_ENABLED or df.empty:
        return
    try:
        payload = df.to_json(orient="split", date_format="iso", default_handler=str)
        await redis_client.set(key, payload, ex=ttl)
        logger.debug("cache SET %s (%d rows, ttl=%ds)", key, len(df), ttl)
    except Exception as exc:
        logger.warning("cache set_df failed key=%s: %s", key, exc)


async def get_df(key: str) -> pd.DataFrame | None:
    """
    Retrieve and deserialise a DataFrame from Redis.

    convert_dates=False prevents pandas from auto-converting ISO date strings to
    Timestamps — we need datetime.date objects for age_group() calculations, and
    the explicit cast in _cast_interactions_df handles this correctly.

    Returns None on miss, disabled cache, or any exception (treated as cache miss
    by all callers — triggers a DB fetch instead).
    """
    if not settings.RECS_CACHE_ENABLED:
        return None
    try:
        raw = await redis_client.get(key)
        if raw is None:
            logger.info("[CACHE MISS] %s — will fetch from DB", key)
            return None
        df = pd.read_json(StringIO(raw), orient="split", convert_dates=False)
        logger.info("[CACHE HIT]  %s (%d rows)", key, len(df))
        return df
    except Exception as exc:
        logger.warning("cache get_df failed key=%s: %s", key, exc)
        return None


async def set_json(key: str, obj, ttl: int) -> None:
    """
    Serialise a plain Python object (dict/list) to JSON and store it in Redis with a TTL.

    Used for:
      - recs:user:{id}:signals  → {"brands": [...], "median_price": float|null}
      - recs:anonymous:{limit}  → list of listing dicts (pre-scored, full payload)

    The custom _json_default handler is needed because score values computed by
    pandas/numpy are numpy.float64 objects, not native Python floats.
    """
    if not settings.RECS_CACHE_ENABLED:
        return
    try:
        await redis_client.set(key, json.dumps(obj, default=_json_default), ex=ttl)
        logger.debug("cache SET %s (ttl=%ds)", key, ttl)
    except Exception as exc:
        logger.warning("cache set_json failed key=%s: %s", key, exc)


async def get_json(key: str):
    """
    Retrieve and deserialise a JSON value from Redis.

    Returns None on miss, disabled cache, or any exception (treated as cache miss —
    the caller recomputes and re-caches).
    """
    if not settings.RECS_CACHE_ENABLED:
        return None
    try:
        raw = await redis_client.get(key)
        if raw is None:
            logger.info("[CACHE MISS] %s — will recompute", key)
            return None
        logger.info("[CACHE HIT]  %s", key)
        return json.loads(raw)
    except Exception as exc:
        logger.warning("cache get_json failed key=%s: %s", key, exc)
        return None
