from pydantic_settings import BaseSettings, SettingsConfigDict
import os

env_file_name = os.getenv("ENV_FILE", ".env.local")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Online Auction Platform - Bidding-Engine"
    API_VERSION: str = "v1.0.0"
    DATABASE_URL: str = "postgresql://user:password@db:5432/auction_db"
    REDIS_URL: str = "redis://redis:6379/1"  # Separate DB for bidding engine locks/state
    BACKEND_URL: str = "http://backend:8000" # Internal communication
    JWT_SECRET: str

    LOG_DIR: str = "logs/backend_logs"

    ALLOWED_ORIGINS: str = "http://localhost:5173"
    
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = SettingsConfigDict(
        env_file=(env_file_name, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), env_file_name)),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()