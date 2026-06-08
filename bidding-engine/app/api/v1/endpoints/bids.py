from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.config import settings
from app.services.bidding_service import BiddingService

router = APIRouter()

@router.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "bidding-engine", "version": settings.API_VERSION}

@router.websocket("/ws/{listing_id}")
async def websocket_endpoint(websocket: WebSocket, listing_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            response = BiddingService.process_bid_message(listing_id, data)
            await websocket.send_text(response)
    except WebSocketDisconnect:
        pass
