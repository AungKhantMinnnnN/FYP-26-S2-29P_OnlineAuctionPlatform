import re

# ponytail: comma-split heuristic, not a real address parser (no parsing lib
# installed, address is a single freeform text field with no fixed format).
# Good enough to group "123 Main St, Springfield, IL" with "Springfield, IL"
# for trending segmentation; upgrade to usaddress/libpostal if grouping
# quality ever matters more than this.
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


if __name__ == "__main__":
    assert parse_location(None) == {"city": None, "region": None}
    assert parse_location("  ") == {"city": None, "region": None}
    assert parse_location("Springfield") == {"city": "springfield", "region": None}
    assert parse_location("Springfield, IL") == {"city": "springfield", "region": "IL"}
    assert parse_location("123 Main St, Springfield, IL 62704") == {"city": "springfield", "region": "IL"}
    assert parse_location("123 Main St, Springfield") == {"city": "springfield", "region": None}
    assert parse_location("12  Maple   St, Springfield ,  il") == {"city": "springfield", "region": "IL"}
    print("OK  parse_location")
