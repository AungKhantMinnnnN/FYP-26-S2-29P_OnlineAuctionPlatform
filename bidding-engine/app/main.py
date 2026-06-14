from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.controller import bids
from app.core.config import settings
from app.core.logger import setup_logging

logger = setup_logging("BiddingEngine")
logger.info("BiddingEngine starting up.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    # Swagger UI will be at /v1.0.0/bids/docs (via Nginx routing)
    docs_url=f"/{settings.API_VERSION}/bids/docs",
    openapi_url=f"/{settings.API_VERSION}/bids/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bids.router, prefix=f"/{settings.API_VERSION}/bids")

@app.get("/")
async def root():
    return {"message": "Bidding Engine Active", "version": settings.API_VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
