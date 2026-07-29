"""Test bootstrap: ensure this service's Settings can load without a real .env file.

Dummy values are set via setdefault, so real environment variables (CI job env, a
developer's shell) always take precedence. This runs before any test module imports
app.core.config, so config validation never fails for missing required fields.
"""
import os

_TEST_ENV = {
    "PROJECT_NAME": "test-service",
    "API_VERSION": "v1.0.0",
    "DATABASE_URL": "postgresql+asyncpg://user:pass@localhost:5432/testdb",
    "REDIS_URL": "redis://localhost:6379/0",
    "S3_ENDPOINT": "http://localhost:9000",
    "S3_ACCESS_KEY": "test",
    "S3_SECRET_KEY": "test",
    "S3_BUCKET_ASSETS": "assets",
    "S3_PUBLIC_URL": "http://localhost:9000",
    "JWT_SECRET": "test-secret-key",
    "ALGORITHM": "HS256",
    "ACCESS_TOKEN_EXPIRE_MINUTES": "60",
    "LOG_DIR": "/tmp/auction-test-logs",
    "BIDDING_SERVICE_URL": "http://localhost:8001",
    "RECOMMENDATION_SERVICE_URL": "http://localhost:8002",
    "BACKEND_URL": "http://localhost:8000",
    "ALLOWED_ORIGINS": "http://localhost:3000",
}
for _k, _v in _TEST_ENV.items():
    os.environ.setdefault(_k, _v)
