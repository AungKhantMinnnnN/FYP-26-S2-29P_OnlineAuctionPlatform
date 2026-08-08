import time
import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger("rate_limit")

_redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


def _client_ip(request: Request) -> str:
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")


def rate_limiter(key_prefix: str, limit: int, window_seconds: int):
    """Sliding-window per-IP rate limit backed by Redis sorted sets, avoiding the
    boundary spikes fixed-window INCR/EXPIRE would allow."""
    async def _check(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        ip = _client_ip(request)
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
        except Exception as e:
            logger.warning(f"rate limiter: Redis unavailable, allowing request: {e}")
            return
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
    return _check