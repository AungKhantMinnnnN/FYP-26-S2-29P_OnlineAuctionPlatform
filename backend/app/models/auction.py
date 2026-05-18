from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime
import uuid

class Listing(Base):
    __tablename__ = "listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text)
    starting_price = Column(Float, nullable=False)
    current_bid = Column(Float, default=0.0)
    end_time = Column(DateTime, nullable=False)
    seller_id = Column(UUID(as_uuid=True), index=True) # Reference to user UUID
    
    bids = relationship("Bid", back_populates="listing")

class Bid(Base):
    __tablename__ = "bids"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False)
    bidder_id = Column(UUID(as_uuid=True), nullable=False)
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    listing = relationship("Listing", back_populates="bids")
