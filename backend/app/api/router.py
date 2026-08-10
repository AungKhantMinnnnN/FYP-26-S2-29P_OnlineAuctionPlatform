from fastapi import APIRouter

from app.api.v1.controller import (
    admin,
    auctions,
    auth,
    boards,
    cms,
    disputes,
    feedback,
    health,
    internal,
    issue_types,
    marketing,
    page_content,
    subscriptions,
    testimonials,
    users,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(auctions.router, prefix="/auctions", tags=["auctions"])
api_router.include_router(testimonials.router, prefix="/testimonials", tags=["testimonials"])
api_router.include_router(disputes.router, prefix="/disputes", tags=["disputes"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(subscriptions.router, prefix="/subscription-tiers", tags=["subscriptions"])
api_router.include_router(issue_types.router, prefix="/issue-types", tags=["issue-types"])
api_router.include_router(boards.router, prefix="/boards", tags=["boards"])
api_router.include_router(marketing.router, tags=["marketing"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["feedback"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(internal.router)
api_router.include_router(cms.router, prefix="/cms", tags=["cms"])
api_router.include_router(page_content.router, prefix="/page-content", tags=["page-content"])
api_router.include_router(page_content.admin_router, prefix="/admin/page-content", tags=["page-content-admin"])
