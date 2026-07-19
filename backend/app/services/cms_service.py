from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.auction import SiteContent, SiteContentVersion

# A fresh DB (or a slug nobody has ever published) has no site_content row at all —
# the public/draft reads must render this instead of erroring, per Puck's own Data shape.
DEFAULT_CONTENT: dict = {"root": {"props": {}}, "content": [], "zones": {}}


class CmsService:
    @staticmethod
    async def _get_row(db: AsyncSession, slug: str) -> Optional[SiteContent]:
        return await db.scalar(select(SiteContent).where(SiteContent.slug == slug))

    @staticmethod
    async def get_published(db: AsyncSession, slug: str) -> dict:
        row = await CmsService._get_row(db, slug)
        if not row:
            return {"slug": slug, "content": DEFAULT_CONTENT, "updated_at": None}
        return {"slug": row.slug, "content": row.content, "updated_at": row.updated_at}

    @staticmethod
    async def get_draft(db: AsyncSession, slug: str) -> dict:
        row = await CmsService._get_row(db, slug)
        if not row:
            # No row at all yet — an admin opening the editor for the first time on a
            # fresh install must get a blank canvas, not a 404.
            return {"slug": slug, "content": DEFAULT_CONTENT, "updated_at": None}
        content = row.draft_content if row.draft_content is not None else row.content
        return {"slug": row.slug, "content": content, "updated_at": row.updated_at}

    @staticmethod
    async def save_draft(db: AsyncSession, slug: str, content: dict, admin_id: UUID) -> dict:
        row = await CmsService._get_row(db, slug)
        if row:
            row.draft_content = content
        else:
            # slug is UNIQUE with no existing upsert helper in this codebase — a plain
            # select-then-insert is correct here since this is the only writer of new
            # SiteContent rows and there's no concurrent-create race to worry about at
            # FYP scale (admin-only, single actor per slug in practice).
            row = SiteContent(slug=slug, content=DEFAULT_CONTENT, draft_content=content, updated_by=admin_id)
            db.add(row)
        await db.commit()
        await db.refresh(row)
        return {"slug": row.slug, "content": row.draft_content, "updated_at": row.updated_at}

    @staticmethod
    async def publish(db: AsyncSession, slug: str, content: dict, admin_id: UUID) -> dict:
        row = await CmsService._get_row(db, slug)
        if row:
            row.content = content
            row.draft_content = None
            row.updated_by = admin_id
        else:
            row = SiteContent(slug=slug, content=content, draft_content=None, updated_by=admin_id)
            db.add(row)

        db.add(SiteContentVersion(slug=slug, content=content, note="publish", created_by=admin_id))
        await db.commit()
        await db.refresh(row)
        return {"slug": row.slug, "content": row.content, "updated_at": row.updated_at}

    @staticmethod
    async def list_versions(db: AsyncSession, slug: str) -> List[SiteContentVersion]:
        result = await db.execute(
            select(SiteContentVersion)
            .where(SiteContentVersion.slug == slug)
            .order_by(SiteContentVersion.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_version(db: AsyncSession, version_id: UUID) -> SiteContentVersion:
        version = await db.scalar(select(SiteContentVersion).where(SiteContentVersion.id == version_id))
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        return version

    @staticmethod
    async def rollback(db: AsyncSession, slug: str, version_id: UUID, admin_id: UUID) -> dict:
        version = await CmsService.get_version(db, version_id)
        if version.slug != slug:
            raise HTTPException(status_code=400, detail="Version does not belong to this slug")

        row = await CmsService._get_row(db, slug)
        if row:
            row.content = version.content
            row.draft_content = None
            row.updated_by = admin_id
        else:
            row = SiteContent(slug=slug, content=version.content, draft_content=None, updated_by=admin_id)
            db.add(row)

        # Rollback is itself recorded as a new version — history is a ledger, not a
        # stack, so it's never mutated or trimmed, only appended to.
        db.add(SiteContentVersion(
            slug=slug, content=version.content,
            note=f"rollback to {version.created_at.isoformat()}", created_by=admin_id,
        ))
        await db.commit()
        await db.refresh(row)
        return {"slug": row.slug, "content": row.content, "updated_at": row.updated_at}
