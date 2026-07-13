import datetime
import uuid
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


UserRoleValue = Literal["user", "admin"]
UserStatusValue = Literal["active", "suspended", "deleted"]
SubscriptionTierValue = Literal["free", "premium"]


class AdminUserProfileResponse(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[datetime.date] = None
    bio: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserSummary(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    role: UserRoleValue
    status: UserStatusValue
    created_at: datetime.datetime


class AdminUserDetails(AdminUserSummary):
    subscription_tier: SubscriptionTierValue
    subscription_expires_at: Optional[datetime.datetime] = None
    balance: float
    email_verified: bool
    updated_at: datetime.datetime

    suspended_at: Optional[datetime.datetime] = None
    suspension_reason: Optional[str] = None

    profile: Optional[AdminUserProfileResponse] = None


class AdminUsersResponse(BaseModel):
    items: List[AdminUserSummary]
    total: int
    page: int
    size: int
    pages: int


class SuspendUserRequest(BaseModel):
    reason: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="Reason for suspending the user account",
    )