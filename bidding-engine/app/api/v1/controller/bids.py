import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from jose import jwt, JWTError
from app.core.config import settings
from app.services.bidding_service import BiddingService
from app.core.connection_manager import manager
from app.db.session import AsyncSessionLocal

logger = logging.getLogger("BiddingEngine")
router = APIRouter()

ALGORITHM = "HS256"

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
    except JWTError as e:
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
        print("WEB SOCKET DISCONNECT CAUGHT")
        logger.error("Web socket has been disconnected.")
        manager.disconnect(websocket, listing_id)
    except Exception as e:
        import traceback
        print(f"UNEXPECTED ERROR: {e}")
        traceback.print_exc()
        logger.error(f"Unexpected error in websocket loop: {e}")
        manager.disconnect(websocket, listing_id)
