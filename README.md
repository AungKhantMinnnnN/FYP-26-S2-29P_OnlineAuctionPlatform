# Online Auction Platform (C2C)

A distributed microservices-based online auction platform built with FastAPI, React, and Redis.

## Architecture
- **Nginx**: Reverse proxy and API Gateway routing.
- **Core Backend**: FastAPI service for user management, listings, and transactions.
- **Bidding Engine**: High-concurrency WebSocket-based service for real-time bidding.
- **Recommendation Engine**: ML-powered service for personalized item discovery.

## Prerequisites
- **Docker & Docker Compose**
- **Python 3.11+** (for local development)
- **Node.js 18+** (for frontend development)

## Getting Started

### 1. Environment Setup
Clone the repository and create your `.env` file:
```bash
cp .env.example .env
```
Update the secrets and configuration in `.env` as needed.

### 2. Development Mode
Run the entire stack with hot-reloading enabled for all microservices:
```bash
docker-compose up --build
```
- **Core API & Docs**: [http://localhost/v1.0.0/docs](http://localhost/v1.0.0/docs)
- **Bidding Engine Docs**: [http://localhost/v1.0.0/bids/docs](http://localhost/v1.0.0/bids/docs)
- **Recommendation Engine Docs**: [http://localhost/v1.0.0/recs/docs](http://localhost/v1.0.0/recs/docs)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001)

### 3. Local Development (Optional)
If you prefer running services outside of Docker:
```bash
# Example for Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Technology Stack
- **Backend**: FastAPI, SQLAlchemy, Pydantic V2, Alembic
- **Real-time**: WebSockets, Redis Pub/Sub
- **Database**: PostgreSQL 15, Redis 7
- **Storage**: MinIO (S3 Compatible)
- **ML**: Scikit-learn, Pandas, Surprise
- **Infrastructure**: Nginx, Docker

## API Versioning
The project follows a semantic versioning scheme `vX.Y.Z`:
- `X`: Sprint number / Major changes.
- `Y`: New features (backward compatible).
- `Z`: Minor changes / Bug fixes.

Current Version: `v1.0.0`
