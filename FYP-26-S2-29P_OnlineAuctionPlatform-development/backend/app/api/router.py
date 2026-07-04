from fastapi import APIRouter
from app.api.v1.controller import health, auth, auctions

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(auctions.router, prefix="/auctions", tags=["auctions"])
