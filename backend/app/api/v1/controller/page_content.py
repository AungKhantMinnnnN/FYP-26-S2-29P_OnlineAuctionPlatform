from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_admin_user
from app.db.session import get_db
from app.models.auction import AdminLog, User
from app.schemas.page_content import (
    PageContentListResponse,
    PageContentResponse,
    PageContactUpdate,
    PageHeaderUpdate,
    PageSection,
    PageSectionCreate,
    PageSectionOrder,
    PageSectionUpdate,
)
from app.services.page_content_service import PageContentService

router = APIRouter()
admin_router = APIRouter()


# ── Public ──────────────────────────────────────────────────────────────────────
@router.get("/{page}", response_model=PageContentResponse)
async def get_page_content(page: str, db: AsyncSession = Depends(get_db)):
    """Public: header, contact, and active sections of a policies page (privacy | terms)."""
    PageContentService.ensure_allowed_page(page)
    return await PageContentService.get_public(db, page)


# ── Admin ───────────────────────────────────────────────────────────────────────
@admin_router.get("", response_model=PageContentListResponse)
async def list_page_sections(
    page: str = Query(..., description="'privacy' or 'terms'"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin: header, contact, and all sections (active + inactive) for a page."""
    PageContentService.ensure_allowed_page(page)
    return await PageContentService.get_admin(db, page)


# IMPORTANT: static "/{page}/header", "/{page}/contact" and "/{page}/order" routes
# MUST be registered before the parameterised "/{page}/{section_id}" routes —
# FastAPI matches in registration order, so otherwise "privacy/header" would bind
# to {page}/{section_id} and fail UUID validation with a 422.
@admin_router.post("/{page}/header", response_model=PageContentResponse)
async def update_page_header(
    page: str,
    data: PageHeaderUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: edit the page's kicker / title / subtitle."""
    updated = await PageContentService.update_header(
        db, page, data.model_dump(exclude_unset=True), admin.id,
    )
    full = await PageContentService.get_admin(db, page)
    full["header"] = updated
    await _log(db, admin.id, "page_content_header_update", page, None)
    return full


@admin_router.post("/{page}/contact", response_model=PageContentResponse)
async def update_page_contact(
    page: str,
    data: PageContactUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: edit the page's contact title / text / email."""
    updated = await PageContentService.update_contact(
        db, page, data.model_dump(exclude_unset=True), admin.id,
    )
    full = await PageContentService.get_admin(db, page)
    full["contact"] = updated
    await _log(db, admin.id, "page_content_contact_update", page, None)
    return full


@admin_router.post("/{page}/order", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_page_sections(
    page: str,
    data: PageSectionOrder,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: set the display order of a page's sections."""
    await PageContentService.reorder_sections(db, page, data.ordered_ids, admin.id)
    await _log(db, admin.id, "page_content_reorder", page, None)


@admin_router.post("", response_model=PageSection, status_code=status.HTTP_201_CREATED)
async def create_page_section(
    data: PageSectionCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: add a new section to a page."""
    section = await PageContentService.create_section(
        db, data.page, data.title, data.body, admin.id, data.is_active,
    )
    await _log(db, admin.id, "page_content_create", data.page, section["title"])
    return _to_schema(section)


@admin_router.post("/{page}/{section_id}", response_model=PageSection)
async def update_page_section(
    page: str,
    section_id: UUID,
    data: PageSectionUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: edit a section's title / body / active flag."""
    section = await PageContentService.update_section(
        db, page, section_id,
        data.model_dump(exclude_unset=True), admin.id,
    )
    await _log(db, admin.id, "page_content_update", page, str(section_id))
    return _to_schema(section)


@admin_router.delete("/{page}/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page_section(
    page: str,
    section_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: remove a section from a page."""
    await PageContentService.delete_section(db, page, section_id, admin.id)
    await _log(db, admin.id, "page_content_delete", page, str(section_id))


async def _log(db: AsyncSession, admin_id: UUID, action: str, page: str, detail: str | None) -> None:
    db.add(AdminLog(admin_id=admin_id, action=action, target_id=None, details=f"page={page} {detail or ''}".strip()))
    await db.commit()


def _to_schema(section: dict) -> PageSection:
    return PageSection(
        id=section["id"], title=section["title"], body=section["body"],
        sort_order=section.get("sort_order", 0), is_active=section.get("is_active", True),
    )
