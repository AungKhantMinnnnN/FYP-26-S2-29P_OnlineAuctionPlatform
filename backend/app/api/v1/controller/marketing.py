from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_admin_user
from app.models.auction import User
from app.schemas.marketing import MarketingVideoListResponse
from app.services.marketing_service import MarketingService

router = APIRouter()

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/ogg"}


@router.get("/marketing-video")
async def get_marketing_video(db: AsyncSession = Depends(get_db)):
    """Public: returns the currently active hero marketing video's URL."""
    url = await MarketingService.get_active_url(db)
    if not url:
        raise HTTPException(status_code=404, detail="No marketing video uploaded yet")
    return {"url": url}


@router.post("/marketing-video", status_code=status.HTTP_204_NO_CONTENT)
async def upload_marketing_video(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: upload a new hero video. It becomes active immediately; prior
    uploads are kept in the library rather than being overwritten."""
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_VIDEO_TYPES)}"
        )
    file_bytes = await file.read()
    await MarketingService.upload_video(db, file_bytes, file.content_type, file.filename or "video", admin.id)


@router.get("/marketing-videos", response_model=MarketingVideoListResponse)
async def list_marketing_videos(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin: every saved hero video upload, newest first."""
    return {"items": await MarketingService.list_videos(db)}


@router.post("/marketing-videos/{id}/activate")
async def activate_marketing_video(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin: switch the active hero video without re-uploading."""
    return await MarketingService.activate_video(db, id)


@router.delete("/marketing-videos/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_marketing_video(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin: delete a saved (non-active) video."""
    await MarketingService.delete_video(db, id)
