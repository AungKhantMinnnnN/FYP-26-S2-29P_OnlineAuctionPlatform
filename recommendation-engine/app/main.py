from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.core.logger import setup_logging

logger = setup_logging("RecommendationEngine")
logger.info("Recommendation Engine starting up.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    # Swagger UI will be at /v1.0.0/recs/docs (via Nginx routing)
    docs_url=f"/{settings.API_VERSION}/recs/docs",
    openapi_url=f"/{settings.API_VERSION}/recs/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=f"/{settings.API_VERSION}/recs")

@app.get("/")
async def root():
    return {"message": "Recommendation Engine Active", "version": settings.API_VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
