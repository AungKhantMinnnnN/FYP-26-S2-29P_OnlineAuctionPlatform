from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# For async, we need to ensure the URL uses +asyncpg
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Strip query params like ?sslmode=require because asyncpg doesn't support them natively
if "?" in database_url:
    database_url = database_url.split("?")[0]

connect_args = {}
if "neon.tech" in database_url:
    connect_args["ssl"] = "require"

engine = create_async_engine(database_url, echo=True, connect_args=connect_args)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
