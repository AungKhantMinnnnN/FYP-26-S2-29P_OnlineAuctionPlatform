from fastapi import APIRouter
from app.core.config import settings

api_router = APIRouter()

# Placeholder for actual endpoints
@api_router.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "version": settings.API_VERSION}

# We will include routers from endpoints here
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
