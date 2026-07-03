import datetime
import uuid
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.auction import Listing, ListingStatus, UserInteraction, UserInterest, UserProfiles
from app.services import trending
from app.services.location import parse_location


def _primary_image_url(listing: Listing) -> str | None:
    if not listing.images:
        return None
    primary = next((img for img in listing.images if img.is_primary), None) or listing.images[0]
    return f"{settings.S3_PUBLIC_URL}/{primary.s3_key}"


async def get_trending(db: AsyncSession, user_id: uuid.UUID | None = None, limit: int = 20) -> tuple[list[dict], bool]:
    """Returns (items, personalized) - personalized is False for true cold start: no profile, no behavioral history, no onboarding interests."""
    now = datetime.datetime.now(datetime.timezone.utc)
    window_start = now - datetime.timedelta(days=trending.TRENDING_WINDOW_DAYS)

    listings_result = await db.execute(
        select(Listing.id, Listing.title, Listing.current_price, Listing.end_time, Listing.category_id)
        .where(Listing.status == ListingStatus.active)
        .where(Listing.is_draft.is_(False))
        .where(Listing.end_time > now)
    )
    listings_df = pd.DataFrame(listings_result.mappings().all())
    if listings_df.empty:
        return [], False

    interactions_result = await db.execute(
        select(
            UserInteraction.listing_id,
            UserInteraction.action,
            UserInteraction.user_id,
            UserProfiles.dob,
            UserProfiles.address,
        )
        .outerjoin(UserProfiles, UserProfiles.user_id == UserInteraction.user_id)
        .where(UserInteraction.occurred_at >= window_start)
        .where(UserInteraction.listing_id.in_(listings_df["id"].tolist()))
    )
    interactions_df = pd.DataFrame(
        interactions_result.mappings().all(),
        columns=["listing_id", "action", "user_id", "dob", "address"],
    )
    if not interactions_df.empty:
        interactions_df["action"] = interactions_df["action"].apply(lambda a: a.value if hasattr(a, "value") else a)

    segment_df = await _segment_interactions(db, user_id, interactions_df)
    category_df = await _category_interactions(db, user_id, interactions_df, listings_df)

    ranked = trending.rank_listings(listings_df, interactions_df, now, segment_df, category_df)
    top = ranked.head(limit)[["id", "score"]]
    score_map = dict(zip(top["id"], top["score"]))

    full_result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.images), selectinload(Listing.seller))
        .where(Listing.id.in_(list(score_map.keys())))
    )
    full_listings = {l.id: l for l in full_result.scalars().all()}

    items = []
    for listing_id, score in score_map.items():
        listing = full_listings.get(listing_id)
        if not listing:
            continue
        items.append({
            "id": listing.id,
            "seller_id": listing.seller_id,
            "category_id": listing.category_id,
            "title": listing.title,
            "description": listing.description,
            "brand": listing.brand,
            "condition": listing.condition.value,
            "condition_confidence": listing.condition_confidence,
            "bidding_type": listing.bidding_type.value,
            "starting_price": listing.starting_price,
            "reserve_price": listing.reserve_price,
            "current_price": listing.current_price,
            "min_increment": listing.min_increment,
            "status": listing.status.value,
            "is_draft": listing.is_draft,
            "start_time": listing.start_time,
            "end_time": listing.end_time,
            "created_at": listing.created_at,
            "updated_at": listing.updated_at,
            "images": [
                {
                    "id": img.id,
                    "s3_key": img.s3_key,
                    "sort_order": img.sort_order,
                    "is_primary": img.is_primary,
                    "image_url": f"{settings.S3_PUBLIC_URL}/{img.s3_key}",
                }
                for img in listing.images
            ],
            "seller": {
                "id": listing.seller.id,
                "username": listing.seller.username,
                "email": listing.seller.email,
            } if listing.seller else None,
            "score": score,
        })

    return items, (segment_df is not None or category_df is not None)


async def _segment_interactions(
    db: AsyncSession, user_id: uuid.UUID | None, interactions_df: pd.DataFrame
) -> pd.DataFrame | None:
    """
    Cold start (no user_id, or the user has no dob/address yet) -> no segment, plain trending.
    Segment_Interactions is to build profile for recommendation-engine using user's age_group and city.
    """
    if user_id is None or interactions_df.empty:
        return None

    profile_result = await db.execute(
        select(UserProfiles.dob, UserProfiles.address).where(UserProfiles.user_id == user_id)
    )
    profile = profile_result.mappings().first()
    if not profile or (profile["dob"] is None and not profile["address"]):
        return None

    user_age_group = trending.age_group(profile["dob"])
    user_city = parse_location(profile["address"])["city"] if profile["address"] else None

    df = interactions_df.copy()
    df["age_group"] = df["dob"].apply(trending.age_group)
    df["city"] = df["address"].apply(lambda a: parse_location(a)["city"] if a else None)

    mask = pd.Series(False, index=df.index)
    if user_age_group:
        mask |= df["age_group"] == user_age_group
    if user_city:
        mask |= df["city"] == user_city
    return df[mask]


async def _category_interactions(
    db: AsyncSession, user_id: uuid.UUID | None, interactions_df: pd.DataFrame, listings_df: pd.DataFrame
) -> pd.DataFrame | None:
    """
    Category boost from the user's own behavioral history; falls back to onboarding
    `user_interests` picks when that history is empty (the literal cold-start case).
    """
    if user_id is None or interactions_df.empty:
        return None

    categories_result = await db.execute(
        select(Listing.category_id)
        .join(UserInteraction, UserInteraction.listing_id == Listing.id)
        .where(UserInteraction.user_id == user_id)
        .where(Listing.category_id.is_not(None))
        .distinct()
    )
    user_categories = {row[0] for row in categories_result.all()}

    if not user_categories:
        interests_result = await db.execute(
            select(UserInterest.category_id).where(UserInterest.user_id == user_id).distinct()
        )
        user_categories = {row[0] for row in interests_result.all()}

    if not user_categories:
        return None

    merged = interactions_df.merge(
        listings_df[["id", "category_id"]], left_on="listing_id", right_on="id", how="left"
    )
    category_df = merged[merged["category_id"].isin(user_categories)]
    return category_df if not category_df.empty else None
