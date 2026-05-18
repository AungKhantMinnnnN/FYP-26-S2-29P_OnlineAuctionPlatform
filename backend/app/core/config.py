from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Online Auction Platform - API Gateway"
    API_VERSION: str = "v1.0.0"
    DATABASE_URL: str = "postgresql://user:password@db:5432/auction_db"
    REDIS_URL: str = "redis://redis:6379/0"
    JWT_SECRET: str = "c32a0d43f2ea872d7a671f444c89eb5f73f45be7e3553385c1d02a04e81b3e52066393e2b8d71d542b84a51db532c5f27f71512b48e06a34cfc76cba22304ce3"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15

    LOG_DIR: str = "logs/backend_logs"

    BIDDING_SERVICE_URL: str = "http://bidding-engine:8001"
    RECOMMENDATION_SERVICE_URL: str = "http://recommendation-engine:8002"

    class Config:
        env_file = ".env"

settings = Settings()
