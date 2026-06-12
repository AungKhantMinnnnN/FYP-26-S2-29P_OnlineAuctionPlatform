from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.core.logger import setup_logging

logger = setup_logging("APIGateWay")
logger.info("API GateWay starting up.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    # Swagger UI will be at /v1.0.0/docs
    docs_url=f"/{settings.API_VERSION}/docs",
    redoc_url=f"/{settings.API_VERSION}/redoc",
    openapi_url=f"/{settings.API_VERSION}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# We don't prefix the router here because the endpoints in router.py 
# are already prefixed or we want them under the app's versioned docs
app.include_router(api_router, prefix=f"/{settings.API_VERSION}")

@app.get("/")
async def root():
    return {"message": "Welcome to the Auction Platform API", "version": settings.API_VERSION}
