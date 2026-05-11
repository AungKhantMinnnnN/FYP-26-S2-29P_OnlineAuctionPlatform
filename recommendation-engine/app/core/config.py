from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Online Auction Platform - Recommendation Engine"
    API_VERSION: str = "v1.0.0"
    BACKEND_URL: str = "http://backend:8000"
    REDIS_URL: str = "redis://redis:6379/0"

    LOG_DIR: str = "logs/recommendation-engine_logs"

    class Config:
        env_file = ".env"

settings = Settings()
