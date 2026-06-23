# PostgreSQL

POSTGRES_DB=FYP_AuctionPlatform_PostgreSQL_DB

POSTGRES_USER=AuctionPlatform_Developer

POSTGRES_PASSWORD=FYP-26-S2-29P_PostgreSQL
 
# Redis

REDIS_PASSWORD=FYP-26-S2-29P_Redis
 
# MinIO

MINIO_ROOT_USER=MinIO_AuctionPlatform_Developer

MINIO_ROOT_PASSWORD=FYP-26-S2-29P_MinIO
 
# App — used by FastAPI running locally and by dockerised services
 
# Local Docker environment (Development)

DATABASE_URL=postgresql+asyncpg://AuctionPlatform_Developer:FYP-26-S2-29P_PostgreSQL@localhost:5432/FYP_AuctionPlatform_PostgreSQL_DB

REDIS_URL=redis://:FYP-26-S2-29P_Redis@localhost:6379/0
 
# S3 / MinIO

S3_ENDPOINT=http://localhost:9000 

S3_ACCESS_KEY=MinIO_AuctionPlatform_Developer 

S3_SECRET_KEY=FYP-26-S2-29P_MinIO 

S3_BUCKET_ASSETS=auction-assets

S3_BUCKET_AVATARS=auction-avatars

S3_PUBLIC_URL=http://localhost/auction-assets
 
 
# App

APP_ENV=development

JWT_SECRET=c32a0d43f2ea872d7a671f444c89eb5f73f45be7e3553385c1d02a04e81b3e52066393e2b8d71d542b84a51db532c5f27f71512b48e06a34cfc76cba22304ce3

PROJECT_NAME="AuctionHub_APIGateway"

API_VERSION="v1.0.0"

ALGORITHM=HS256

ACCESS_TOKEN_EXPIRE_MINUTES=15

LOG_DIR=logs/backend_logs

BIDDING_SERVICE_URL=http://bidding-engine:8001

RECOMMENDATION_SERVICE_URL=http://recommendation-engine:8002
 
# Frontend

# Frontend

VITE_API_URL=http://localhost:8000/api/v1

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
 