"""Mocked-boundary test for SubscriptionService."""
from app.services.subscription_service import SubscriptionService
from tests.fakedb import make_db, exec_result


async def test_list_active_tiers_returns_scalars():
    db = make_db()
    tiers = [object(), object()]
    db.execute.side_effect = [exec_result(all_=tiers)]
    assert await SubscriptionService.list_active_tiers(db) == tiers
