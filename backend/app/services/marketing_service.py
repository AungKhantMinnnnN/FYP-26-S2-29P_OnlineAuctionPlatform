import uuid
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException

from app.core.storage import storage_service
from app.models.auction import MarketingVideo


def _to_item(video: MarketingVideo) -> dict:
    return {
        "id": video.id,
        "url": storage_service.get_video_url(video.s3_key),
        "original_filename": video.original_filename,
        "is_active": video.is_active,
        "created_at": video.created_at,
    }


class MarketingService:
    @staticmethod
    async def list_videos(db: AsyncSession) -> List[dict]:
        result = await db.execute(select(MarketingVideo).order_by(MarketingVideo.created_at.desc()))
        return [_to_item(video) for video in result.scalars().all()]

    @staticmethod
    async def get_active_url(db: AsyncSession) -> Optional[str]:
        active = await db.scalar(select(MarketingVideo).where(MarketingVideo.is_active.is_(True)))
        return storage_service.get_video_url(active.s3_key) if active else None

    @staticmethod
    async def upload_video(
        db: AsyncSession, file_bytes: bytes, content_type: str, filename: str, admin_id: UUID,
    ) -> dict:
        ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
        object_key = f"marketing/{uuid.uuid4()}.{ext}" if ext else f"marketing/{uuid.uuid4()}"
        storage_service.upload_video(file_bytes, content_type, object_key)

        # New upload becomes the active video immediately (keeps the existing simple
        # upload-button UX); every prior upload stays in the library, just inactive.
        await db.execute(update(MarketingVideo).values(is_active=False))
        video = MarketingVideo(
            s3_key=object_key, original_filename=filename, content_type=content_type,
            is_active=True, uploaded_by=admin_id,
        )
        db.add(video)
        await db.commit()
        await db.refresh(video)
        return _to_item(video)

    @staticmethod
    async def activate_video(db: AsyncSession, video_id: UUID) -> dict:
        video = await db.scalar(select(MarketingVideo).where(MarketingVideo.id == video_id))
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        await db.execute(update(MarketingVideo).values(is_active=False))
        video.is_active = True
        await db.commit()
        await db.refresh(video)
        return _to_item(video)

    @staticmethod
    async def delete_video(db: AsyncSession, video_id: UUID) -> None:
        video = await db.scalar(select(MarketingVideo).where(MarketingVideo.id == video_id))
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        if video.is_active:
            raise HTTPException(
                status_code=400,
                detail="Activate a different video before deleting the current one",
            )
        storage_service.delete_object(storage_service.video_bucket, video.s3_key)
        await db.delete(video)
        await db.commit()
