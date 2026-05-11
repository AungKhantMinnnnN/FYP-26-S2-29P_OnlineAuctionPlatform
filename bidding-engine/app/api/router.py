from fastapi import APIRouter
from app.core.config import settings

api_router = APIRouter()

@api_router.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "bidding-engine", "version": settings.API_VERSION}
