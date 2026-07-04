import asyncio
import random
import sys
import os
import mimetypes
import uuid
from datetime import datetime, timedelta, timezone

os.environ["ENV_FILE"] = ".env.prod"

script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
backend_dir = os.path.join(parent_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.auction import User, UserProfiles, Listing, ListingImages, ListingStatus, ItemConditions, BiddingType, UserRole, Bid
from app.core.security import get_password_hash
from app.core.config import settings
from minio import Minio

async def seed_prod_data():
    print("="*50)
    print("🚀 SEEDING PRODUCTION ENVIRONMENT (Neon & Cloudflare R2)")
    print(f"PostgreSQL URL configured: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else 'Hidden'}")
    print(f"S3/R2 Endpoint configured: {settings.S3_ENDPOINT}")
    print("="*50)

    # Initialize MinIO client pointing to Cloudflare R2
    r2_client = None
    try:
        endpoint = settings.S3_ENDPOINT.replace("http://", "").replace("https://", "")
        r2_client = Minio(
            endpoint,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            secure=settings.S3_ENDPOINT.startswith("https://")
        )
        # Ensure bucket exists
        if not r2_client.bucket_exists(settings.S3_BUCKET_ASSETS):
            r2_client.make_bucket(settings.S3_BUCKET_ASSETS)
    except Exception as e:
        print(f"Warning: Could not initialize Cloudflare R2 client. Images will not be uploaded. Error: {e}")

    # Gather sample images
    sample_images_dir = os.path.join(parent_dir, "sample images")
    available_images = []
    if os.path.exists(sample_images_dir):
        available_images = [f for f in os.listdir(sample_images_dir) if os.path.isfile(os.path.join(sample_images_dir, f)) and not f.startswith('.')]
    
    async with AsyncSessionLocal() as db:
        print("Starting data seeding...")
        
        # 1. Create Users
        users = []
        
        # Check if admin already exists
        admin_result = await db.execute(select(User).where(User.username == "admin_user"))
        admin = admin_result.scalars().first()
        
        if not admin:
            admin = User(
                username="admin_user",
                email="admin@example.com",
                password_hash=get_password_hash("password123"),
                role=UserRole.admin
            )
            db.add(admin)
            await db.flush()
            print("Created 1 Admin user.")
            
            # Profile for admin
            db.add(UserProfiles(user_id=admin.id, full_name="System Admin"))
        else:
            print("Admin user already exists.")
            
        users.append(admin)
        
        # Normal Users
        normal_users = []
        for i in range(1, 10):
            username = f"normal_user_{i}"
            user_result = await db.execute(select(User).where(User.username == username))
            user = user_result.scalars().first()
            
            if not user:
                user = User(
                    username=username,
                    email=f"user{i}@example.com",
                    password_hash=get_password_hash("password123"),
                    role=UserRole.user,
                    balance=1000.0  # give some initial balance
                )
                db.add(user)
                await db.flush()
                
                db.add(UserProfiles(user_id=user.id, full_name=f"Normal User {i}"))
                normal_users.append(user)
            else:
                normal_users.append(user)
                
        if normal_users:
            print(f"Ensured {len(normal_users)} Normal users exist.")
            users.extend(normal_users)
        
        # 2. Create Auction Listings
        print("Creating 20 auction listings...")
        items = [
            ("Vintage Watch", ItemConditions.used, 50.0),
            ("Gaming Laptop", ItemConditions.refurbished, 400.0),
            ("Smartphone latest gen", ItemConditions.new, 600.0),
            ("Antique Chair", ItemConditions.used, 100.0),
            ("Digital Camera", ItemConditions.refurbished, 250.0),
            ("Mechanical Keyboard", ItemConditions.new, 80.0),
            ("Wireless Headphones", ItemConditions.new, 120.0),
            ("Bicycle", ItemConditions.used, 150.0),
            ("Coffee Maker", ItemConditions.new, 45.0),
            ("Acoustic Guitar", ItemConditions.used, 200.0)
        ]
        
        added_count = 0
        for i in range(20):
            seller = random.choice(normal_users)
            item_name, condition, start_price = random.choice(items)
            
            title = f"{item_name} - Batch {i}"
            
            listing = Listing(
                seller_id=seller.id,
                title=title,
                description=f"This is a great {item_name} in {condition.value} condition.",
                condition=condition,
                bidding_type=BiddingType.price_up,
                starting_price=start_price,
                reserve_price=start_price * 1.5,
                current_price=start_price,
                min_increment=start_price * 0.05,
                status=ListingStatus.active,
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc) + timedelta(days=random.randint(1, 14))
            )
            db.add(listing)
            await db.flush()
            
            # Add images if available
            if available_images and r2_client:
                num_images = random.randint(1, min(3, len(available_images)))
                chosen_images = random.sample(available_images, num_images)
                
                for idx, img_file in enumerate(chosen_images):
                    img_path = os.path.join(sample_images_dir, img_file)
                    ext = os.path.splitext(img_file)[1]
                    s3_key = f"seed/{uuid.uuid4()}{ext}"
                    
                    content_type, _ = mimetypes.guess_type(img_path)
                    if not content_type:
                        content_type = "application/octet-stream"
                        
                    try:
                        r2_client.fput_object(
                            settings.S3_BUCKET_ASSETS,
                            s3_key,
                            img_path,
                            content_type=content_type
                        )
                        
                        db.add(ListingImages(
                            listing_id=listing.id,
                            s3_key=s3_key,
                            sort_order=idx,
                            is_primary=(idx == 0)
                        ))
                    except Exception as e:
                        print(f"Failed to upload {img_file} to R2: {e}")
            
            added_count += 1
            
            # Create random bids
            num_bids = random.randint(0, 5)
            if num_bids > 0:
                current_price = start_price
                bid_time = listing.start_time
                for _ in range(num_bids):
                    potential_bidders = [u for u in normal_users if u.id != seller.id]
                    if not potential_bidders:
                        break
                    bidder = random.choice(potential_bidders)
                    bid_amount = current_price + (listing.min_increment * random.randint(1, 3))
                    bid_time = bid_time + timedelta(hours=random.randint(1, 10))
                    if bid_time > listing.end_time:
                        break
                    
                    bid = Bid(
                        listing_id=listing.id,
                        bidder_id=bidder.id,
                        amount=bid_amount,
                        placed_at=bid_time
                    )
                    db.add(bid)
                    current_price = bid_amount
                
                listing.current_price = current_price
                db.add(listing)
            
        await db.commit()
        print(f"Successfully inserted {added_count} auction listings into Neon PostgreSQL.")
        print("Production Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_prod_data())
