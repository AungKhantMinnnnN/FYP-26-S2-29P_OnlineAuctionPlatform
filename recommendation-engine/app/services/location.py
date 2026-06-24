import re

_STATE_ZIP_RE = re.compile(r"^([a-z]{2})\s*\d{0,5}(-\d{4})?$")


def parse_location(address: str | None) -> dict[str, str | None]:
    """Best-effort (city, region) extraction from a freeform address for grouping."""
    if not address or not address.strip():
        return {"city": None, "region": None}

    parts = [p.strip() for p in address.split(",") if p.strip()]
    if not parts:
        return {"city": None, "region": None}

    if len(parts) == 1:
        return {"city": _normalize(parts[0]), "region": None}

    match = _STATE_ZIP_RE.match(_normalize(parts[-1]))
    if match:
        return {"city": _normalize(parts[-2]), "region": match.group(1).upper()}
    return {"city": _normalize(parts[-1]), "region": None}


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())
