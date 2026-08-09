from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Pages managed through the reusable `site_content` table. Each page (slug) has a
# `content` payload of the shape: { "sections": [ PageSection, ... ] }.
ALLOWED_PAGES = {"privacy", "terms"}


class PageSection(BaseModel):
    id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)
    sort_order: int = 0
    is_active: bool = True


class PageContentResponse(BaseModel):
    slug: str
    sections: list[PageSection] = Field(default_factory=list)


class PageSectionCreate(BaseModel):
    page: str = Field(..., description="'privacy' or 'terms'")
    title: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)
    is_active: bool = True


class PageSectionUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    body: str | None = Field(None, min_length=1)
    is_active: bool | None = None


class PageContentListResponse(BaseModel):
    slug: str
    sections: list[PageSection] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PageSectionOrder(BaseModel):
    ordered_ids: list[UUID]
