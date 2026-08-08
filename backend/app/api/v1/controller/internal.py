import secrets
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.services import notification_service

router = APIRouter(prefix="/internal", tags=["internal"])


async def require_internal_key(x_internal_api_key: str | None = Header(default=None)) -> None:
    # Optional so deployments work before it's configured. Nginx already blocks the
    # public path here; this is defense-in-depth for direct internal-network access.
    if not settings.INTERNAL_API_KEY:
        return
    if not x_internal_api_key or not secrets.compare_digest(x_internal_api_key, settings.INTERNAL_API_KEY):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing internal API key")


class OutbidPayload(BaseModel):
    outbid_user_id: uuid.UUID
    listing_id: uuid.UUID
    listing_title: str
    new_amount: float


class AuctionEndedPayload(BaseModel):
    listing_id: uuid.UUID
    listing_title: str
    seller_id: uuid.UUID
    winner_id: uuid.UUID | None
    final_price: float
    outcome: str  # "sold" | "reserve_not_met" | "no_bids"


@router.post("/notifications/outbid", dependencies=[Depends(require_internal_key)])
async def outbid_notification(payload: OutbidPayload, db: AsyncSession = Depends(get_db)):
    await notification_service.notify_outbid(
        db, str(payload.outbid_user_id), str(payload.listing_id), payload.listing_title, payload.new_amount
    )
    await db.commit()
    return {"ok": True}


@router.post("/notifications/auction-ended", dependencies=[Depends(require_internal_key)])
async def auction_ended_notification(payload: AuctionEndedPayload, db: AsyncSession = Depends(get_db)):
    await notification_service.notify_auction_ended(
        db, str(payload.listing_id), payload.listing_title,
        str(payload.seller_id), str(payload.winner_id) if payload.winner_id else None,
        payload.final_price, payload.outcome,
    )
    await db.commit()
    return {"ok": True}
