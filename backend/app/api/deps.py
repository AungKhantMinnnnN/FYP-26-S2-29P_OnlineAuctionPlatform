from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import PyJWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.session import get_db
from app.models.auction import (
    SubscriptionTier,
    User,
    UserRole,
    UserStatus,
)
from app.schemas.auth import TokenPayload

ACCESS_TOKEN_COOKIE_NAME = "access_token"

# auto_error=False: browser clients auth via httpOnly cookie, API clients via Bearer header;
# _extract_token tries the header then falls back to the cookie.
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"/{settings.API_VERSION}/auth/login",
    auto_error=False,
)

reusable_oauth2_optional = reusable_oauth2


async def _extract_token(
    request: Request,
    header_token: Optional[str] = Depends(reusable_oauth2),
) -> Optional[str]:
    return header_token or request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)


def get_credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(_extract_token),
) -> User:
    credentials_exception = get_credentials_exception()

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        token_data = TokenPayload(sub=user_id)

    except PyJWTError:
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(token_data.sub)
    except (ValueError, TypeError):
        raise credentials_exception

    result = await db.execute(
        select(User).where(User.id == user_uuid)
    )

    user = result.scalars().first()

    if not user:
        raise credentials_exception

    if user.status == UserStatus.suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended",
        )

    if user.status == UserStatus.deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is no longer available",
        )

    # manage_subscription always sets an expiry when granting premium (renew) and clears
    # it on cancel, so a premium row with a past expiry is a lapsed subscription that was
    # never explicitly downgraded -- do it lazily here, the one place every authenticated
    # request passes through, rather than requiring a scheduled job.
    if (
        user.subscription_tier == SubscriptionTier.premium
        and user.subscription_expires_at is not None
        and user.subscription_expires_at <= datetime.now(timezone.utc)
    ):
        user.subscription_tier = SubscriptionTier.free
        user.subscription_expires_at = None
        user.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)

    return user


async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user


async def get_premium_user(
    current_user: User = Depends(get_current_user),
) -> User:
    is_premium = (
        current_user.subscription_tier
        == SubscriptionTier.premium
    )

    is_admin = current_user.role == UserRole.admin

    if not is_premium and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required",
        )

    return current_user


async def get_optional_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(_extract_token),
) -> Optional[User]:
    if not token:
        return None

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
        )

        user_id = payload.get("sub")

        if not user_id:
            return None

        user_uuid = uuid.UUID(user_id)

        result = await db.execute(
            select(User).where(User.id == user_uuid)
        )

        user = result.scalars().first()

        if not user:
            return None

        if user.status != UserStatus.active:
            return None

        return user

    except (PyJWTError, ValueError, TypeError):
        return None