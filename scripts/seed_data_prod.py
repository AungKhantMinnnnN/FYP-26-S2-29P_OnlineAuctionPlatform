import asyncio
import os
import random
import sys
from datetime import datetime, timedelta, timezone

script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
backend_dir = os.path.join(parent_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import mimetypes
import uuid

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.auction import (
    AuctionDuration,
    AuctionResult,
    Bid,
    BiddingType,
    BidStatus,
    BoardItem,
    Categories,
    CollectorBoard,
    Dispute,
    DisputeStatus,
    FeedbackType,
    FlaggedListingAttempt,
    InteractionAction,
    IssueType,
    ItemConditions,
    ItemFeedback,
    Listing,
    ListingImages,
    ListingStatus,
    MarketingVideo,
    OptionSet,
    ProhibitedKeyword,
    SiteContent,
    SubscriptionTier,
    SubscriptionTierConfig,
    Testimonial,
    TransactionType,
    User,
    UserInteraction,
    UserInterest,
    UserProfiles,
    UserRole,
    WalletTransaction,
    Watchlist,
)
from minio import Minio
from sqlalchemy import func, select


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


def _upload_single_image(minio_client, sample_images_dir, img_file, listing_id):
    """Upload one specific sample image and return its s3 key (or None)."""
    if not minio_client or not img_file:
        return None
    img_path = os.path.join(sample_images_dir, img_file)
    ext = os.path.splitext(img_file)[1]
    s3_key = f"seed/{uuid.uuid4()}{ext}"
    content_type, _ = mimetypes.guess_type(img_path)
    content_type = content_type or "application/octet-stream"
    try:
        minio_client.fput_object(settings.S3_BUCKET_ASSETS, s3_key, img_path, content_type=content_type)
        return s3_key
    except Exception as e:
        print(f"    Warning: image upload failed ({img_file}): {e}")
        return None


DEC_END = datetime(2026, 12, 31, 23, 59, 59, tzinfo=timezone.utc)

# Production ACTIVE listings: title, cat_slug, condition, start_price, brand.
# Auctions stay open until 31 December 2026 (each gets a prod_auction_*.jpg photo).
PROD_ACTIVE_ITEMS = [
    ("Apple iPhone 16 Pro Max (256GB, Natural Titanium)", "electronics", ItemConditions.new, 1100.0, "Apple"),
    ("Samsung Galaxy S25 Ultra (512GB, Titanium Grey)", "electronics", ItemConditions.new, 950.0, "Samsung"),
    ("Apple MacBook Air M3 13-inch (16GB/256GB)", "electronics", ItemConditions.new, 1100.0, "Apple"),
    ("Dell XPS 15 (Intel Ultra 9, 32GB, RTX 4070)", "electronics", ItemConditions.used, 1450.0, "Dell"),
    ("Sony A7 IV Mirrorless Camera Body", "electronics", ItemConditions.used, 1900.0, "Sony"),
    ("Fujifilm X-T5 Camera (35mm f/1.4 Kit)", "electronics", ItemConditions.used, 1450.0, "Fujifilm"),
    ("GoPro HERO12 Black Action Camera", "electronics", ItemConditions.new, 320.0, "GoPro"),
    ("Sony WH-1000XM5 Headphones (Sealed)", "electronics", ItemConditions.new, 260.0, "Sony"),
    ("Bose QuietComfort Ultra Headphones", "electronics", ItemConditions.new, 300.0, "Bose"),
    ("Apple Watch Ultra 2 (49mm, Titanium)", "electronics", ItemConditions.new, 620.0, "Apple"),
    ("Samsung Galaxy Watch 6 Classic 47mm", "electronics", ItemConditions.new, 280.0, "Samsung"),
    ("iPad Pro 12.9-inch M4 (512GB, WiFi+Cellular)", "electronics", ItemConditions.new, 1150.0, "Apple"),
    ("Amazon Kindle Paperwhite Signature (32GB)", "electronics", ItemConditions.new, 150.0, "Amazon"),
    ("Sonos Era 300 Smart Speaker (White)", "electronics", ItemConditions.new, 380.0, "Sonos"),
    ("Logitech MX Master 3S Wireless Mouse", "electronics", ItemConditions.new, 80.0, "Logitech"),
    ("Keychron Q3 Pro Mechanical Keyboard", "electronics", ItemConditions.new, 170.0, "Keychron"),
    ("DJI Osmo Pocket 3 Creator Combo", "electronics", ItemConditions.new, 380.0, "DJI"),
    ("Xbox Series X Console (1TB, Black)", "electronics", ItemConditions.used, 380.0, "Microsoft"),
    ("Oculus Quest 3 VR Headset (512GB)", "electronics", ItemConditions.used, 420.0, "Meta"),
    ("Anker Prime 27,650mAh Power Bank (250W)", "electronics", ItemConditions.new, 170.0, "Anker"),
    ("Samsung 75\" Neo QLED 8K TV (QN800D)", "electronics", ItemConditions.used, 2600.0, "Samsung"),
    ("Sony Bravia 65\" OLED XR-65A80L", "electronics", ItemConditions.new, 1800.0, "Sony"),
    ("Nintendo Switch 2 (Preorder, White)", "electronics", ItemConditions.new, 400.0, "Nintendo"),
    ("Steam Deck LCD 512GB (Valve)", "electronics", ItemConditions.used, 380.0, "Valve"),
    ("Apple AirPods Pro 2 (USB-C, Sealed)", "electronics", ItemConditions.new, 200.0, "Apple"),
    ("Fujifilm Instax Mini 12 (Sky Blue)", "electronics", ItemConditions.new, 60.0, "Fujifilm"),
    ("Rolex Explorer II (Ref. 226570, Black)", "collectibles", ItemConditions.used, 8200.0, "Rolex"),
    ("Omega Speedmaster Moonwatch (2023)", "collectibles", ItemConditions.used, 5200.0, "Omega"),
    ("TAG Heuer Carrera (Ref. CBS2212)", "collectibles", ItemConditions.used, 3900.0, "TAG Heuer"),
    ("Seiko Prospex SPB143 Dive Watch", "collectibles", ItemConditions.new, 780.0, "Seiko"),
    ("Casio G-Shock 'Royal Oak' GA-2100", "collectibles", ItemConditions.new, 120.0, "Casio"),
    ("LEGO Star Wars UCS Millennium Falcon 75192", "collectibles", ItemConditions.new, 690.0, "LEGO"),
    ("LEGO Icons Titanic 10294 (Sealed)", "collectibles", ItemConditions.new, 550.0, "LEGO"),
    ("LEGO Technic Lamborghini Sián 42115", "collectibles", ItemConditions.new, 320.0, "LEGO"),
    ("Hot Wheels Red Line '68 Camaro (Mint)", "collectibles", ItemConditions.used, 240.0, "Hot Wheels"),
    ("Vintage Postage Stamp Collection (Album)", "collectibles", ItemConditions.used, 95.0, None),
    ("1957 Topps Baseball Card Bundle (10)", "collectibles", ItemConditions.used, 320.0, "Topps"),
    ("Pokemon TCG Charizard ex (151, PSA 9)", "collectibles", ItemConditions.new, 900.0, "Pokemon"),
    ("MTG 'The One Ring' Showcase Foil", "collectibles", ItemConditions.new, 760.0, "Wizards"),
    ("Star Wars Black Series Boba Fett (Sealed)", "collectibles", ItemConditions.new, 130.0, "Hasbro"),
    ("Funko Pop! Elvis Presley (GITD, Rare)", "collectibles", ItemConditions.new, 160.0, "Funko"),
    ("Franklin Mint Die-Cast Firebird Collection", "collectibles", ItemConditions.new, 180.0, "Franklin Mint"),
    ("Vintage Fernand Colin Cookie Jar", "collectibles", ItemConditions.used, 90.0, None),
    ("1943 US Steel Penny Collection (Roll)", "collectibles", ItemConditions.used, 140.0, None),
    ("Fender Player Stratocaster (Sunburst)", "collectibles", ItemConditions.used, 520.0, "Fender"),
    ("Yamaha FG800 Acoustic Guitar (Natural)", "collectibles", ItemConditions.new, 180.0, "Yamaha"),
    ("Gibson SG Standard '61 (Cherry)", "collectibles", ItemConditions.used, 1180.0, "Gibson"),
    ("IKEA Poäng Lounge Chair (Birch)", "home-garden", ItemConditions.used, 140.0, "IKEA"),
    ("Herman Miller Aeron Chair (Size B)", "home-garden", ItemConditions.used, 950.0, "Herman Miller"),
    ("Le Creuset 26cm Dutch Oven (Flame)", "home-garden", ItemConditions.used, 220.0, "Le Creuset"),
    ("Vitamix 5200 Blender (Refurbished)", "home-garden", ItemConditions.refurbished, 240.0, "Vitamix"),
    ("Nespresso Vertuo Pop Coffee Maker", "home-garden", ItemConditions.new, 90.0, "Nespresso"),
    ("Dyson V15 Detect Absolut Vacuum", "home-garden", ItemConditions.used, 420.0, "Dyson"),
    ("iRobot Roomba j7+ Robot Vacuum", "home-garden", ItemConditions.refurbished, 320.0, "iRobot"),
    ("Sonos Beam (Gen 2) Soundbar", "home-garden", ItemConditions.new, 380.0, "Sonos"),
    ("Monstera Deliciosa (Large, 3ft)", "home-garden", ItemConditions.new, 55.0, None),
    ("Crate & Barrel Modern Wooden Coffee Table", "home-garden", ItemConditions.used, 260.0, "Crate & Barrel"),
    ("Marimekko Unikko Runner Rug (5ft)", "home-garden", ItemConditions.new, 120.0, "Marimekko"),
    ("Philips Hue Starter Kit (4 Bulbs + Bridge)", "home-garden", ItemConditions.new, 150.0, "Philips"),
    ("Sage Barista Express Espresso Machine", "home-garden", ItemConditions.used, 420.0, "Sage"),
    ("Nespresso Vertuo Next by De'Longhi", "home-garden", ItemConditions.new, 120.0, "De'Longhi"),
    ("Breville Barista Touch BES880", "home-garden", ItemConditions.used, 780.0, "Breville"),
    ("LG CordZero A916 AeroTower", "home-garden", ItemConditions.new, 380.0, "LG"),
    ("West Elm Mid-Century Platform Bed", "home-garden", ItemConditions.used, 450.0, "West Elm"),
    ("Trek FX 3 Disc Hybrid Bike (2023)", "sporting-goods", ItemConditions.used, 620.0, "Trek"),
    ("Canyon Grail CF SL Gravel Bike (M)", "sporting-goods", ItemConditions.used, 2100.0, "Canyon"),
    ("Peloton Bike+ (Original, 2021)", "sporting-goods", ItemConditions.used, 900.0, "Peloton"),
    ("Garmin Forerunner 965 GPS Watch", "sporting-goods", ItemConditions.new, 540.0, "Garmin"),
    ("Wilson Staff Model CB Iron Set (6-PW)", "sporting-goods", ItemConditions.used, 720.0, "Wilson"),
    ("Taylormade Stealth 2 Driver (XF, 10.5°)", "sporting-goods", ItemConditions.used, 310.0, "Taylormade"),
    ("YETI Tundra 45 Cooler (White)", "sporting-goods", ItemConditions.new, 320.0, "YETI"),
    ("Bowflex SelectTech 552 Dumbbells (Pair)", "sporting-goods", ItemConditions.used, 280.0, "Bowflex"),
    ("ENERGYWAY Yoga Mat (6mm, Cork)", "sporting-goods", ItemConditions.new, 45.0, "ENERGYWAY"),
    ("Nike Pro Training Weights Set (20kg)", "sporting-goods", ItemConditions.new, 130.0, "Nike"),
    ("REI Co-op Flash 55 Backpack (2023)", "sporting-goods", ItemConditions.used, 210.0, "REI"),
    ("Bose SoundLink Flex (Waterproof Speaker)", "sporting-goods", ItemConditions.new, 120.0, "Bose"),
    ("Peloton Guide + Bundled Equipment", "sporting-goods", ItemConditions.new, 340.0, "Peloton"),
    ("Wilson Advantage HD Tennis Racquet (Pair)", "sporting-goods", ItemConditions.new, 120.0, "Wilson"),
    ("Rawlings 12\" Pro Taper Glove", "sporting-goods", ItemConditions.used, 90.0, "Rawlings"),
    ("Canada Goose Wyndham Parka (Charcoal)", "fashion", ItemConditions.used, 720.0, "Canada Goose"),
    ("The North Face Nuptse 1996 (Black)", "fashion", ItemConditions.new, 260.0, "The North Face"),
    ("Arc'teryx Atom LT Hoody (Size M)", "fashion", ItemConditions.new, 240.0, "Arc'teryx"),
    ("Patagonia Better Sweater (Forest)", "fashion", ItemConditions.new, 100.0, "Patagonia"),
    ("Supreme Box Logo Tee FW23 (White)", "fashion", ItemConditions.new, 220.0, "Supreme"),
    ("Air Jordan 1 High 'Chicago' (2022)", "fashion", ItemConditions.used, 340.0, "Nike"),
    ("Nike Dunk Low 'Panda' (UK 9)", "fashion", ItemConditions.new, 130.0, "Nike"),
    ("New Balance 9060 (UK 8.5)", "fashion", ItemConditions.new, 120.0, "New Balance"),
    ("Adidas Samba OG (UK 9, Black)", "fashion", ItemConditions.new, 95.0, "Adidas"),
    ("Balenciaga Speed Trainer (UK 10)", "fashion", ItemConditions.used, 280.0, "Balenciaga"),
    ("Gucci GG Marmont Handbag (Small)", "fashion", ItemConditions.used, 1550.0, "Gucci"),
    ("Longchamp Le Pliage Tote (Small)", "fashion", ItemConditions.new, 95.0, "Longchamp"),
    ("Oakley Holbrook Sunglasses (Matte Black)", "fashion", ItemConditions.new, 110.0, "Oakley"),
    ("Ray-Ban Aviator Classic (Gold, 55mm)", "fashion", ItemConditions.new, 130.0, "Ray-Ban"),
    ("Rolex Cellini Gold Watch (Dress)", "fashion", ItemConditions.used, 6800.0, "Rolex"),
    ("Nike Dri-FIT Running Jacket (M)", "fashion", ItemConditions.new, 85.0, "Nike"),
    ("Uniqlo U Oversized Tee (Wolf, Pack of 2)", "fashion", ItemConditions.new, 40.0, "Uniqlo"),
    ("Ralph Lauren Rugby Shirt (L)", "fashion", ItemConditions.used, 75.0, "Ralph Lauren"),
    ("Chanel Classic Flap Bag (Medium)", "fashion", ItemConditions.used, 7200.0, "Chanel"),
    ("1988 Stephen King 'It' 1st Edition", "books-media", ItemConditions.used, 140.0, "Viking"),
    ("Haruki Murakami 'Norwegian Wood' Signed", "books-media", ItemConditions.used, 110.0, "Kodansha"),
    ("Complete Harry Potter Box Set (HB)", "books-media", ItemConditions.new, 190.0, "Bloomsbury"),
    ("The Beatles 'White Album' (1968 1st UK)", "books-media", ItemConditions.used, 780.0, "Apple"),
    ("Nirvana 'Nevermind' Original Vinyl (1991)", "books-media", ItemConditions.used, 210.0, "DGC"),
    ("Pink Floyd 'Dark Side of the Moon' Vinyl", "books-media", ItemConditions.used, 70.0, "Harvest"),
    ("Bob Dylan 'Blonde on Blonde' 1st Press", "books-media", ItemConditions.used, 340.0, "Columbia"),
    ("Marvel 'Amazing Spider-Man #300' (1988)", "books-media", ItemConditions.used, 560.0, "Marvel"),
    ("DC 'Batman: The Dark Knight Returns' #1", "books-media", ItemConditions.used, 240.0, "DC"),
    ("Criterion Collection Blu-ray Lot (10 Films)", "books-media", ItemConditions.used, 180.0, "Criterion"),
    ("J.K. Rowling 'The Casual Vacancy' Signed 1st", "books-media", ItemConditions.used, 95.0, "Little Brown"),
    ("Scarlett Johansson Movie Poster Collection", "books-media", ItemConditions.used, 60.0, None),
]

# Production ENDED listings: title, cat_slug, condition, start_price, brand.
PROD_ENDED_ITEMS = [
    ("Apple iPhone 13 Pro (128GB, Graphite)", "electronics", ItemConditions.used, 300.0, "Apple"),
    ("Sony PlayStation 4 Pro (1TB)", "electronics", ItemConditions.used, 150.0, "Sony"),
    ("Fossil Gen 6 Smartwatch (44mm)", "electronics", ItemConditions.used, 90.0, "Fossil"),
    ("Vintage Pendleton Wool Blanket", "home-garden", ItemConditions.used, 120.0, "Pendleton"),
    ("Adidas Ultraboost 21 (UK 9)", "fashion", ItemConditions.used, 65.0, "Adidas"),
    ("The Hobbit 75th Anniversary Edition", "books-media", ItemConditions.used, 75.0, "HMH"),
    ("Taylor GS Mini Acoustic Guitar", "collectibles", ItemConditions.used, 380.0, "Taylor"),
    ("REI Half Dome 2 Plus Tent", "sporting-goods", ItemConditions.used, 160.0, "REI"),
]

# Production DRAFT listings: title, cat_slug, condition, start_price, brand.
PROD_DRAFT_ITEMS = [
    ("Rolex Daytona 116500LN (White Dial)", "collectibles", ItemConditions.used, 18500.0, "Rolex"),
    ("Sony FX3 Cinema Camera", "electronics", ItemConditions.used, 2900.0, "Sony"),
    ("Herman Miller Eames Lounge Chair", "home-garden", ItemConditions.used, 3100.0, "Herman Miller"),
    ("First Edition 'Anne of Green Gables'", "books-media", ItemConditions.used, 900.0, "L.C. Page"),
    ("Air Jordan 4 'Bred Reimagined' (UK 8)", "fashion", ItemConditions.new, 180.0, "Nike"),
]


async def seed_data_prod():
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

    # Production item images downloaded into "sample images" (prod_auction_*.jpg).
    # Used to give every production listing a real item photo.
    prod_image_pool = sorted(
        f for f in available_images if f.startswith("prod_auction_") and f.endswith(".jpg")
    )
    print(f"  Found {len(prod_image_pool)} production item images.")

    async with AsyncSessionLocal() as db:
        print("=== AuctionHub — Seed Data ===\n")

        # ── 1. Users ───────────────────────────────────────────────────────────
        users_spec = [
            {
                "username": "stewie",
                "email": "stewie@auctionhub.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.premium,
                "balance": 100000.0,
                "full_name": "Aung Khant Minn",
                "city": "Yangon",
                "country": "Myanmar",
            },
            {
                "username": "zixin",
                "email": "zixin@auctionhub.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.premium,
                "balance": 100000.0,
                "full_name": "Mah Zi Xin",
                "city": "Singapore",
                "country": "Singapore",
            },
            {
                "username": "ethan",
                "email": "ethan@auctionhub.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.premium,
                "balance": 100000.0,
                "full_name": "Xu Huitong",
                "city": "Singapore",
                "country": "Singapore",
            },
            {
                "username": "jn",
                "email": "jn@auctionhub.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.premium,
                "balance": 100000.0,
                "full_name": "Tiew Jie Nee",
                "city": "Kuala Lumpur",
                "country": "Malaysia",
            },
            {
                "username": "wesley",
                "email": "wesley@auctionhub.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.premium,
                "balance": 100000.0,
                "full_name": "Wesley Tan",
                "city": "Singapore",
                "country": "Singapore",
            },
            {
                "username": "gavrel",
                "email": "gavrel@auctionhub.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.premium,
                "balance": 100000.0,
                "full_name": "Gavrel saw",
                "city": "Kuala Lumpur",
                "country": "Malaysia",
            },
            {
                "username": "admin_user",
                "email": "admin@example.com",
                "role": UserRole.admin,
                "tier": SubscriptionTier.free,
                "balance": 500.0,
                "full_name": "System Admin",
                "city": None,
                "country": None,
            },
            {
                "username": "normal_user_1",
                "email": "user1@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.premium,
                "balance": 5000.0,
                "full_name": "Alex Chen",
                "city": "Singapore",
                "country": "Singapore",
            },
            {
                "username": "normal_user_2",
                "email": "user2@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.premium,
                "balance": 5000.0,
                "full_name": "Jordan Williams",
                "city": "Sydney",
                "country": "Australia",
            },
            {
                "username": "normal_user_3",
                "email": "user3@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 3000.0,
                "full_name": "Sam Mitchell",
                "city": "Sydney",
                "country": "Australia",
            },
            {
                "username": "normal_user_4",
                "email": "user4@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 3000.0,
                "full_name": "Riley Thompson",
                "city": "Bangkok",
                "country": "Thailand",
            },
            {
                "username": "normal_user_5",
                "email": "user5@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 2500.0,
                "full_name": "Morgan Davis",
                "city": "Kuala Lumpur",
                "country": "Malaysia",
            },
            {
                "username": "normal_user_6",
                "email": "user6@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 2000.0,
                "full_name": "Casey Johnson",
                "city": "Singapore",
                "country": "Singapore",
            },
            {
                "username": "normal_user_7",
                "email": "user7@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 2000.0,
                "full_name": "Drew Anderson",
                "city": "Bangkok",
                "country": "Thailand",
            },
            {
                "username": "normal_user_8",
                "email": "user8@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 2000.0,
                "full_name": "Taylor Brown",
                "city": "Yangon",
                "country": "Myanmar",
            },
            {
                "username": "normal_user_9",
                "email": "user9@example.com",
                "role": UserRole.user,
                "tier": SubscriptionTier.free,
                "balance": 2000.0,
                "full_name": "Blake Wilson",
                "city": "Jakarta",
                "country": "Indonesia",
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
                db.add(UserProfiles(
                    user_id=user.id, full_name=spec["full_name"],
                    city=spec.get("city"), country=spec.get("country"),
                    email_alerts_enabled=spec.get("email_alerts_enabled", True),
                    # Premium users default to marketing opt-in — gives the two new
                    # notification-preference columns some variety in the seed set.
                    marketing_emails_enabled=spec.get(
                        "marketing_emails_enabled", spec["tier"] == SubscriptionTier.premium
                    ),
                ))
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
        #   0  = stewie        (Aung Khant Minn,   premium)
        #   1  = zixin         (Mah Zi Xin,        premium)
        #   2  = ethan         (Xu Huitong,        premium)
        #   3  = jn            (Tiew Jie Nee,      premium)
        #   4  = wesley        (Wesley Tan,        premium)
        #   5  = gavrel        (Gavrel saw,        premium)
        #   6  = normal_user_1 (Alex Chen,         premium)
        #   7  = normal_user_2 (Jordan Williams,   premium)
        #   8  = normal_user_3 (Sam Mitchell,      free)
        #   9  = normal_user_4 (Riley Thompson,    free)
        #   10 = normal_user_5 (Morgan Davis,      free)
        #   11 = normal_user_6 (Casey Johnson,     free)
        #   12 = normal_user_7 (Drew Anderson,     free)
        #   13 = normal_user_8 (Taylor Brown,      free)
        #   14 = normal_user_9 (Blake Wilson,      free)
        #
        # Each new premium user wins 2 items → sufficient for collector board testing.
        #
        ended_specs = [
            # title, cat, condition, start_price, brand, description, seller_idx, winner_idx, final_price, ended_days_ago

            # stewie wins ×2
            (
                "Vintage Omega Seamaster 1960s",
                "collectibles", ItemConditions.used, 450.0, "Omega",
                "Pristine example of the iconic Seamaster. Original dial, hands, and crown intact. Box and papers included.",
                8, 0, 780.0, 3,
            ),
            (
                "Rolex Datejust 36mm (Ref. 126200, 2020)",
                "collectibles", ItemConditions.used, 3800.0, "Rolex",
                "Oystersteel bracelet, Jubilee band. Fluted bezel, white dial. Full set — box, papers, hang tags.",
                1, 0, 4500.0, 8,
            ),

            # zixin wins ×2
            (
                "Sony PlayStation 5 Console (Disc Edition)",
                "electronics", ItemConditions.used, 350.0, "Sony",
                "Barely used PS5 disc edition. Two DualSense controllers, HDMI cable, and power cable included.",
                9, 1, 520.0, 5,
            ),
            (
                "Apple iPad Pro 12.9-inch M2 (256GB, WiFi)",
                "electronics", ItemConditions.used, 550.0, "Apple",
                "Space Grey. 2022 model. AppleCare valid until 2025. Pristine condition — no scratches.",
                2, 1, 650.0, 3,
            ),

            # ethan wins ×2
            (
                "Canon EOS R5 Mirrorless Camera Body",
                "electronics", ItemConditions.used, 1800.0, "Canon",
                "Professional full-frame mirrorless. ~8,000 shutter actuations. Sensor in perfect condition. No marks.",
                10, 2, 2450.0, 4,
            ),
            (
                "Vintage Gibson Les Paul Standard 1978",
                "collectibles", ItemConditions.used, 1800.0, "Gibson",
                "Tobacco burst finish. Original PAF humbuckers. Weighs 4.1kg. Comes with original hard case.",
                3, 2, 2100.0, 4,
            ),

            # jn wins ×2
            (
                "Fender American Vintage '62 Stratocaster",
                "collectibles", ItemConditions.used, 900.0, "Fender",
                "1992 USA reissue. Sunburst finish, original pickups, lightweight alder body. Plays beautifully.",
                11, 3, 1250.0, 2,
            ),
            (
                "DJI Mavic 3 Pro Drone (Fly More Combo)",
                "electronics", ItemConditions.used, 380.0, "DJI",
                "Triple camera Hasselblad system. Under 30 flight hours. Extra batteries, shoulder bag included.",
                4, 3, 480.0, 2,
            ),

            # wesley wins ×2
            (
                "Apple MacBook Pro M3 14-inch (16GB/512GB)",
                "electronics", ItemConditions.used, 1500.0, "Apple",
                "Late 2023 model. Space Grey. AppleCare until 2026. Pristine screen, no dead pixels.",
                12, 4, 1820.0, 6,
            ),
            (
                "Razer Blade 15 (RTX 4070, 2023)",
                "electronics", ItemConditions.used, 950.0, "Razer",
                "Mercury White. 240Hz display. 16GB RAM, 1TB SSD. Original charger and box included.",
                5, 4, 1200.0, 6,
            ),

            # gavrel wins ×2
            (
                "Sony WH-1000XM5 Wireless Headphones",
                "electronics", ItemConditions.new, 250.0, "Sony",
                "Factory sealed box. Midnight Black. Industry-leading ANC. Purchased as spare, never opened.",
                13, 5, 350.0, 3,
            ),
            (
                "Nintendo Switch OLED (White, Boxed)",
                "electronics", ItemConditions.used, 200.0, "Nintendo",
                "Excellent condition. Pro Controller, carrying case, and 4 game cartridges included.",
                14, 5, 280.0, 1,
            ),

            # normal_user_1 (Alex) wins ×2
            (
                "Trek Domane SL 6 Road Bike (56cm)",
                "sporting-goods", ItemConditions.used, 1200.0, "Trek",
                "2022 model. Shimano 105 R7000 groupset. Carbon fork. Under 500 miles. Saddle and pedals included.",
                8, 6, 1750.0, 2,
            ),
            (
                "Harry Potter and the Philosopher's Stone — 1st UK Edition",
                "books-media", ItemConditions.used, 800.0, None,
                "1997 Bloomsbury first print, first edition. Minor shelf wear to cover. All pages clean and tight.",
                9, 6, 1980.0, 7,
            ),

            # normal_user_2 (Jordan) wins ×1
            (
                "Vintage Leica M3 Double Stroke (1954)",
                "collectibles", ItemConditions.used, 700.0, "Leica",
                "Classic rangefinder. Working shutter and meter. Light seals replaced. Comes with Summicron 50mm.",
                0, 7, 950.0, 5,
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

        # Extra production-ended listings (real item photos, mixed into the set).
        print("\nCreating production ended listings...")
        now_dt = datetime.now(timezone.utc)
        for idx, (title, cat_slug, condition, start_price, brand) in enumerate(PROD_ENDED_ITEMS):
            seller = random.choice(normal_users)
            winner = random.choice([u for u in normal_users if u.id != seller.id])
            end_time = now_dt - timedelta(days=random.randint(2, 21))
            start_time = end_time - timedelta(days=random.randint(3, 7))
            final_price = round(start_price * random.uniform(1.25, 1.6), 2)
            min_inc = round(start_price * 0.05, 2)

            listing = Listing(
                seller_id=seller.id,
                category_id=categories[cat_slug].id,
                title=title,
                description=f"{title} in {condition.value} condition. Auction concluded.",
                brand=brand,
                condition=condition,
                condition_confidence=round(random.uniform(72.0, 98.0), 2),
                bidding_type=BiddingType.price_up,
                starting_price=start_price,
                reserve_price=round(start_price * 1.3, 2),
                current_price=final_price,
                min_increment=min_inc,
                status=ListingStatus.ended,
                is_draft=False,
                start_time=start_time,
                end_time=end_time,
            )
            db.add(listing)
            await db.flush()

            img_file = prod_image_pool[idx % len(prod_image_pool)] if prod_image_pool else None
            key = _upload_single_image(minio_client, sample_images_dir, img_file, listing.id)
            if key:
                db.add(ListingImages(listing_id=listing.id, s3_key=key, sort_order=0, is_primary=True))

            losing_bid_time = start_time + timedelta(hours=24)
            losing_price = start_price
            for bidder in random.sample([u for u in normal_users if u.id not in (seller.id, winner.id)], 2):
                losing_price = round(losing_price + min_inc * random.randint(1, 3), 2)
                losing_bid_time += timedelta(hours=random.randint(6, 20))
                db.add(Bid(
                    listing_id=listing.id, bidder_id=bidder.id, amount=losing_price,
                    status=BidStatus.accepted, placed_at=losing_bid_time,
                ))
            winning_bid = Bid(
                listing_id=listing.id, bidder_id=winner.id, amount=final_price,
                status=BidStatus.accepted, placed_at=end_time - timedelta(minutes=random.randint(5, 55)),
            )
            db.add(winning_bid)
            await db.flush()
            auction_result = AuctionResult(
                listing_id=listing.id, winner_id=winner.id, winning_bid_id=winning_bid.id,
                final_price=final_price, ended_at=end_time,
            )
            db.add(auction_result)
            await db.flush()
            ended_results.append((auction_result, listing, winner))

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

        # ── 7b. Production ACTIVE listings (valid until 31 Dec 2026) ───────────
        # Each gets a real item photo from the prod_auction_*.jpg pool.
        print(f"\nCreating {len(PROD_ACTIVE_ITEMS)} production active listings (until {DEC_END.date()})...")
        prod_now = datetime.now(timezone.utc)
        for idx, (title, cat_slug, condition, start_price, brand) in enumerate(PROD_ACTIVE_ITEMS):
            seller = random.choice(normal_users)
            min_inc = round(start_price * 0.05, 2)
            started = prod_now - timedelta(days=random.randint(1, 21))
            ends = prod_now + timedelta(days=random.randint(30, 130))
            if ends > DEC_END:
                ends = DEC_END - timedelta(days=random.randint(0, 10))
            if ends <= prod_now:
                ends = prod_now + timedelta(days=45)

            listing = Listing(
                seller_id=seller.id,
                category_id=categories[cat_slug].id,
                title=title,
                description=(
                    f"{title} in {condition.value} condition. Authentic and well cared for. "
                    "Detailed photos included. Message the seller with questions, then bid to own it."
                ),
                brand=brand,
                condition=condition,
                condition_confidence=round(random.uniform(72.0, 99.0), 2),
                bidding_type=BiddingType.price_up,
                starting_price=start_price,
                reserve_price=round(start_price * 1.3, 2),
                current_price=start_price,
                min_increment=min_inc,
                status=ListingStatus.active,
                is_draft=False,
                start_time=started,
                end_time=ends,
            )
            db.add(listing)
            await db.flush()

            img_file = prod_image_pool[idx % len(prod_image_pool)] if prod_image_pool else None
            key = _upload_single_image(minio_client, sample_images_dir, img_file, listing.id)
            if key:
                db.add(ListingImages(listing_id=listing.id, s3_key=key, sort_order=0, is_primary=True))

            # Light bid chain
            current_price = start_price
            bid_time = started
            bidders = [u for u in normal_users if u.id != seller.id]
            for _ in range(random.randint(1, 7)):
                if not bidders:
                    break
                bidder = random.choice(bidders)
                current_price = round(current_price + min_inc * random.randint(1, 4), 2)
                bid_time += timedelta(hours=random.randint(1, 36))
                if bid_time >= prod_now:
                    break
                db.add(Bid(
                    listing_id=listing.id, bidder_id=bidder.id, amount=current_price,
                    status=BidStatus.accepted, placed_at=bid_time,
                ))
            listing.current_price = current_price
            await db.flush()
            active_listings.append(listing)

        print(f"  Total active listings now: {len(active_listings)} (production-valid until {DEC_END.date()}).")

        # ── 8. Draft listings ──────────────────────────────────────────────────
        #   seller_idx = index in normal_users (one draft per new user)
        draft_specs = [
            ("Omega Constellation Co-Axial Master Chronometer", "collectibles",   ItemConditions.used, 3200.0, "Omega",    0),  # stewie
            ("Fujifilm GFX 100S Medium Format Camera Body",     "electronics",    ItemConditions.used, 2800.0, "Fujifilm", 1),  # zixin
            ("Bose QuietComfort 45 Headphones (Sealed)",        "electronics",    ItemConditions.new,   180.0, "Bose",     2),  # ethan
            ("Leica M6 Film Camera (Mint, 0.72 finder)",        "collectibles",   ItemConditions.used, 1400.0, "Leica",    3),  # jn
            ("Trek Émonda SLR 9 Road Bike (52cm)",              "sporting-goods", ItemConditions.used, 2200.0, "Trek",     4),  # wesley
            ("Vintage Gibson ES-335 Semi-Hollow (Sunburst)",    "collectibles",   ItemConditions.used, 1600.0, "Gibson",   5),  # gavrel
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

        # Production draft listings (real item photos, mixed into the set).
        for idx, (title, cat_slug, condition, start_price, brand) in enumerate(PROD_DRAFT_ITEMS):
            lst = Listing(
                seller_id=random.choice(normal_users).id,
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
            )
            db.add(lst)
            await db.flush()
            img_file = prod_image_pool[(len(PROD_ENDED_ITEMS) + idx) % len(prod_image_pool)] if prod_image_pool else None
            key = _upload_single_image(minio_client, sample_images_dir, img_file, lst.id)
            if key:
                db.add(ListingImages(listing_id=lst.id, s3_key=key, sort_order=0, is_primary=True))
        await db.flush()
        print(f"Draft listings: {len(draft_specs) + len(PROD_DRAFT_ITEMS)} total.")

        # ── 9. Watchlist ───────────────────────────────────────────────────────
        watchlist_counts = [
            (normal_users[0],  5),   # stewie
            (normal_users[1],  5),   # zixin
            (normal_users[2],  4),   # ethan
            (normal_users[3],  4),   # jn
            (normal_users[4],  3),   # wesley
            (normal_users[5],  3),   # gavrel
            (normal_users[6],  5),   # normal_user_1 / Alex
            (normal_users[7],  3),   # normal_user_2 / Jordan
            (normal_users[8],  2),   # normal_user_3 / Sam
        ]
        for user, count in watchlist_counts:
            sample = random.sample(active_listings, min(count, len(active_listings)))
            for listing in sample:
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
        # One public board per new premium user, populated with their 2 wins.
        # Alex (normal_user_1) gets two boards; Jordan (normal_user_2) gets one.
        board_specs = [
            # (owner_idx, name, description, is_public)
            (0, "Timepiece Collection",    "Rare watches and horological pieces I've won at auction.", True),
            (1, "Gaming & Tech",           "Latest gaming consoles and gadgets from the auction floor.", True),
            (2, "Camera & Music Gear",     "Professional cameras and vintage instruments.", True),
            (3, "Guitars & Drones",        "Six-strings and flying machines — my two passions.", True),
            (4, "Mobile Workstations",     "High-performance laptops I've snagged at great prices.", True),
            (5, "Audio & Gaming Setup",    "Headphones, consoles, and everything in between.", False),
            (6, "Premium Picks",           "My finest auction wins — bikes, rare books, and classics.", True),
            (6, "Hidden Gems",             "Underrated finds I keep off the radar.", False),
            (7, "Vintage Cameras",         "Rangefinders and classic film cameras.", True),
        ]
        boards = []
        for owner_idx, name, description, is_public in board_specs:
            b = CollectorBoard(
                user_id=normal_users[owner_idx].id,
                name=name,
                description=description,
                is_public=is_public,
            )
            db.add(b)
            boards.append((owner_idx, b))
        await db.flush()

        # Map each user's wins to their first board (index ordering matches board_specs order)
        wins_by_user = {}
        for auction_result, listing, winner in ended_results:
            wins_by_user.setdefault(winner.id, []).append(auction_result)

        # For each board, add items from that owner's wins (round-robin across multiple boards)
        board_item_counts = {}  # board.id → item count for sort_order
        for owner_idx, board in boards:
            owner_id = normal_users[owner_idx].id
            owner_wins = wins_by_user.get(owner_id, [])
            # Distribute wins across boards belonging to same owner
            same_owner_boards = [b for oi, b in boards if oi == owner_idx]
            board_position = same_owner_boards.index(board)
            # Assign wins to this board: round-robin by board position
            assigned = [w for i, w in enumerate(owner_wins) if i % len(same_owner_boards) == board_position]
            for sort_idx, auction_result in enumerate(assigned):
                db.add(BoardItem(
                    board_id=board.id,
                    auction_result_id=auction_result.id,
                    sort_order=sort_idx,
                ))
                board_item_counts[board.id] = sort_idx + 1

        await db.flush()
        total_boards = len(boards)
        print(f"Collector boards: {total_boards} boards created with items.")

        # ── 13. Testimonials ───────────────────────────────────────────────────
        testimonial_data = [
            (
                normal_users[0],  # stewie
                "AuctionHub completely changed how I find rare collectibles. Won my dream Omega watch "
                "in minutes — the bidding is fair, fast, and totally transparent.",
                5, True,
            ),
            (
                normal_users[1],  # zixin
                "The platform is incredibly smooth. Snagged a sealed PS5 and an iPad Pro within the "
                "same week. The real-time bidding experience is unmatched.",
                5, True,
            ),
            (
                normal_users[2],  # ethan
                "As a photographer, finding a Canon R5 at this price was a dream. The AI condition "
                "scoring gave me the confidence to bid without hesitation.",
                5, True,
            ),
            (
                normal_users[3],  # jn
                "The Collector Board feature is brilliant — I love being able to showcase my Fender "
                "Strat and DJI drone together in one public board.",
                4, True,
            ),
            (
                normal_users[4],  # wesley
                "Sold three items in a week with zero hassle. The escrow system means I always get "
                "paid. Highly recommend for any serious seller.",
                5, True,
            ),
            (
                normal_users[5],  # gavrel
                "Premium membership pays for itself instantly. No bidding limits, priority support, "
                "and the collector boards make the whole experience feel premium.",
                4, True,
            ),
        ]
        for user, content, rating, featured in testimonial_data:
            db.add(Testimonial(user_id=user.id, content=content, rating=rating, is_featured=featured))
        await db.flush()
        print(f"Testimonials: {len(testimonial_data)} created.")

# ── 14. Marketing video (landing page hero) ────────────────────────────
        existing_video = await db.scalar(select(MarketingVideo).limit(1))
        if not existing_video:
            mk_admin = next((u for u in all_users if u.role == UserRole.admin), None)
            sample_videos_dir = os.path.join(parent_dir, "sample images")
            video_keys = []
            if minio_client and os.path.exists(sample_videos_dir):
                video_files = [
                    f for f in os.listdir(sample_videos_dir)
                    if f.lower().endswith((".mp4", ".webm", ".mov")) and os.path.isfile(os.path.join(sample_videos_dir, f))
                ]
                for vf in video_files[:1]:
                    vp = os.path.join(sample_videos_dir, vf)
                    ext = os.path.splitext(vf)[1]
                    s3_key = f"seed/marketing/{uuid.uuid4()}{ext}"
                    ct, _ = mimetypes.guess_type(vp)
                    try:
                        minio_client.fput_object(settings.S3_BUCKET_VIDEOS, s3_key, vp, content_type=ct or "video/mp4")
                        video_keys.append(s3_key)
                    except Exception as e:
                        print(f"  Warning: marketing video upload failed: {e}")
            if video_keys:
                db.add(MarketingVideo(
                    s3_key=video_keys[0], original_filename="seed_hero_video.mp4",
                    content_type="video/mp4", is_active=True,
                    uploaded_by=mk_admin.id if mk_admin else None,
                ))
                print("Marketing video: seeded with uploaded file.")
            else:
                print("  No sample video found — skipping marketing video seed. Upload one via admin UI.")
        else:
            print("Marketing video: already exists, skipped.")

        # ── 15. Issue types ────────────────────────────────────────────────────────────
        issue_type_names = [
            "Item Not Received",
            "Item Not as Described",
            "Counterfeit / Fake Item",
            "Seller Unresponsive",
            "Billing / Payment Issue",
            "Fraudulent Listing",
            "Technical Problem",
            "Other",
        ]
        existing_issue_types = (await db.execute(select(IssueType.name))).scalars().all()
        existing_names = set(existing_issue_types)
        new_issue_types = [
            IssueType(name=name)
            for name in issue_type_names
            if name not in existing_names
        ]
        if new_issue_types:
            db.add_all(new_issue_types)
            await db.flush()
        # Build a name→id map for dispute seeding below
        all_issue_types_rows = (await db.execute(select(IssueType))).scalars().all()
        issue_type_map = {it.name: it for it in all_issue_types_rows}
        print(f"Issue types: {len(new_issue_types)} created, {len(issue_type_names) - len(new_issue_types)} already existed.")

        # ── 16. Disputes ──────────────────────────────────────────────────────
        # Mix of statuses to test the full admin dispute workflow.
        dispute_specs = [
            # (reporter_idx, listing (None or active), issue_type_name, subject, category, description, status, resolution_note)
            (
                0, None,
                "Technical Problem",
                "Bid confirmation not received",
                "Technical",
                "I placed a bid of $820 on the Rolex listing but never received a confirmation message "
                "in the bid panel. The amount was deducted from my wallet. Please investigate.",
                DisputeStatus.open, None,
            ),
            (
                1, None,
                "Billing / Payment Issue",
                "Wallet top-up not reflected",
                "Billing",
                "I topped up $500 via the wallet page two days ago but my balance has not updated. "
                "Transaction ID attached. Please check on this urgently.",
                DisputeStatus.in_review, None,
            ),
            (
                2, None,
                "Item Not as Described",
                "Canon R5 shutter count higher than listed",
                "Item Quality",
                "The Canon R5 I won was listed as ~8,000 actuations but my in-camera count shows 22,450. "
                "This is a significant misrepresentation. I would like a partial refund.",
                DisputeStatus.in_review,
                "We have contacted the seller and are awaiting their response. Hold tight.",
            ),
            (
                3, None,
                "Seller Unresponsive",
                "No contact from seller after winning",
                "Fulfilment",
                "I won the Fender Stratocaster auction 4 days ago. The seller has not responded to any "
                "messages and the item has not been marked as shipped. Please assist.",
                DisputeStatus.resolved,
                "Seller has been reminded and confirmed dispatch. Tracking number sent to buyer.",
            ),
            (
                4, None,
                "Other",
                "General feedback on auction extension",
                "Feedback",
                "I think the 60-second anti-sniping extension is too aggressive — it extended my auction "
                "by 12 minutes due to last-second bids. Consider making it configurable.",
                DisputeStatus.closed, None,
            ),
            (
                5, None,
                "Fraudulent Listing",
                "Suspected counterfeit Rolex listing",
                "Fraud",
                "The Rolex Datejust listing (currently active) shows a reference number inconsistent "
                "with the year of manufacture. I believe this may be a replica sold as genuine.",
                DisputeStatus.open, None,
            ),
        ]

        for (
            reporter_idx, _listing, issue_type_name, subject, category, description, status, resolution_note
        ) in dispute_specs:
            it = issue_type_map.get(issue_type_name)
            db.add(Dispute(
                reporter_id=normal_users[reporter_idx].id,
                issue_type_id=it.id if it else None,
                subject=subject,
                category=category,
                description=description,
                status=status,
                resolution_note=resolution_note,
            ))
        await db.flush()
        print(f"Disputes: {len(dispute_specs)} created (open/in_review/resolved/closed mix).")

        # ── 17. Content moderation ─────────────────────────────────────────────
        admin = next((u for u in all_users if u.role == UserRole.admin), None)

        # Admin-managed prohibited keywords. category ∈ {illegal_item, profanity}.
        keyword_defs = [
            ("cocaine", "illegal_item"), ("firearm", "illegal_item"), ("counterfeit", "illegal_item"),
            ("ivory", "illegal_item"), ("stolen goods", "illegal_item"),
            ("damn", "profanity"), ("bastard", "profanity"),
        ]
        existing_kw = set((await db.execute(select(ProhibitedKeyword.keyword))).scalars().all())
        new_kw = [
            ProhibitedKeyword(keyword=k, category=c, added_by=admin.id if admin else None)
            for k, c in keyword_defs if k not in existing_kw
        ]
        if new_kw:
            db.add_all(new_kw)
            await db.flush()

        # Blocked listing attempts that matched a keyword (powers the admin flagged view).
        # Append-only log — only seed if empty so re-runs don't pile up duplicates.
        attempt_count = 0
        if not await db.scalar(select(func.count()).select_from(FlaggedListingAttempt)):
            attempt_defs = [
                (normal_users[0], "firearm", "title", "Rare antique firearm replica for collectors"),
                (normal_users[2], "counterfeit", "description", "Not a counterfeit — 100% genuine leather"),
                (normal_users[4], "stolen goods", "description", "Definitely not stolen goods, clean serial"),
            ]
            for u, kw, field, text in attempt_defs:
                db.add(FlaggedListingAttempt(user_id=u.id, keyword_matched=kw, field=field, attempted_text=text))
            attempt_count = len(attempt_defs)
            await db.flush()

        print(f"Content moderation: {len(new_kw)} keywords, {attempt_count} flagged attempts.")

        # ── 18. Option sets (admin dropdown catalogue) ─────────────────────────
        # One lookup table keyed by set_key backing every admin dropdown. Mirrors
        # scripts/migrations/2026_07_20_option_sets.sql. Idempotent on (set_key, value).
        option_defs = [
            ("user_status", "active", "Active", 1),
            ("user_status", "suspended", "Suspended", 2),
            ("user_status", "deleted", "Deleted", 3),
            ("user_role", "user", "Users", 1),
            ("user_role", "admin", "Administrators", 2),
            ("listing_status", "pending_review", "Needs review", 1),
            ("listing_status", "active", "Live now", 2),
            ("listing_status", "ended", "Ended", 3),
            ("listing_status", "removed", "Removed", 4),
            ("dispute_status", "open", "Open", 1),
            ("dispute_status", "in_review", "In Review", 2),
            ("dispute_status", "resolved", "Resolved", 3),
            ("dispute_status", "closed", "Closed", 4),
            ("audit_action", "suspend_user", "Suspend user", 1),
            ("audit_action", "unsuspend_user", "Unsuspend user", 2),
            ("audit_action", "delete_user", "Delete user", 3),
            ("audit_action", "approve_listing", "Approve listing", 4),
            ("audit_action", "remove_listing", "Remove listing", 5),
            ("audit_action", "restart_auction", "Restart auction", 6),
            ("audit_action", "cancel_bid", "Cancel bid", 7),
            ("audit_action", "add_prohibited_keyword", "Add prohibited keyword", 8),
            ("audit_action", "remove_prohibited_keyword", "Remove prohibited keyword", 9),
            ("log_service", "backend", "Backend", 1),
            ("log_service", "bidding-engine", "Bidding engine", 2),
            ("log_service", "recommendation-engine", "Recommendation engine", 3),
            ("log_level", "info", "Info", 1),
            ("log_level", "warning", "Warning", 2),
            ("log_level", "error", "Error", 3),
            ("keyword_category", "illegal_item", "Illegal item", 1),
            ("keyword_category", "profanity", "Profanity", 2),
            ("feedback_role", "buyer", "Buyer", 1),
            ("feedback_role", "seller", "Seller", 2),
            ("item_condition", "new", "New", 1),
            ("item_condition", "used", "Used", 2),
            ("item_condition", "refurbished", "Refurbished", 3),
        ]
        existing_opts = set(
            (await db.execute(select(OptionSet.set_key, OptionSet.value))).all()
        )
        new_opts = [
            OptionSet(set_key=k, value=v, label=label, sort_order=order)
            for k, v, label, order in option_defs if (k, v) not in existing_opts
        ]
        if new_opts:
            db.add_all(new_opts)
            await db.flush()
        print(f"Option sets: {len(new_opts)} created ({len({k for k, *_ in option_defs})} sets).")

        # ── 19. Feedback types + item feedback ─────────────────────────────────
        feedback_type_defs = [
            ("Buyer to Seller", "buyer"),
            ("Buyer to Listing", "buyer"),
            ("Seller to Buyer", "seller"),
        ]
        existing_ft = set((await db.execute(select(FeedbackType.name))).scalars().all())
        for name, role in feedback_type_defs:
            if name not in existing_ft:
                db.add(FeedbackType(name=name, reviewer_role=role))
        await db.flush()
        ft_map = {ft.name: ft for ft in (await db.execute(select(FeedbackType))).scalars().all()}

        # One review per type per ended auction: winner⇄seller. Winners bid on the
        # listing, so this satisfies the app's eligibility rules. Append-only (UNIQUE
        # on listing/reviewer/type) — seed only when empty so re-runs don't error.
        fb_count = 0
        if ended_results and not await db.scalar(select(func.count()).select_from(ItemFeedback)):
            bts = ["Exactly as described, fast secure shipping. A pleasure to deal with.",
                   "Great seller — responsive and professional. Item arrived well packed.",
                   "Smooth transaction, honest condition notes. Would buy from again.",
                   "Prompt dispatch and great communication throughout. Highly recommended."]
            btl = ["Photos and description matched perfectly on arrival. No surprises.",
                   "Accurate, detailed listing — every flaw and spec documented honestly.",
                   "Listing was spot on. Condition exactly as represented.",
                   "Clear photos and honest write-up. Fair and transparent listing."]
            stb = ["Instant payment and polite communication. A model buyer.",
                   "Smooth, professional deal. Confirmed receipt quickly. Five stars.",
                   "Paid within minutes of close and stayed in touch. Perfect buyer.",
                   "Great buyer — prompt, courteous, zero issues. Sell to again anytime."]
            for i, (_result, lst, winner) in enumerate(ended_results):
                seller_id = lst.seller_id
                db.add(ItemFeedback(listing_id=lst.id, reviewer_id=winner.id, reviewee_id=seller_id,
                                    feedback_type_id=ft_map["Buyer to Seller"].id,
                                    is_public=True,
                                    rating=5 if i % 3 else 4, comment=bts[i % len(bts)]))
                db.add(ItemFeedback(listing_id=lst.id, reviewer_id=winner.id, reviewee_id=seller_id,
                                    feedback_type_id=ft_map["Buyer to Listing"].id,
                                    is_public=True,
                                    rating=5 if i % 4 else 4, comment=btl[i % len(btl)]))
                db.add(ItemFeedback(listing_id=lst.id, reviewer_id=seller_id, reviewee_id=winner.id,
                                    feedback_type_id=ft_map["Seller to Buyer"].id,
                                    is_public=True,
                                    rating=5 if i % 3 else 4, comment=stb[i % len(stb)]))
                fb_count += 3
            await db.flush()
        print(f"Feedback: {len(feedback_type_defs)} types, {fb_count} item-feedback rows.")

        # ── 20. Landing page content (CMS / Puck editor) ───────────────────────
        existing_landing = await db.scalar(select(SiteContent).where(SiteContent.slug == "landing"))
        if not existing_landing:
            landing_content = {
                "root": {"props": {}},
                "content": [
                    {
                        "type": "Hero",
                        "props": {
                            "heading": "The Premium Marketplace for Serious Collectors",
                            "subheading": "Discover, bid, and win exclusive items in a high-trust, high-velocity environment. Join a community where authenticity and speed matter.",
                            "primaryCtaLabel": "Start Bidding",
                            "primaryCtaLink": "/register",
                            "secondaryCtaLabel": "View Auctions",
                            "secondaryCtaLink": "/browse",
                        },
                    },
                    {"type": "Categories", "props": {}},
                    {"type": "TrendingAuctions", "props": {}},
                    {
                        "type": "FeatureGrid",
                        "props": {
                            "heading": "The AuctionHub Advantage",
                            "subheading": "Built for high-stakes trading with enterprise-grade technology.",
                            "features": [
                                {
                                    "icon": "zap",
                                    "title": "Real-Time Sync",
                                    "text": "Low-latency WebSocket infrastructure ensures every bid is recorded instantly. No lag, no missed opportunities.",
                                },
                                {
                                    "icon": "shield",
                                    "title": "Verified Listings",
                                    "text": "Multi-step verification process guarantees item authenticity and seller credibility for every listing.",
                                },
                                {
                                    "icon": "trendingUp",
                                    "title": "AI Pricing Confidence",
                                    "text": "Advanced machine learning models analyse historical data to provide real-time valuation insights.",
                                },
                            ],
                        },
                    },
                    {"type": "TestimonialWall", "props": {}},
                    {
                        "type": "PricingBlock",
                        "props": {
                            "heading": "Transparent Pricing",
                            "subheading": "Scale your collecting hobby or business with ease",
                            "freeName": "Free",
                            "freeDescription": "For casual buyers and sellers starting out.",
                            "freePrice": "$0",
                            "freeBullets": [
                                {"text": "Full marketplace browsing access"},
                                {"text": "Up to 10 active bids per hour"},
                                {"text": "Standard seller verification"},
                            ],
                            "premiumName": "Premium",
                            "premiumDescription": "For professional traders and collectors.",
                            "premiumPrice": "$49",
                            "premiumBullets": [
                                {"text": "No bidding or listing limits"},
                                {"text": "Advanced Collector Dashboard"},
                                {"text": "Priority Verification & Badging"},
                                {"text": "24/7 VIP Concierge Support"},
                            ],
                        },
                    },
                    {
                        "type": "ContactBlock",
                        "props": {
                            "heading": "Get in Touch",
                            "subtext": "Have a question, dispute, or partnership enquiry? Our team is here to help.",
                            "email": "support@auctionhub.com",
                        },
                    },
                    {
                        "type": "Banner",
                        "props": {
                            "heading": "Ready to start bidding?",
                            "body": "Join thousands of local buyers and sellers. Registration is free and PDPA-compliant.",
                            "ctaLabel": "Register Now",
                            "ctaLink": "/register",
                            "hideWhenLoggedIn": True,
                        },
                    },
                ],
                "zones": {},
            }
            cms_admin = next((u for u in all_users if u.role == UserRole.admin), None)
            db.add(SiteContent(
                slug="landing",
                content=landing_content,
                updated_by=cms_admin.id if cms_admin else None,
            ))
            print("Landing page content: seeded with full 8-section layout.")
        else:
            print("Landing page content: already exists, skipped.")

        await db.commit()
        print(f"""
=== Seeding complete! ===
  Ended listings : {len(ended_specs)}  (with bids + auction_results)
  Active listings: {len(active_listings)}  (with bids + interactions)
  Draft listings : {len(draft_specs)}  (one per new user)
  Auction results: {len(ended_specs)}
  Collector boards: {total_boards}
  Testimonials   : 6  (all featured)
  Issue types    : {len(issue_type_names)}
  Disputes       : {len(dispute_specs)}  (open / in_review / resolved / closed)
  Prohibited kw  : {len(new_kw)}  (illegal_item + profanity)
  Moderation     : {attempt_count} flagged attempts
  Option sets    : {len(new_opts)} options
  Feedback       : {len(feedback_type_defs)} types, {fb_count} item-feedback rows
  Landing page   : \"landing\" slug — 8 Puck blocks (Hero, Categories, Trending, Features, Testimonials, Pricing, Contact, Banner)

  Credentials (all users): password123
  New premium accounts : stewie, zixin, ethan, jn, wesley, gavrel
  Legacy test accounts : normal_user_1 (Alex), normal_user_2 (Jordan)
""")


if __name__ == "__main__":
    asyncio.run(seed_data_prod())
