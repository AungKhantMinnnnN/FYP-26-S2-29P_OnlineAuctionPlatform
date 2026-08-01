from typing import Dict, List, Deque
from collections import deque
from time import monotonic
from fastapi import WebSocket
import logging

logger = logging.getLogger("BiddingEngine")

# Per-connection WS message throttle: reject a socket sending more than
# RATE_LIMIT_MAX_MESSAGES within RATE_LIMIT_WINDOW_SECONDS. Human bidding is
# far below this; the cap only stops floods/misbehaving clients.
RATE_LIMIT_MAX_MESSAGES = 10
RATE_LIMIT_WINDOW_SECONDS = 5.0

class ConnectionManager:
    def __init__(self):
        # Maps listing_id to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Per-user (not per-socket) sliding window of recent message timestamps (monotonic
        # seconds) -- keying by socket let a client trivially reset its own cap by just
        # opening a new connection. Not proactively cleared on disconnect since a user can
        # hold more than one connection at once; entries just age out via the window.
        # in-memory per-process — fine for single-worker FYP scope. A multi-worker
        # deploy would need Redis-backed counters, same as the horizontal-scaling note on broadcast.
        self.message_log: Dict[str, Deque[float]] = {}

    def allow_message(self, user_id: str) -> bool:
        """Sliding-window rate check. Records the message and returns False if over the cap."""
        now = monotonic()
        log = self.message_log.setdefault(user_id, deque())
        while log and now - log[0] > RATE_LIMIT_WINDOW_SECONDS:
            log.popleft()
        if len(log) >= RATE_LIMIT_MAX_MESSAGES:
            return False
        log.append(now)
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
            # Create a copy of the list to avoid issues if connections drop during broadcast
            connections = self.active_connections[listing_id].copy()
            for connection in connections:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.warning(f"Error broadcasting to a client on listing {listing_id}: {str(e)}")
                    self.disconnect(connection, listing_id)

manager = ConnectionManager()
