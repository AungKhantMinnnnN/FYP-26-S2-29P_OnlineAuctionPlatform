import json
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

# Puck owns the content shape; the API only guards size, never block-level structure.
MAX_CONTENT_BYTES = 256 * 1024


class SiteContentUpdate(BaseModel):
    content: dict

    @field_validator("content")
    def content_within_size_limit(cls, v):
        if len(json.dumps(v)) > MAX_CONTENT_BYTES:
            raise ValueError(f"content exceeds the {MAX_CONTENT_BYTES // 1024}KB size limit")
        return v


class SiteContentResponse(BaseModel):
    slug: str
    content: dict
    # None when the slug has no row yet (fresh DB) — service returns a default
    # empty page rather than a 404, so there's no real "last updated" value.
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class VersionSummary(BaseModel):
    id: UUID
    note: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VersionDetail(BaseModel):
    id: UUID
    content: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
