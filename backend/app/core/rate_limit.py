import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.logger import setup_logging

logger = setup_logging("RateLimit")

_redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


def _client_ip(request: Request) -> str:
    # nginx sets X-Real-IP (see docker/nginx/default.conf); fall back to the direct
    # peer address for calls that bypass it (tests hitting the backend directly).
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")


def rate_limiter(key_prefix: str, limit: int, window_seconds: int):
    """
    Fixed-window per-IP rate limit dependency. Deliberately generous (see call sites) --
    the goal is to blunt automated brute-force/credential-stuffing on auth endpoints,
    not to throttle normal usage (including this project's own QA suite, which registers
    and logs in many ephemeral accounts in quick succession from a single IP).
    """
    async def _check(request: Request) -> None:
        ip = _client_ip(request)
        key = f"ratelimit:{key_prefix}:{ip}"
        try:
            count = await _redis.incr(key)
            if count == 1:
                await _redis.expire(key, window_seconds)
        except Exception as e:
            # Fail open -- a Redis hiccup must never take down auth entirely.
            logger.warning(f"rate limiter: Redis unavailable, allowing request: {e}")
            return
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
    return _check
