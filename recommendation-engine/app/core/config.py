from pydantic_settings import BaseSettings, SettingsConfigDict
import os

env_file_name = os.getenv("ENV_FILE", ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str
    API_VERSION: str
    DATABASE_URL: str
    BACKEND_URL: str
    REDIS_URL: str
    S3_PUBLIC_URL: str
    JWT_SECRET: str
    ALGORITHM: str = "HS256"
    DB_ECHO: bool = False

    LOG_DIR: str

    ALLOWED_ORIGINS: str
    S3_PUBLIC_URL: str

    # Caching — set RECS_CACHE_ENABLED=false to always compute from DB
    RECS_CACHE_ENABLED: bool = True
    RECS_LISTINGS_CACHE_TTL: int = 300       # 5 min  — active listings snapshot
    RECS_INTERACTIONS_CACHE_TTL: int = 300   # 5 min  — unified interactions signal
    RECS_ANONYMOUS_CACHE_TTL: int = 300      # 5 min  — pre-scored anonymous result
    RECS_USER_SIGNALS_CACHE_TTL: int = 86400 # 24 h   — per-user brands + price profile
    
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = SettingsConfigDict(
        env_file=(env_file_name, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), env_file_name)),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
