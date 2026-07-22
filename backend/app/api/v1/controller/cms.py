from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.auction import User
from app.api.deps import get_admin_user
from app.schemas.cms import SiteContentUpdate, SiteContentResponse, VersionSummary, VersionDetail
from app.services.cms_service import CmsService

router = APIRouter()


@router.get("/{slug}", response_model=SiteContentResponse)
async def get_published(slug: str, db: AsyncSession = Depends(get_db)):
    """Public: the currently published content for a page. Never 404s — a slug
    with no row yet returns a default empty page."""
    return await CmsService.get_published(db, slug)


@router.get("/{slug}/draft", response_model=SiteContentResponse)
async def get_draft(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin: draft content if one exists, else the published content (start from live)."""
    return await CmsService.get_draft(db, slug)


@router.put("/{slug}/draft", response_model=SiteContentResponse)
async def save_draft(
    slug: str,
    data: SiteContentUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: save work-in-progress. No public effect, no version snapshot."""
    return await CmsService.save_draft(db, slug, data.content, admin.id)


@router.post("/{slug}/publish", response_model=SiteContentResponse)
async def publish(
    slug: str,
    data: SiteContentUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: make content public, snapshot it into version history, clear the draft."""
    return await CmsService.publish(db, slug, data.content, admin.id)


@router.get("/{slug}/versions", response_model=List[VersionSummary])
async def list_versions(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin: publish history for a page, newest first (no content — keep it light)."""
    return await CmsService.list_versions(db, slug)


@router.get("/versions/{version_id}", response_model=VersionDetail)
async def get_version(
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin: full content of one past version, for preview before restoring."""
    return await CmsService.get_version(db, version_id)


@router.post("/{slug}/rollback/{version_id}", response_model=SiteContentResponse, status_code=status.HTTP_200_OK)
async def rollback(
    slug: str,
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: restore a past version as the published content. Recorded as a new
    version rather than deleting anything — history is append-only."""
    return await CmsService.rollback(db, slug, version_id, admin.id)
