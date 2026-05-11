from fastapi import APIRouter
from app.core.config import settings

api_router = APIRouter()

@api_router.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "recommendation-engine", "version": settings.API_VERSION}

@api_router.get("/trending", tags=["recommendations"])
async def get_trending_items():
    # Placeholder for Cold Start / Trending logic
    return {"items": [], "count": 0, "type": "trending"}
