from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    # API Gateway Configuration
    PROJECT_NAME: str = "Online Auction Platform - API Gateway"
    API_VERSION: str = "v1.0.0"
    
    # Database and Redis
    DATABASE_URL: str
    REDIS_URL: str
    
    # S3 / MinIO
    S3_ENDPOINT: str
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_BUCKET_ASSETS: str
    
    # Security
    JWT_SECRET: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    
    # Logging
    LOG_DIR: str = "logs/backend_logs"
    
    # Microservices URLs
    BIDDING_SERVICE_URL: str = "http://bidding-engine:8001"
    RECOMMENDATION_SERVICE_URL: str = "http://recommendation-engine:8002"

    ALLOWED_ORIGINS: str = "http://localhost:5173"
    
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # Load from root .env or local .env
    model_config = SettingsConfigDict(
        env_file=(".env", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env")),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
