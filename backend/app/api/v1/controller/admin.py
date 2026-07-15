from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.auction import User
from app.api.deps import get_admin_user
from app.schemas.admin import PlatformStats
from app.services.admin_service import AdminService

router = APIRouter()


# ── Admin: platform activity stats ───────────────────────────────────────────

@router.get("/stats", response_model=PlatformStats)
async def get_platform_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin: aggregate platform-wide activity and volume metrics."""
    return await AdminService.get_platform_stats(db)
