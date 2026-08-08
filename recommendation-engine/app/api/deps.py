import uuid
from typing import Optional

import jwt
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings

# Same cookie name the backend's login sets. Browser callers auth via the httpOnly
# cookie; a Bearer header is still accepted for non-browser callers.
ACCESS_TOKEN_COOKIE_NAME = "access_token"

reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl=f"/{settings.API_VERSION}/auth/login",
    auto_error=False,
)


async def get_optional_user_id(
    request: Request,
    header_token: Optional[str] = Depends(reusable_oauth2_optional),
) -> Optional[uuid.UUID]:
    """
    Returns the caller's user id from a validated JWT, or None for anonymous/missing/
    invalid tokens. Never raises -- the frontend treats a 401 here as session expiry
    (forced redirect to /login), which would break anonymous browsing otherwise.
    """
    token = header_token or request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        return uuid.UUID(payload.get("sub"))
    except (jwt.PyJWTError, ValueError, TypeError):
        return None
