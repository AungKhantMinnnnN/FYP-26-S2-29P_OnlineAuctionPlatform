import time
import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from app.core.config import settings

_redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


def rate_limiter(key_prefix: str, limit: int, window_seconds: int):
    """
    Sliding-window per-IP rate limit dependency backed by Redis sorted sets.
    """
    async def _check(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")
        key = f"ratelimit:{key_prefix}:{ip}"
        now = time.time()
        window_start = now - window_seconds
        try:
            pipe = _redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, window_seconds * 2)
            results = await pipe.execute()
            count = results[1]
        except Exception:
            return
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
    return _check