import redis.asyncio as aioredis
from app.core.config import settings
import logging

logger = logging.getLogger("BiddingEngine")

# Initialize global Redis client for locking and caching
url = settings.REDIS_URL
if "upstash.io" in url and url.startswith("redis://"):
    url = url.replace("redis://", "rediss://")

redis_client = aioredis.from_url(
    url,
    encoding="utf-8",
    decode_responses=True,
    max_connections=10
)

async def get_redis_client() -> aioredis.Redis:
    """Dependency injection for Redis client if needed"""
    return redis_client
