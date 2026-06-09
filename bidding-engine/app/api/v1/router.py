from fastapi import APIRouter
from app.api.v1.endpoints import bids

v1_router = APIRouter()

# Include bids endpoints (both HTTP and WebSocket endpoints will be included)
v1_router.include_router(bids.router)
