"""
Seed additional ACTIVE auction listings.

Companion to scripts/seed_data.py. Assumes the base seed has already run so that
users and categories exist. It adds 50+ brand-new *active* listings whose auctions
stay open until 30 November 2026, each assigned to a random existing user as the
owner/seller.

It deliberately re-uses only the images that are already present in the
"sample images" folder (uploaded to MinIO with fresh keys), so no new downloads
are needed for this file.

Run from repo root:
    python scripts/seed_extra_active_listings.py
"""
import asyncio
import mimetypes
import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone

script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
backend_dir = os.path.join(parent_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.auction import (
    Bid,
    BiddingType,
    BidStatus,
    Categories,
    ItemConditions,
    Listing,
    ListingImages,
    ListingStatus,
    User,
    UserRole,
)
from minio import Minio
from sqlalchemy import select

# Auctions must be valid until November: any end before midnight 30 Nov 2026.
NOV_END = datetime(2026, 11, 30, 23, 59, 59, tzinfo=timezone.utc)


def _upload_images(minio_client, sample_images_dir, available_images, listing_id, count=2):
    """Upload `count` random sample images, returning the resulting s3 keys."""
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


# title, cat_slug, condition, start_price, brand
ACTIVE_ITEMS = [
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
    ("Fender Player Stratocaster (Sunburst)", "collectibles", ItemConditions.used, 520.0, "Fender"),
    ("Yamaha FG800 Acoustic Guitar (Natural)", "collectibles", ItemConditions.new, 180.0, "Yamaha"),
    ("Gibson SG Standard '61 (Cherry)", "collectibles", ItemConditions.used, 1180.0, "Gibson"),
    ("Scarlett Johansson Movie Poster Collection", "books-media", ItemConditions.used, 60.0, None),
]


async def seed_extra_active_listings():
    # ── MinIO ──────────────────────────────────────────────────────────────
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

    # Images already available in the folder — reuse these only (no new downloads).
    sample_images_dir = os.path.join(parent_dir, "sample images")
    available_images = [
        f for f in os.listdir(sample_images_dir)
        if os.path.isfile(os.path.join(sample_images_dir, f))
        and not f.startswith(".")
        and f.lower().endswith((".jpg", ".jpeg", ".png", ".avif", ".webp"))
    ]

    async with AsyncSessionLocal() as db:
        # ── Owners: random seeded users ─────────────────────────────────────
        users_result = await db.execute(select(User).where(User.role == UserRole.user))
        users = users_result.scalars().all()
        if not users:
            raise SystemExit("No seeded user accounts found. Run scripts/seed_data.py first.")
        print(f"Approx. {len(users)} seeded users available as owners.\n")

        # ── Categories map ──────────────────────────────────────────────────
        categories = {}
        for cat in (await db.execute(select(Categories))).scalars().all():
            categories[cat.slug] = cat

        now = datetime.now(timezone.utc)
        created = 0
        print(f"Creating {len(ACTIVE_ITEMS)} active listings (valid until {NOV_END.date()})...")
        for idx, (title, cat_slug, condition, start_price, brand) in enumerate(ACTIVE_ITEMS):
            category = categories.get(cat_slug)
            if category is None:
                print(f"  ! Unknown category '{cat_slug}' — skipping '{title}'")
                continue

            seller = random.choice(users)
            min_inc = round(start_price * 0.05, 2)
            started = now - timedelta(days=random.randint(1, 10))
            # End inside November 2026 so every auction stays valid through the month.
            ends = datetime(2026, 11, 1, tzinfo=timezone.utc) + timedelta(days=random.randint(0, 29))
            ends = min(ends, NOV_END)

            listing = Listing(
                seller_id=seller.id,
                category_id=category.id,
                title=title,
                description=(
                    f"{title} in {condition.value} condition. Authentic, well cared for, "
                    "and ready to ship. Review the photos and message the seller with any "
                    "questions before bidding."
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

            s3_keys = _upload_images(minio_client, sample_images_dir, available_images, listing.id)
            for img_idx, key in enumerate(s3_keys):
                db.add(ListingImages(listing_id=listing.id, s3_key=key, sort_order=img_idx,
                                     is_primary=(img_idx == 0)))

            # Light bid chain for realism
            current_price = start_price
            bid_time = started
            bidders = [u for u in users if u.id != seller.id]
            for _ in range(random.randint(0, 5)):
                if not bidders:
                    break
                bidder = random.choice(bidders)
                current_price = round(current_price + min_inc * random.randint(1, 4), 2)
                bid_time += timedelta(hours=random.randint(1, 14))
                if bid_time >= now:
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
            created += 1

        await db.commit()
        print(f"\nDone: {created} new active listings created (all valid until {NOV_END.date()}).")


if __name__ == "__main__":
    asyncio.run(seed_extra_active_listings())
