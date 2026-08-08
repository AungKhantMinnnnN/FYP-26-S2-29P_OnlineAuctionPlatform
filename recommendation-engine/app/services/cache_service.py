"""
cache_service.py — Redis cache helpers for the recommendation pipeline.

All functions swallow exceptions and return None on failure, so a Redis outage is
treated as a cache miss and the pipeline falls back to a DB fetch instead of crashing.

DataFrames are serialised with orient="split" (more compact than "records") and dates
are re-cast explicitly on read (see _cast_listings_df / _cast_interactions_df in
recommendation_service.py). Plain JSON values use a custom default handler since score
values are numpy.float64, which json.dumps can't serialise natively.
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
    """Fallback for numpy scalars (pandas arithmetic produces these) and anything else."""
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.integer):
        return int(obj)
    return str(obj)


async def set_df(key: str, df: pd.DataFrame, ttl: int) -> None:
    """
    Serialise a DataFrame to JSON (orient="split", dates as ISO strings) and cache it.

    Skipped if caching is disabled or the DataFrame is empty — an empty result would
    just mask a real DB problem if cached.
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
    Timestamps -- we need datetime.date objects for age_group(), and the explicit
    cast in _cast_interactions_df handles that. Returns None on miss, disabled
    cache, or any exception, which all callers treat as a cache miss.
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
    Serialise a plain Python object (dict/list) to JSON and cache it.

    Used for recs:user:{id}:signals ({"brands": [...], "median_price": float|null})
    and recs:anonymous:{limit} (pre-scored listing dicts).
    """
    if not settings.RECS_CACHE_ENABLED:
        return
    try:
        await redis_client.set(key, json.dumps(obj, default=_json_default), ex=ttl)
        logger.debug("cache SET %s (ttl=%ds)", key, ttl)
    except Exception as exc:
        logger.warning("cache set_json failed key=%s: %s", key, exc)


async def get_json(key: str):
    """Retrieve and deserialise a JSON value from Redis, or None on miss/disabled/error."""
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
