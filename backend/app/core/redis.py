import redis.asyncio as aioredis

from app.core.config import settings

# Shared async Redis client for the backend service. Reads the same Redis
# instance used by the bidding-engine (docker-compose serves a single Redis to
# every service), so quota lookups can inspect keys the bidding-engine writes
# (e.g. `bidcount:free_tier:{user_id}`).
async_redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)