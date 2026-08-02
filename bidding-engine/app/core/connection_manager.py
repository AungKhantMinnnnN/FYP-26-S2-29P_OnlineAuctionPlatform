import time
from typing import Dict, List
from fastapi import WebSocket
import logging
import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger("BiddingEngine")

# Per-user WS message throttle: reject a socket sending more than
# RATE_LIMIT_MAX_MESSAGES within RATE_LIMIT_WINDOW_SECONDS. Human bidding is
# far below this; the cap only stops floods/misbehaving clients.
RATE_LIMIT_MAX_MESSAGES = 10
RATE_LIMIT_WINDOW_SECONDS = 5.0


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

    async def allow_message(self, user_id: str) -> bool:
        """Redis-backed sliding-window rate check. Records the message and returns
        False if over the cap. Survives restarts and works across multiple workers
        unlike the previous in-memory deque."""
        if not settings.RATE_LIMIT_ENABLED:
            return True
        key = f"ratelimit:ws:{user_id}"
        now = time.time()
        window_start = now - RATE_LIMIT_WINDOW_SECONDS
        try:
            pipe = self._redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, RATE_LIMIT_WINDOW_SECONDS * 2)
            results = await pipe.execute()
            return results[1] < RATE_LIMIT_MAX_MESSAGES
        except Exception:
            logger.warning("WS rate limiter: Redis unavailable, allowing message")
            return True

    async def connect(self, websocket: WebSocket, listing_id: str):
        await websocket.accept()
        if listing_id not in self.active_connections:
            self.active_connections[listing_id] = []
        self.active_connections[listing_id].append(websocket)
        logger.info(f"Client connected to listing {listing_id}. Total active: {len(self.active_connections[listing_id])}")

    def disconnect(self, websocket: WebSocket, listing_id: str):
        if listing_id in self.active_connections:
            try:
                self.active_connections[listing_id].remove(websocket)
                logger.info(f"Client disconnected from listing {listing_id}. Total active: {len(self.active_connections[listing_id])}")
                if len(self.active_connections[listing_id]) == 0:
                    del self.active_connections[listing_id]
            except ValueError:
                pass

    async def broadcast(self, message: str, listing_id: str):
        if listing_id in self.active_connections:
            connections = self.active_connections[listing_id].copy()
            for connection in connections:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.warning(f"Error broadcasting to a client on listing {listing_id}: {str(e)}")
                    self.disconnect(connection, listing_id)


manager = ConnectionManager()