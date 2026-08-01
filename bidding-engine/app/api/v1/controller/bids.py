import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
import jwt
from jwt import PyJWTError
from app.core.config import settings
from app.services.bidding_service import BiddingService
from app.core.connection_manager import manager
from app.db.session import AsyncSessionLocal

logger = logging.getLogger("BiddingEngine")
router = APIRouter()

ALGORITHM = "HS256"
# Same cookie name the backend's login sets (see backend/app/api/deps.py).
ACCESS_TOKEN_COOKIE_NAME = "access_token"

async def get_user_id_from_token(token: str) -> str:
    """Validate JWT token and return user ID"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        logger.info(f"User ID: [{user_id}]")
        if user_id is None:
            logger.error("UserID missing in token.")
            raise ValueError("Token missing subject")
        return user_id
    except PyJWTError as e:
        logger.error(f"JWT Validation error: {e}")
        raise ValueError("Invalid token")

@router.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "bidding-engine", "version": settings.API_VERSION}

@router.websocket("/ws/{listing_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    listing_id: str,
    token: str = Query(None)
):
    # Browsers can't attach custom headers to a WS handshake, so the frontend used to pass
    # the JWT as a "?token=" query param (which meant sessionStorage had to hold a
    # JS-readable copy of it). Now that login sets an httpOnly cookie instead, fall back to
    # reading it from the handshake's Cookie header -- same-origin WS upgrade requests
    # carry cookies automatically, same as any other same-origin request.
    if not token:
        token = websocket.cookies.get(ACCESS_TOKEN_COOKIE_NAME)

    if not token:
        logger.error("Missing token")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return
        
    try:
        user_id = await get_user_id_from_token(token)
        logger.info(f"UserID: [{user_id}]")
    except ValueError as e:
        logger.error(f"Value error message: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(e))
        return

    await manager.connect(websocket, listing_id)
    try:
        while True:
            data = await websocket.receive_text()

            # Throttle message floods before touching the DB or Redis lock.
            if not manager.allow_message(user_id):
                logger.warning(f"ListingId: [{listing_id}] UserId: [{user_id}] rate limited")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Too many requests. Please slow down."
                }))
                continue

            # Use a new DB session for each message to avoid holding long-running transactions
            async with AsyncSessionLocal() as db:
                result = await BiddingService.process_bid_message(db, listing_id, user_id, data)
                
            if result.get("success"):
                # Broadcast the successful bid to everyone in the room
                await manager.broadcast(json.dumps(result["data"]), listing_id)
            else:
                # Send error only to the user who attempted the bid
                await websocket.send_text(json.dumps({
                    "type": "error", 
                    "message": result.get("error", "Unknown error")
                }))
    except WebSocketDisconnect:
        logger.info(f"ListingId: [{listing_id}] UserId: [{user_id}] WebSocket disconnected.")
        manager.disconnect(websocket, listing_id)
    except Exception as e:
        logger.error(f"ListingId: [{listing_id}] Unexpected error in websocket loop: {e}", exc_info=True)
        manager.disconnect(websocket, listing_id)
