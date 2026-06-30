from sqlalchemy import Column, String, Float, DateTime, Date, ForeignKey, Text, Enum, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime
import uuid
import enum

#region Enums
class UserRole(enum.Enum):
    user = "user"
    admin = "admin"

class UserStatus(enum.Enum):
    active = "active"
    suspended = "suspended"
    deleted = "deleted"

class ListingStatus(enum.Enum):
    draft = "draft"
    pending_review = "pending_review"
    active = "active"
    ended = "ended"
    removed = "removed"

class BiddingType(enum.Enum):
    price_up = "price_up"
    low_start = "low_start"
    public = "public"

class ItemConditions(enum.Enum):
    new = "new"
    used = "used"
    refurbished = "refurbished"

class BidStatus(enum.Enum):
    accepted = "accepted"
    rejected = "rejected"
    cancelled = "cancelled"

class TransactionType(enum.Enum):
    topup = "topup"
    bid_hold = "bid_hold"
    bid_release = "bid_release"
    settlement = "settlement"

class DisputeStatus(enum.Enum):
    open = "open"
    in_review = "in_review"
    resolved = "resolved"
    closed = "closed"

class InteractionAction(enum.Enum):
    view = "view"
    search = "search"
    bid = "bid"
    watchlist = "watchlist"

class SubscriptionTier(enum.Enum):
    free = "free"
    premium = "premium"

#endregion

#region Data objects
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, unique=True, nullable=False)
    role = Column(Enum(UserRole, name="user_role"), default=UserRole.user, nullable=False)
    status = Column(Enum(UserStatus, name="user_status"), default=UserStatus.active, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    subscription_tier = Column(Enum(SubscriptionTier, name="subscription_tier"), default=SubscriptionTier.free, nullable=False)
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    balance = Column(Float, default=0.0, nullable=False)
    avatar_key = Column(String)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    profile = relationship("UserProfiles", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin")

class SubscriptionTierConfig(Base):
    __tablename__ = "subscription_tiers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tier = Column(Enum(SubscriptionTier, name="subscription_tier"), unique=True, nullable=False)
    price = Column(Float, nullable=False)
    duration_days = Column(Integer, nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class UserProfiles(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String)
    dob = Column(Date)
    bio = Column(String)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    user = relationship("User", back_populates="profile")

class Categories(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class UserInterest(Base):
    __tablename__ = "user_interests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class Listing(Base):
    __tablename__ = "listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(String)
    brand = Column(String, index=True)
    condition = Column(Enum(ItemConditions, name="item_condition"), nullable=False)
    condition_confidence = Column(Float)
    bidding_type = Column(Enum(BiddingType, name="bidding_type"), default=BiddingType.price_up, nullable=False)
    starting_price = Column(Float, nullable=False)
    reserve_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    min_increment = Column(Float, default=1.0, nullable=False)
    status = Column(Enum(ListingStatus, name="listing_status"), default=ListingStatus.draft, nullable=False)
    is_draft = Column(Boolean, default=True, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    images = relationship("ListingImages", back_populates="listing", cascade="all, delete-orphan", lazy="selectin")
    seller = relationship("User", foreign_keys=[seller_id])
    bids = relationship("Bid", back_populates="listing")

class ListingImages(Base):
    __tablename__ = "listing_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False)
    s3_key = Column(String, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    listing = relationship("Listing", back_populates="images")

    @property
    def image_url(self):
        from app.core.config import settings
        if settings.S3_PUBLIC_URL:
            return f"{settings.S3_PUBLIC_URL}/{self.s3_key}"
        return f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET_ASSETS}/{self.s3_key}"

class Bid(Base):
    __tablename__ = "bids"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False)
    bidder_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(Enum(BidStatus, name="bid_status"), default=BidStatus.accepted, nullable=False)
    placed_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    listing = relationship("Listing", back_populates="bids")
    bidder = relationship("User", foreign_keys=[bidder_id])

class AuctionResult(Base):
    __tablename__ = "auction_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), unique=True, nullable=False)
    winner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    winning_bid_id = Column(UUID(as_uuid=True), ForeignKey("bids.id"), nullable=True)
    final_price = Column(Float, nullable=False)
    ended_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False)
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(Enum(TransactionType, name="transaction_type"), nullable=False)
    reference = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    token = Column(String, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    token = Column(String, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=True)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(DisputeStatus, name="dispute_status"), default=DisputeStatus.open, nullable=False)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolution_note = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    resolved_at = Column(DateTime(timezone=True))

class Testimonial(Base):
    __tablename__ = "testimonials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    rating = Column(Integer, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class AdminLog(Base):
    __tablename__ = "admin_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    target_id = Column(UUID(as_uuid=True))
    details = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class UserInteraction(Base):
    __tablename__ = "user_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False)
    action = Column(Enum(InteractionAction, name="interaction_action"), nullable=False)
    occurred_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
#endregion