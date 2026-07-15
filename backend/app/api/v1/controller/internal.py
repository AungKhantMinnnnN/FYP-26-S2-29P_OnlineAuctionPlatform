from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services import notification_service

router = APIRouter(prefix="/internal", tags=["internal"])


class OutbidPayload(BaseModel):
    outbid_user_id: str
    listing_id: str
    listing_title: str
    new_amount: float


class AuctionEndedPayload(BaseModel):
    listing_id: str
    listing_title: str
    seller_id: str
    winner_id: str | None
    final_price: float
    outcome: str  # "sold" | "reserve_not_met" | "no_bids"


@router.post("/notifications/outbid")
async def outbid_notification(payload: OutbidPayload, db: AsyncSession = Depends(get_db)):
    await notification_service.notify_outbid(
        db, payload.outbid_user_id, payload.listing_id, payload.listing_title, payload.new_amount
    )
    await db.commit()
    return {"ok": True}


@router.post("/notifications/auction-ended")
async def auction_ended_notification(payload: AuctionEndedPayload, db: AsyncSession = Depends(get_db)):
    await notification_service.notify_auction_ended(
        db, payload.listing_id, payload.listing_title,
        payload.seller_id, payload.winner_id, payload.final_price, payload.outcome,
    )
    await db.commit()
    return {"ok": True}
