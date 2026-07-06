import asyncio
import random
import sys
import os
from datetime import datetime, timedelta, timezone

script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
backend_dir = os.path.join(parent_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import select, func

from app.db.session import AsyncSessionLocal
from app.models.auction import (
    User, UserProfiles,
    Listing, ListingImages, ListingStatus, ItemConditions, BiddingType,
    UserRole,
    Bid, BidStatus,
    AuctionResult,
    Categories, UserInterest,
    SubscriptionTier, SubscriptionTierConfig,
    Watchlist,
    WalletTransaction, TransactionType,
    UserInteraction, InteractionAction,
    CollectorBoard, BoardItem,
    AuctionDuration,
    Testimonial,
)
from app.core.security import get_password_hash
from app.core.config import settings
from minio import Minio
import uuid
import mimetypes


def _upload_images(minio_client, sample_images_dir, available_images, listing_id, count=2):
    if not available_images or not minio_client:
        return []
    chosen = random.sample(available_images, min(count, len(available_images)))
    keys = []
    for img_file in chosen:
        img_path = os.path.join(sample_images_dir, img_file)
        ext = os.path.splitext(img_file)[1]
        s3_key = f"seed/{uuid.uuid4()}{ext}"
        content_type, _ = mimetypes.guess_type(img_path)
        content_type = content_type or "application/octet-stream"
        try:
            minio_client.fput_object(settings.S3_BUCKET_ASSETS, s3_key, img_path, content_type=content_type)
            keys.append(s3_key)
        except Exception as e:
            print(f"    Warning: image upload failed ({img_file}): {e}")
    return keys


async def seed_data():
    # ── MinIO ──────────────────────────────────────────────────────────────────
    minio_client = None
    try:
        endpoint = settings.S3_ENDPOINT.replace("http://", "").replace("https://", "")
        minio_client = Minio(
            endpoint,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            secure=settings.S3_ENDPOINT.startswith("https://"),
        )
        if not minio_client.bucket_exists(settings.S3_BUCKET_ASSETS):
            minio_client.make_bucket(settings.S3_BUCKET_ASSETS)
    except Exception as e:
        print(f"  Warning: MinIO unavailable — images will be skipped. ({e})")

    sample_images_dir = os.path.join(parent_dir, "sample images")
    available_images = []
    if os.path.exists(sample_images_dir):
        available_images = [
            f for f in os.listdir(sample_images_dir)
            if os.path.isfile(os.path.join(sample_images_dir, f)) and not f.startswith(".")
        ]

    async with AsyncSessionLocal() as db:
        print("=== AuctionHub — Seed Data ===\n")

        # ── 1. Users ───────────────────────────────────────────────────────────
        users_spec = [
            {
                "username": "admin_user",
                "email": "admin@example.com",
                "role": UserRole.admin,
                "tier": SubscriptionTier.free,
                "balance": 500.0,
                "full_name": "System Admin",
            },
            {
                "username": "normal_user_1",
                "email": "user1@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.premium,
                "balance": 5000.0,
                "full_name": "Alex Chen",
            },
            {
                "username": "normal_user_2",
                "email": "user2@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.premium,
                "balance": 5000.0,
                "full_name": "Jordan Williams",
            },
            {
                "username": "normal_user_3",
                "email": "user3@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 3000.0,
                "full_name": "Sam Mitchell",
            },
            {
                "username": "normal_user_4",
                "email": "user4@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 3000.0,
                "full_name": "Riley Thompson",
            },
            {
                "username": "normal_user_5",
                "email": "user5@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 2500.0,
                "full_name": "Morgan Davis",
            },
            {
                "username": "normal_user_6",
                "email": "user6@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 2000.0,
                "full_name": "Casey Johnson",
            },
            {
                "username": "normal_user_7",
                "email": "user7@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 2000.0,
                "full_name": "Drew Anderson",
            },
            {
                "username": "normal_user_8",
                "email": "user8@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 2000.0,
                "full_name": "Taylor Brown",
            },
            {
                "username": "normal_user_9",
                "email": "user9@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 2000.0,
                "full_name": "Blake Wilson",
            },
        ]

        all_users = []
        created_count = 0
        for spec in users_spec:
            result = await db.execute(select(User).where(User.username == spec["username"]))
            user = result.scalars().first()
            if not user:
                user = User(
                    username=spec["username"],
                    email=spec["email"],
                    password_hash=get_password_hash("password123"),
                    role=spec["role"],
                    subscription_tier=spec["tier"],
                    balance=spec["balance"],
                    email_verified=True,
                )
                db.add(user)
                await db.flush()
                db.add(UserProfiles(user_id=user.id, full_name=spec["full_name"]))
                created_count += 1
            all_users.append(user)

        await db.flush()
        normal_users = [u for u in all_users if u.role == UserRole.user]
        print(f"Users: {created_count} created, {len(users_spec) - created_count} already existed.")

        # ── 2. Subscription tiers ──────────────────────────────────────────────
        tier_defs = [
            (SubscriptionTier.free,    0.0,  365, "Free tier — basic marketplace access"),
            (SubscriptionTier.premium, 49.0, 365, "Premium — unlimited actions, Collector Boards, priority support"),
        ]
        for tier, price, days, desc in tier_defs:
            existing = await db.execute(
                select(SubscriptionTierConfig).where(SubscriptionTierConfig.tier == tier)
            )
            if not existing.scalars().first():
                db.add(SubscriptionTierConfig(tier=tier, price=price, duration_days=days, description=desc))
        await db.flush()
        print("Subscription tiers: ensured.")

        # ── 3. Auction durations ───────────────────────────────────────────────
        duration_defs = [(1, "1 Day"), (3, "3 Days"), (7, "7 Days"), (14, "14 Days")]
        for order, (value, label) in enumerate(duration_defs, start=1):
            existing = await db.execute(select(AuctionDuration).where(AuctionDuration.value == value))
            if not existing.scalars().first():
                db.add(AuctionDuration(value=value, label=label, is_active=True, sort_order=order))
        await db.flush()
        print("Auction durations: ensured.")

        # ── 4. Categories ──────────────────────────────────────────────────────
        category_defs = [
            ("Electronics",    "electronics"),
            ("Collectibles",   "collectibles"),
            ("Home & Garden",  "home-garden"),
            ("Sporting Goods", "sporting-goods"),
            ("Fashion",        "fashion"),
            ("Books & Media",  "books-media"),
        ]
        categories = {}
        for name, slug in category_defs:
            result = await db.execute(select(Categories).where(Categories.slug == slug))
            cat = result.scalars().first()
            if not cat:
                cat = Categories(name=name, slug=slug)
                db.add(cat)
                await db.flush()
            categories[slug] = cat
        print(f"Categories: {len(categories)} ensured.")

        # ── 5. User interests (cold-start onboarding) ──────────────────────────
        for user in normal_users:
            existing = await db.execute(select(UserInterest).where(UserInterest.user_id == user.id))
            if existing.scalars().first():
                continue
            picks = random.sample(list(categories.values()), k=random.randint(2, 3))
            for cat in picks:
                db.add(UserInterest(user_id=user.id, category_id=cat.id))
        await db.flush()
        print("User interests: ensured.")

        # ── Skip listings block if already seeded ──────────────────────────────
        existing_listing_count = await db.scalar(select(func.count()).select_from(Listing))
        if existing_listing_count > 0:
            print(f"\nListings already exist ({existing_listing_count} found). Skipping listing/interaction seeding.")
            await db.commit()
            print("\n=== Seeding complete! ===")
            return

        # ── 6. Ended listings + bids + auction results ─────────────────────────
        #
        # seller_idx / winner_idx are 0-based indices into normal_users.
        #   0 = normal_user_1 (Alex Chen,   premium)
        #   1 = normal_user_2 (Jordan Williams, premium)
        #   2 = normal_user_3 (Sam Mitchell, free)
        #   3 = normal_user_4 (Riley Thompson, free)
        #   4 = normal_user_5 (Morgan Davis, free)
        #   5 = normal_user_6 (Casey Johnson, free)
        #
        ended_specs = [
            # title, cat, condition, start_price, brand, description, seller_idx, winner_idx, final_price, ended_days_ago
            (
                "Vintage Omega Seamaster 1960s",
                "collectibles", ItemConditions.used, 450.0, "Omega",
                "Pristine example of the iconic Seamaster. Original dial, hands, and crown intact. Box and papers included.",
                2, 0, 780.0, 3,
            ),
            (
                "Sony PlayStation 5 Console (Disc Edition)",
                "electronics", ItemConditions.used, 350.0, "Sony",
                "Barely used PS5 disc edition. Two DualSense controllers, HDMI cable, and power cable included.",
                2, 0, 520.0, 5,
            ),
            (
                "Canon EOS R5 Mirrorless Camera Body",
                "electronics", ItemConditions.used, 1800.0, "Canon",
                "Professional full-frame mirrorless. ~8,000 shutter actuations. Sensor in perfect condition. No marks.",
                2, 0, 2450.0, 1,
            ),
            (
                "Fender American Vintage '62 Stratocaster",
                "collectibles", ItemConditions.used, 900.0, "Fender",
                "1992 USA reissue. Sunburst finish, original pickups, lightweight alder body. Plays beautifully.",
                2, 0, 1250.0, 2,
            ),
            (
                "Apple MacBook Pro M3 14-inch (16GB/512GB)",
                "electronics", ItemConditions.used, 1500.0, "Apple",
                "Late 2023 model. Space Grey. AppleCare until 2026. Pristine screen, no dead pixels.",
                3, 1, 1820.0, 4,
            ),
            (
                "Sony WH-1000XM5 Wireless Headphones",
                "electronics", ItemConditions.new, 250.0, "Sony",
                "Factory sealed box. Midnight Black. Industry-leading ANC. Purchased as spare, never opened.",
                3, 1, 350.0, 6,
            ),
            (
                "Trek Domane SL 6 Road Bike (56cm)",
                "sporting-goods", ItemConditions.used, 1200.0, "Trek",
                "2022 model. Shimano 105 R7000 groupset. Carbon fork. Under 500 miles. Saddle and pedals included.",
                4, 2, 1750.0, 2,
            ),
            (
                "Harry Potter and the Philosopher's Stone — 1st UK Edition",
                "books-media", ItemConditions.used, 800.0, None,
                "1997 Bloomsbury first print, first edition. Minor shelf wear to cover. All pages clean and tight.",
                5, 3, 1980.0, 7,
            ),
        ]

        ended_results = []  # [(AuctionResult, Listing, winner_User)]
        print("\nCreating ended listings...")
        for (
            title, cat_slug, condition, start_price, brand, description,
            seller_idx, winner_idx, final_price, ended_days_ago,
        ) in ended_specs:
            seller = normal_users[seller_idx]
            winner = normal_users[winner_idx]
            end_time = datetime.now(timezone.utc) - timedelta(days=ended_days_ago)
            start_time = end_time - timedelta(days=7)
            min_inc = round(start_price * 0.05, 2)

            listing = Listing(
                seller_id=seller.id,
                category_id=categories[cat_slug].id,
                title=title,
                description=description,
                brand=brand,
                condition=condition,
                condition_confidence=round(random.uniform(72.0, 98.0), 2),
                bidding_type=BiddingType.price_up,
                starting_price=start_price,
                reserve_price=round(start_price * 1.4, 2),
                current_price=final_price,
                min_increment=min_inc,
                status=ListingStatus.ended,
                is_draft=False,
                start_time=start_time,
                end_time=end_time,
            )
            db.add(listing)
            await db.flush()

            s3_keys = _upload_images(minio_client, sample_images_dir, available_images, listing.id)
            for idx, key in enumerate(s3_keys):
                db.add(ListingImages(listing_id=listing.id, s3_key=key, sort_order=idx, is_primary=(idx == 0)))

            # 2 losing bids from other users
            losers = [u for u in normal_users if u.id not in (seller.id, winner.id)]
            bid_time = start_time + timedelta(hours=24)
            losing_price = start_price
            for bidder in random.sample(losers, min(2, len(losers))):
                losing_price = round(losing_price + min_inc * random.randint(1, 3), 2)
                bid_time += timedelta(hours=random.randint(6, 20))
                db.add(Bid(
                    listing_id=listing.id,
                    bidder_id=bidder.id,
                    amount=losing_price,
                    status=BidStatus.accepted,
                    placed_at=bid_time,
                ))

            # Winning bid
            winning_bid = Bid(
                listing_id=listing.id,
                bidder_id=winner.id,
                amount=final_price,
                status=BidStatus.accepted,
                placed_at=end_time - timedelta(minutes=random.randint(5, 55)),
            )
            db.add(winning_bid)
            await db.flush()

            auction_result = AuctionResult(
                listing_id=listing.id,
                winner_id=winner.id,
                winning_bid_id=winning_bid.id,
                final_price=final_price,
                ended_at=end_time,
            )
            db.add(auction_result)
            await db.flush()
            ended_results.append((auction_result, listing, winner))
            print(f"  ✓ {title[:52]:<52}  won by {winner.username} @ ${final_price:.2f}")

        # ── 7. Active listings ─────────────────────────────────────────────────
        active_items = [
            # title, cat_slug, condition, start_price, brand
            ("Rolex Submariner Date (Ref. 116610LN, 2019)",  "collectibles",  ItemConditions.used,      7500.0, "Rolex"),
            ("NVIDIA GeForce RTX 4090 Founders Edition",     "electronics",   ItemConditions.used,       800.0, "NVIDIA"),
            ("Dyson V15 Detect Cordless Vacuum",             "home-garden",   ItemConditions.new,        450.0, "Dyson"),
            ("Specialized Allez Sprint Road Bike (54cm)",    "sporting-goods",ItemConditions.used,       950.0, "Specialized"),
            ("Supreme Box Logo Hoodie FW22 (Size M)",        "fashion",       ItemConditions.new,        180.0, "Supreme"),
            ("The Lord of the Rings — Tolkien 1st Ed Box",   "books-media",   ItemConditions.used,       350.0, None),
            ("Apple iPad Pro 12.9-inch M2 (256GB WiFi)",     "electronics",   ItemConditions.used,       600.0, "Apple"),
            ("Vintage Polaroid SX-70 Land Camera",           "collectibles",  ItemConditions.used,        90.0, "Polaroid"),
            ("Nespresso Vertuo Next Coffee Machine",         "home-garden",   ItemConditions.new,        120.0, "Nespresso"),
            ("Lululemon Define Jacket (Size S, Black)",      "fashion",       ItemConditions.new,         65.0, "Lululemon"),
            ("Yamaha YDP-145 Digital Piano (Black)",         "collectibles",  ItemConditions.used,       500.0, "Yamaha"),
            ("DJI Mini 4 Pro Drone (Fly More Combo)",        "electronics",   ItemConditions.used,       700.0, "DJI"),
            ("Weber Master-Touch 57cm Charcoal Grill",       "home-garden",   ItemConditions.used,       150.0, "Weber"),
            ("Patagonia Nano Puff Jacket (Men's XL)",        "fashion",       ItemConditions.new,        120.0, "Patagonia"),
            ("Vintage Leica M6 TTL 0.85 Film Camera Body",  "collectibles",  ItemConditions.used,      1200.0, "Leica"),
        ]

        active_listings = []
        print("\nCreating active listings...")
        for title, cat_slug, condition, start_price, brand in active_items:
            seller = random.choice(normal_users)
            min_inc = round(start_price * 0.05, 2)
            started = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 3))
            ends = datetime.now(timezone.utc) + timedelta(days=random.randint(1, 14))

            listing = Listing(
                seller_id=seller.id,
                category_id=categories[cat_slug].id,
                title=title,
                description=f"Great {title} in {condition.value} condition. See photos for details.",
                brand=brand,
                condition=condition,
                condition_confidence=round(random.uniform(70.0, 99.0), 2),
                bidding_type=BiddingType.price_up,
                starting_price=start_price,
                reserve_price=round(start_price * 1.4, 2),
                current_price=start_price,
                min_increment=min_inc,
                status=ListingStatus.active,
                is_draft=False,
                start_time=started,
                end_time=ends,
            )
            db.add(listing)
            await db.flush()

            s3_keys = _upload_images(minio_client, sample_images_dir, available_images, listing.id)
            for idx, key in enumerate(s3_keys):
                db.add(ListingImages(listing_id=listing.id, s3_key=key, sort_order=idx, is_primary=(idx == 0)))

            # Random bid chain
            current_price = start_price
            bid_time = started
            for _ in range(random.randint(0, 6)):
                bidders = [u for u in normal_users if u.id != seller.id]
                bidder = random.choice(bidders)
                current_price = round(current_price + min_inc * random.randint(1, 4), 2)
                bid_time += timedelta(hours=random.randint(1, 12))
                if bid_time >= datetime.now(timezone.utc):
                    break
                db.add(Bid(
                    listing_id=listing.id,
                    bidder_id=bidder.id,
                    amount=current_price,
                    status=BidStatus.accepted,
                    placed_at=bid_time,
                ))
            listing.current_price = current_price
            await db.flush()
            active_listings.append(listing)

        print(f"  {len(active_listings)} active listings created.")

        # ── 8. Draft listings ──────────────────────────────────────────────────
        #   seller_idx = index in normal_users
        draft_specs = [
            ("Leica M6 Film Camera (Mint, 0.72 finder)",    "collectibles", ItemConditions.used, 1400.0, "Leica",  0),
            ("Vintage Gibson ES-335 Semi-Hollow (Sunburst)", "collectibles", ItemConditions.used, 1600.0, "Gibson", 1),
            ("Bose QuietComfort 45 Headphones (Sealed)",    "electronics",  ItemConditions.new,   180.0, "Bose",   2),
        ]
        for title, cat_slug, condition, start_price, brand, seller_idx in draft_specs:
            db.add(Listing(
                seller_id=normal_users[seller_idx].id,
                category_id=categories[cat_slug].id,
                title=title,
                description=f"Draft listing for {title}.",
                brand=brand,
                condition=condition,
                bidding_type=BiddingType.price_up,
                starting_price=start_price,
                reserve_price=round(start_price * 1.3, 2),
                current_price=start_price,
                min_increment=round(start_price * 0.05, 2),
                status=ListingStatus.draft,
                is_draft=True,
            ))
        await db.flush()
        print("Draft listings: 3 created.")

        # ── 9. Watchlist ───────────────────────────────────────────────────────
        # normal_user_1 watches 5 active listings, normal_user_2 watches 3
        for user, count in [(normal_users[0], 5), (normal_users[1], 3), (normal_users[2], 2)]:
            for listing in random.sample(active_listings, min(count, len(active_listings))):
                db.add(Watchlist(user_id=user.id, listing_id=listing.id))
        await db.flush()
        print("Watchlist: entries created.")

        # ── 10. User interactions (views + bids + searches) ────────────────────
        now = datetime.now(timezone.utc)
        all_published = active_listings + [listing for _, listing, _ in ended_results]
        for listing in all_published:
            base = listing.start_time or (now - timedelta(days=5))
            upper = listing.end_time if listing.status == ListingStatus.ended else now
            span = max((upper - base).total_seconds(), 1)

            # 4–8 view interactions from random users
            for viewer in random.sample(normal_users, min(random.randint(4, 8), len(normal_users))):
                db.add(UserInteraction(
                    user_id=viewer.id,
                    listing_id=listing.id,
                    action=InteractionAction.view,
                    occurred_at=base + timedelta(seconds=random.uniform(0, span)),
                ))

        # bid interactions from existing active-listing bids
        bid_rows = await db.execute(
            select(Bid).where(Bid.listing_id.in_([l.id for l in active_listings]))
        )
        for bid in bid_rows.scalars().all():
            db.add(UserInteraction(
                user_id=bid.bidder_id,
                listing_id=bid.listing_id,
                action=InteractionAction.bid,
                occurred_at=bid.placed_at,
            ))

        # 1–2 search clicks per active listing from a random user
        for listing in active_listings:
            for _ in range(random.randint(1, 2)):
                db.add(UserInteraction(
                    user_id=random.choice(normal_users).id,
                    listing_id=listing.id,
                    action=InteractionAction.search,
                    occurred_at=listing.start_time + timedelta(hours=random.randint(1, 24)),
                ))

        await db.flush()
        print("User interactions: created.")

        # ── 11. Wallet transactions ────────────────────────────────────────────
        # One topup per user matching their initial balance.
        # Settlements for ended auctions (debit winner, credit seller).
        for user in all_users:
            db.add(WalletTransaction(
                user_id=user.id,
                amount=user.balance,
                type=TransactionType.topup,
                reference="Initial balance top-up",
            ))
        for auction_result, listing, winner in ended_results:
            db.add(WalletTransaction(
                user_id=winner.id,
                amount=auction_result.final_price,
                type=TransactionType.settlement,
                reference=f"Won: {listing.title[:80]}",
            ))
            db.add(WalletTransaction(
                user_id=listing.seller_id,
                amount=auction_result.final_price,
                type=TransactionType.settlement,
                reference=f"Sold: {listing.title[:80]}",
            ))
        await db.flush()
        print("Wallet transactions: created.")

        # ── 12. Collector boards ───────────────────────────────────────────────
        # normal_user_1 (Alex): 4 wins → "Premium Picks" (3 items) + "Hidden Gems" (1 item)
        # normal_user_2 (Jordan): 2 wins → "Tech Collection" (2 items)
        user1_wins = [(r, l) for r, l, w in ended_results if w.id == normal_users[0].id]
        user2_wins = [(r, l) for r, l, w in ended_results if w.id == normal_users[1].id]

        board_premium = CollectorBoard(
            user_id=normal_users[0].id,
            name="Premium Picks",
            description="My finest auction wins — watches, cameras, and rare classics.",
            is_public=True,
        )
        board_hidden = CollectorBoard(
            user_id=normal_users[0].id,
            name="Hidden Gems",
            description="Underrated finds I keep off the radar.",
            is_public=False,
        )
        board_tech = CollectorBoard(
            user_id=normal_users[1].id,
            name="Tech Collection",
            description="Best tech pieces I've picked up at auction.",
            is_public=True,
        )
        db.add_all([board_premium, board_hidden, board_tech])
        await db.flush()

        # First 3 of user1's wins → "Premium Picks", remainder → "Hidden Gems"
        for i, (auction_result, _) in enumerate(user1_wins):
            board = board_premium if i < 3 else board_hidden
            db.add(BoardItem(board_id=board.id, auction_result_id=auction_result.id, sort_order=i % 3))

        # All of user2's wins → "Tech Collection"
        for i, (auction_result, _) in enumerate(user2_wins):
            db.add(BoardItem(board_id=board_tech.id, auction_result_id=auction_result.id, sort_order=i))

        await db.flush()
        print("Collector boards: 3 boards created with items.")

        # ── 13. Testimonials ───────────────────────────────────────────────────
        testimonial_data = [
            (
                normal_users[0],
                "AuctionHub completely changed how I find rare collectibles. The bidding is fair, "
                "fast, and transparent. Won my dream Omega in minutes!",
                5, True,
            ),
            (
                normal_users[1],
                "The Collector Board feature alone is worth the Premium subscription. "
                "I love being able to showcase my wins publicly.",
                5, True,
            ),
            (
                normal_users[2],
                "Sold three items in a week with no hassle. The AI condition scoring builds "
                "real trust with buyers. Highly recommend.",
                4, True,
            ),
        ]
        for user, content, rating, featured in testimonial_data:
            db.add(Testimonial(user_id=user.id, content=content, rating=rating, is_featured=featured))
        await db.flush()
        print("Testimonials: 3 created.")

        await db.commit()
        print(f"""
=== Seeding complete! ===
  Ended listings : {len(ended_specs)}  (with bids + auction_results)
  Active listings: {len(active_listings)}  (with bids + interactions)
  Draft listings :  3
  Auction results: {len(ended_specs)}
  Collector boards: 3  (Premium Picks, Hidden Gems, Tech Collection)
  Testimonials   : 3  (all featured)

  Credentials (all users): password123
  Premium accounts: normal_user_1, normal_user_2
""")


if __name__ == "__main__":
    asyncio.run(seed_data())
