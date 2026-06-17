from fastapi import APIRouter
from app.core.config import settings
from app.services.recommendation_service import RecommendationService

router = APIRouter()

@router.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "recommendation-engine", "version": settings.API_VERSION}

@router.get("/trending", tags=["recommendations"])
async def get_trending_items():
    return RecommendationService.get_trending_items()
