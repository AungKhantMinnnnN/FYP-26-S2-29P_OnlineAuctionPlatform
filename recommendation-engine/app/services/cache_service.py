import json
import logging
from io import StringIO

import numpy as np
import pandas as pd

from app.core.config import settings
from app.core.redis import redis_client

logger = logging.getLogger(__name__)


def _json_default(obj):
    """Handle numpy scalars and other non-serializable types."""
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.integer):
        return int(obj)
    return str(obj)


async def set_df(key: str, df: pd.DataFrame, ttl: int) -> None:
    if not settings.RECS_CACHE_ENABLED or df.empty:
        return
    try:
        payload = df.to_json(orient="split", date_format="iso", default_handler=str)
        await redis_client.set(key, payload, ex=ttl)
        logger.debug("cache SET %s (%d rows, ttl=%ds)", key, len(df), ttl)
    except Exception as exc:
        logger.warning("cache set_df failed key=%s: %s", key, exc)


async def get_df(key: str) -> pd.DataFrame | None:
    if not settings.RECS_CACHE_ENABLED:
        return None
    try:
        raw = await redis_client.get(key)
        if raw is None:
            logger.debug("cache MISS %s", key)
            return None
        df = pd.read_json(StringIO(raw), orient="split", convert_dates=False)
        logger.debug("cache HIT %s (%d rows)", key, len(df))
        return df
    except Exception as exc:
        logger.warning("cache get_df failed key=%s: %s", key, exc)
        return None


async def set_json(key: str, obj, ttl: int) -> None:
    if not settings.RECS_CACHE_ENABLED:
        return
    try:
        await redis_client.set(key, json.dumps(obj, default=_json_default), ex=ttl)
        logger.debug("cache SET %s (ttl=%ds)", key, ttl)
    except Exception as exc:
        logger.warning("cache set_json failed key=%s: %s", key, exc)


async def get_json(key: str):
    if not settings.RECS_CACHE_ENABLED:
        return None
    try:
        raw = await redis_client.get(key)
        if raw is None:
            logger.debug("cache MISS %s", key)
            return None
        logger.debug("cache HIT %s", key)
        return json.loads(raw)
    except Exception as exc:
        logger.warning("cache get_json failed key=%s: %s", key, exc)
        return None
