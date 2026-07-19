"""Secondary, non-blocking listing check via the OpenAI Moderation API.

Unlike app.core.text_matching (an exact/fuzzy keyword gate that blocks a listing
outright), this is a semantic classifier: it can catch prohibited-item listings
phrased with words that were never seeded into the keyword list, in any language,
without needing per-language data. In exchange it's less predictable and its
"illicit" categories are documented around instructional content rather than
confirmed to fire on plain "item for sale" phrasing — so results here are treated
as a review signal for admins, never as grounds to block a listing outright.

Every failure mode (no API key configured, network error, timeout, non-2xx
response) is swallowed and treated as "not flagged" — this check must never be
able to break listing creation.
"""
import logging
from typing import List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger("APIGateWay.moderation")

_MODERATION_URL = "https://api.openai.com/v1/moderations"
_MODEL = "omni-moderation-latest"
_TIMEOUT_SECONDS = 5.0


async def check_text_flagged(text: str) -> Optional[List[str]]:
    """Returns the list of flagged category names, or None if not flagged / unavailable."""
    if not settings.OPENAI_API_KEY or not text or not text.strip():
        return None

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            response = await client.post(
                _MODERATION_URL,
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={"model": _MODEL, "input": text},
            )
            response.raise_for_status()
            result = response.json()["results"][0]
    except Exception as exc:
        logger.warning("OpenAI moderation check skipped (unavailable): %s", exc)
        return None

    if not result.get("flagged"):
        return None

    categories = [name for name, is_flagged in result.get("categories", {}).items() if is_flagged]
    return categories or None
