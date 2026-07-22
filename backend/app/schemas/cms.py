import json
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

# Puck owns the content shape — the API is a dumb pipe. The only trust-boundary
# check we apply is size, not structure: reject anything absurdly large before it
# ever reaches the DB, but never validate block-level fields server-side.
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
    # Optional: a slug with no row yet (fresh DB, nothing published) genuinely has
    # no "last updated" timestamp — the service returns a default empty page rather
    # than a 404, so this must tolerate that case rather than fake a value.
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
