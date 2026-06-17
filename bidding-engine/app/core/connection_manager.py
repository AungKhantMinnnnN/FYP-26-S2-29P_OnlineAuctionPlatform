from typing import Dict, List
from fastapi import WebSocket
import logging

logger = logging.getLogger("BiddingEngine")

class ConnectionManager:
    def __init__(self):
        # Maps listing_id to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

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
