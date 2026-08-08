from pydantic_settings import BaseSettings, SettingsConfigDict
import os

env_file_name = os.getenv("ENV_FILE", ".env.local")

class Settings(BaseSettings):
    PROJECT_NAME: str
    API_VERSION: str
    DATABASE_URL: str
    REDIS_URL: str
    BACKEND_URL: str
    DB_ECHO: bool = False
    JWT_SECRET: str
    # Shared secret sent on /internal/* calls to the backend (see backend's internal.py).
    INTERNAL_API_KEY: str = ""

    LOG_DIR: str

    ALLOWED_ORIGINS: str

    # Set false to disable per-user WS message rate limiting (e.g. QA testing).
    RATE_LIMIT_ENABLED: bool = True
    
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = SettingsConfigDict(
        env_file=(env_file_name, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), env_file_name)),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()