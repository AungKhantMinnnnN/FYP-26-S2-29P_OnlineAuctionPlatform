"""CRUD for DB-driven Privacy/Terms pages.

These pages reuse the existing `site_content` table (one row per page, keyed by
`slug`). A page's `content` JSONB payload holds an ordered list of sections:
    { "sections": [ { "id", "title", "body", "sortOrder", "isActive" }, ... ] }

Sections carry a stable UUID `id` so admins can edit/delete them reliably even
after reordering. Writes are applied directly (no draft/publish workflow).
"""
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auction import SiteContent
from app.schemas.page_content import ALLOWED_PAGES

EMPTY_PAGE: dict = {"sections": []}


def _sections(row: SiteContent) -> list[dict]:
    content = row.content or {}
    raw = content.get("sections") or []
    out = []
    for idx, item in enumerate(raw):
        if not isinstance(item, dict):
            continue
        out.append({
            "id": item.get("id") or uuid.uuid4(),
            "title": item.get("title", ""),
            "body": item.get("body", ""),
            "sort_order": item.get("sortOrder", idx),
            "is_active": item.get("isActive", True),
        })
    return out


class PageContentService:
    @staticmethod
    def ensure_allowed_page(page: str) -> str:
        if page not in ALLOWED_PAGES:
            raise HTTPException(status_code=400, detail=f"Unknown page '{page}'. Allowed: {sorted(ALLOWED_PAGES)}")
        return page

    @staticmethod
    async def _get_row(db: AsyncSession, slug: str) -> SiteContent:
        return await db.scalar(select(SiteContent).where(SiteContent.slug == slug))

    @staticmethod
    async def get_sections(db: AsyncSession, slug: str, active_only: bool = False) -> list[dict]:
        row = await PageContentService._get_row(db, slug)
        if not row:
            return []
        sections = _sections(row)
        if active_only:
            sections = [s for s in sections if s["is_active"]]
        return sorted(sections, key=lambda s: s["sort_order"])

    @staticmethod
    async def get_public(db: AsyncSession, slug: str) -> dict:
        """Public contract: active sections only, in display order."""
        sections = await PageContentService.get_sections(db, slug, active_only=True)
        return {"slug": slug, "sections": sections}

    @staticmethod
    async def create_section(
        db: AsyncSession, page: str, title: str, body: str, admin_id: UUID, is_active: bool = True,
    ) -> dict:
        PageContentService.ensure_allowed_page(page)
        row = await PageContentService._get_row(db, page)
        now = datetime.now(timezone.utc)
        new_section = {
            "id": str(uuid.uuid4()),
            "title": title,
            "body": body,
            "sortOrder": len(_sections(row)) if row else 0,
            "isActive": is_active,
        }
        if row:
            content = dict(row.content or {})
            sections = content.get("sections") or []
            sections.append(new_section)
            content["sections"] = sections
            row.content = content
            row.updated_at = now
            row.updated_by = admin_id
        else:
            # No row for this page yet — create one with just this section.
            row = SiteContent(
                slug=page,
                content={"sections": [new_section]},
                updated_by=admin_id,
            )
            db.add(row)
        await db.commit()
        await db.refresh(row)
        return new_section

    @staticmethod
    async def update_section(
        db: AsyncSession, page: str, section_id: UUID, update: dict, admin_id: UUID,
    ) -> dict:
        PageContentService.ensure_allowed_page(page)
        row = await PageContentService._get_row(db, page)
        if not row:
            raise HTTPException(status_code=404, detail="Page not found")
        content = dict(row.content or {})
        sections = content.get("sections") or []
        target = next((s for s in sections if str(s.get("id")) == str(section_id)), None)
        if target is None:
            raise HTTPException(status_code=404, detail="Section not found")

        if update.get("title") is not None:
            target["title"] = update["title"]
        if update.get("body") is not None:
            target["body"] = update["body"]
        if update.get("is_active") is not None:
            target["isActive"] = update["is_active"]

        content["sections"] = sections
        row.content = content
        row.updated_at = datetime.now(timezone.utc)
        row.updated_by = admin_id
        await db.commit()
        await db.refresh(row)
        return {
            "id": target["id"], "title": target["title"], "body": target["body"],
            "sort_order": target.get("sortOrder", 0), "is_active": target.get("isActive", True),
        }

    @staticmethod
    async def delete_section(db: AsyncSession, page: str, section_id: UUID, admin_id: UUID) -> None:
        PageContentService.ensure_allowed_page(page)
        row = await PageContentService._get_row(db, page)
        if not row:
            raise HTTPException(status_code=404, detail="Page not found")
        content = dict(row.content or {})
        sections = content.get("sections") or []
        remaining = [s for s in sections if str(s.get("id")) != str(section_id)]
        if len(remaining) == len(sections):
            raise HTTPException(status_code=404, detail="Section not found")
        content["sections"] = remaining
        row.content = content
        row.updated_at = datetime.now(timezone.utc)
        row.updated_by = admin_id
        await db.commit()

    @staticmethod
    async def reorder_sections(db: AsyncSession, page: str, ordered_ids: list[UUID], admin_id: UUID) -> None:
        PageContentService.ensure_allowed_page(page)
        row = await PageContentService._get_row(db, page)
        if not row:
            raise HTTPException(status_code=404, detail="Page not found")
        content = dict(row.content or {})
        sections = content.get("sections") or []
        by_id = {str(s.get("id")): s for s in sections}
        if len(by_id) != len(sections):
            raise HTTPException(status_code=400, detail="Duplicate section ids in payload")
        if set(by_id.keys()) != {str(i) for i in ordered_ids}:
            raise HTTPException(status_code=400, detail="Ordered ids do not match existing sections")

        new_order = []
        for idx, sid in enumerate(ordered_ids):
            section = by_id[str(sid)]
            section["sortOrder"] = idx
            new_order.append(section)
        content["sections"] = new_order
        row.content = content
        row.updated_at = datetime.now(timezone.utc)
        row.updated_by = admin_id
        await db.commit()
