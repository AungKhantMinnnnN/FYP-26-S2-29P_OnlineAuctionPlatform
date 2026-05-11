from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Online Auction Platform - Bidding-Engine"
    API_VERSION: str = "v1.0.0"
    REDIS_URL: str = "redis://redis:6379/1"  # Separate DB for bidding engine locks/state
    BACKEND_URL: str = "http://backend:8000" # Internal communication
    SECRET_KEY: str = "your-secret-key-change-me"

    LOG_DIR: str = "logs/backend_logs"

    class Config:
        env_file = ".env"

settings = Settings()