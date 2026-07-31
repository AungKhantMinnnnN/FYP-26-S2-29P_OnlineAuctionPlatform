"""Model ↔ DB schema drift check for recommendation-engine.

This service's model file is a hand-synced copy of the shared schema. 
A `SELECT ... LIMIT 0` over every mapped column catches a model that drifted from the live DB.
"""
import pytest
from sqlalchemy import select

from app.models.auction import (
    User, UserProfiles, Categories, UserInterest, Listing, ListingImages, Bid,
    AuctionResult, Watchlist, WalletTransaction, Notification, Dispute, AdminLog,
    UserInteraction, CollectorBoard, BoardItem,
)

MODELS = [
    User, UserProfiles, Categories, UserInterest, Listing, ListingImages, Bid,
    AuctionResult, Watchlist, WalletTransaction, Notification, Dispute, AdminLog,
    UserInteraction, CollectorBoard, BoardItem,
]


@pytest.mark.parametrize("model", MODELS, ids=lambda m: m.__name__)
async def test_model_matches_db_schema(session, model):
    await session.execute(select(model).limit(0))
