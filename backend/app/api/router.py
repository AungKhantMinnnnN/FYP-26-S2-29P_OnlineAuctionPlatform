from fastapi import APIRouter
from app.api.v1.controller import health, auth

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
