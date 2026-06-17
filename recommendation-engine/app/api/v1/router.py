from fastapi import APIRouter
from app.api.v1.endpoints import recommendations

v1_router = APIRouter()
v1_router.include_router(recommendations.router)
