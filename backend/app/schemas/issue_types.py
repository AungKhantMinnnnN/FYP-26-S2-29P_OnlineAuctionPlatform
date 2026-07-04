from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID


class IssueTypeCreate(BaseModel):
    name: str


class IssueTypeUpdate(BaseModel):
    name: str


class IssueTypeResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
