from pydantic_settings import BaseSettings, SettingsConfigDict
import os

env_file_name = os.getenv("ENV_FILE", ".env.local")

class Settings(BaseSettings):
    # API Gateway Configuration
    PROJECT_NAME: str
    API_VERSION: str

    # Database and Redis
    DATABASE_URL: str
    REDIS_URL: str

    # S3 / MinIO
    S3_ENDPOINT: str
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_BUCKET_ASSETS: str
    S3_PUBLIC_URL: str | None = None  # genuinely optional: image_url falls back to S3_ENDPOINT when unset

    # Security
    JWT_SECRET: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Logging
    LOG_DIR: str

    # Microservices URLs
    BIDDING_SERVICE_URL: str
    RECOMMENDATION_SERVICE_URL: str

    ALLOWED_ORIGINS: str
    
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # Load from environment file
    model_config = SettingsConfigDict(
        env_file=(env_file_name, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), env_file_name)),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
