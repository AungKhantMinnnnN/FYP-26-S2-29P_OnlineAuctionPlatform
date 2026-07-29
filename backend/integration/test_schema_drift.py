"""Model ↔ DB schema drift check for backend.

The shared DB is accessed by 3 services with hand-synced duplicated model files
A `SELECT ... LIMIT 0` over every mapped column fails loudly if a model
references a column the live schema doesn't have — the drift that faked-session unit tests
can never catch.
"""
import pytest
from sqlalchemy import select

from app.models.auction import (
    User, SubscriptionTierConfig, UserProfiles, Categories, UserInterest, Listing,
    ListingImages, Bid, AuctionResult, Watchlist, WalletTransaction, PasswordResetToken,
    EmailVerificationToken, Notification, IssueType, Dispute, Testimonial, AdminLog,
    UserInteraction, CollectorBoard, BoardItem, AuctionDuration, OptionSet, FeedbackType,
    ItemFeedback, ProhibitedKeyword, FlaggedListingAttempt, AIModerationFlag, MarketingVideo,
    SiteContent, SiteContentVersion,
)

MODELS = [
    User, SubscriptionTierConfig, UserProfiles, Categories, UserInterest, Listing,
    ListingImages, Bid, AuctionResult, Watchlist, WalletTransaction, PasswordResetToken,
    EmailVerificationToken, Notification, IssueType, Dispute, Testimonial, AdminLog,
    UserInteraction, CollectorBoard, BoardItem, AuctionDuration, OptionSet, FeedbackType,
    ItemFeedback, ProhibitedKeyword, FlaggedListingAttempt, AIModerationFlag, MarketingVideo,
    SiteContent, SiteContentVersion,
]


@pytest.mark.parametrize("model", MODELS, ids=lambda m: m.__name__)
async def test_model_matches_db_schema(session, model):
    await session.execute(select(model).limit(0))
