from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.api.deps import get_admin_user
from app.models.auction import User
from app.core.storage import storage_service

router = APIRouter()

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/ogg"}


@router.get("/marketing-video")
async def get_marketing_video():
    """Public: returns a 1-hour presigned URL for the hero marketing video."""
    url = storage_service.get_marketing_video_url()
    if not url:
        raise HTTPException(status_code=404, detail="No marketing video uploaded yet")
    return {"url": url}


@router.post("/marketing-video", status_code=status.HTTP_204_NO_CONTENT)
async def upload_marketing_video(
    file: UploadFile = File(...),
    _: User = Depends(get_admin_user),
):
    """Admin: upload (or replace) the hero marketing video."""
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_VIDEO_TYPES)}"
        )
    file_bytes = await file.read()
    storage_service.upload_marketing_video(file_bytes, file.content_type)
