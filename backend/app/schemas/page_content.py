from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Pages managed through the reusable `site_content` table. Each page (slug) has a
# `content` payload of the shape:
#   { "header": { "kicker", "title", "subtitle" },
#     "contact": { "title", "text", "email" },
#     "sections": [ PageSection, ... ] }
ALLOWED_PAGES = {"privacy", "terms"}


class PageHeader(BaseModel):
    kicker: str = Field("", max_length=100)
    title: str = Field("", max_length=255)
    subtitle: str = Field("", max_length=1000)
    last_updated_label: str = Field("", max_length=200)


class PageContact(BaseModel):
    title: str = Field("", max_length=255)
    text: str = Field("", max_length=2000)
    email: str = Field("", max_length=255)


class PageSection(BaseModel):
    id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)
    sort_order: int = 0
    is_active: bool = True


class PageContentResponse(BaseModel):
    slug: str
    header: PageHeader = Field(default_factory=PageHeader)
    contact: PageContact = Field(default_factory=PageContact)
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
    header: PageHeader = Field(default_factory=PageHeader)
    contact: PageContact = Field(default_factory=PageContact)
    sections: list[PageSection] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PageSectionOrder(BaseModel):
    ordered_ids: list[UUID]


class PageHeaderUpdate(BaseModel):
    kicker: str | None = Field(None, max_length=100)
    title: str | None = Field(None, max_length=255)
    subtitle: str | None = Field(None, max_length=1000)
    last_updated_label: str | None = Field(None, max_length=200)


class PageContactUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    text: str | None = Field(None, max_length=2000)
    email: str | None = Field(None, max_length=255)
