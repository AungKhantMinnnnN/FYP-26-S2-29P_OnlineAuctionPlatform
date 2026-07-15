from typing import Optional
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
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


reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"/{settings.API_VERSION}/auth/login"
)

reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl=f"/{settings.API_VERSION}/auth/login",
    auto_error=False,
)


def get_credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2),
) -> User:
    credentials_exception = get_credentials_exception()

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

    except JWTError:
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
    token: Optional[str] = Depends(
        reusable_oauth2_optional
    ),
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

    except (JWTError, ValueError, TypeError):
        return None