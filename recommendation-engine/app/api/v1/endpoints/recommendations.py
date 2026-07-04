import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.services import recommendation_service
from app.schemas.recommendations import TrendingResponse, TrendingListing

router = APIRouter()

@router.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "recommendation-engine", "version": settings.API_VERSION}

@router.get("/trending", response_model=TrendingResponse, tags=["recommendations"])
async def get_trending_items(
    user_id: Optional[uuid.UUID] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, personalized = await recommendation_service.get_trending(db, user_id=user_id, limit=limit)
    return TrendingResponse(
        items=[TrendingListing(**item) for item in items],
        count=len(items),
        type="personalized" if personalized else "trending",
    )
