"""Local JSON cache for the January 2026 Elexon dataset.

The cache is written atomically so a crash mid-write cannot corrupt the file
that the resilience fallback depends on.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

CACHE_VERSION = 1
DATASET_KEY = "jan2026"


@dataclass(frozen=True)
class CachePayload:
    actuals: list[dict]
    forecasts: list[dict]
    updated_at: datetime


def _cache_path() -> Path:
    return settings.cache_file


def read_cache() -> CachePayload | None:
    """Load the cache, returning None when absent or unreadable."""
    path = _cache_path()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Ignoring unreadable cache at %s: %s", path, exc)
        return None

    if not isinstance(raw, dict) or raw.get("cache_version") != CACHE_VERSION:
        logger.warning("Ignoring cache at %s: unsupported version", path)
        return None

    actuals = raw.get("actuals")
    forecasts = raw.get("forecasts")
    if not isinstance(actuals, list) or not isinstance(forecasts, list):
        logger.warning("Ignoring cache at %s: malformed payload", path)
        return None

    try:
        updated_at = datetime.fromisoformat(
            str(raw["updated_at"]).replace("Z", "+00:00")
        )
    except (KeyError, ValueError):
        logger.warning("Ignoring cache at %s: invalid updated_at", path)
        return None

    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)

    return CachePayload(
        actuals=actuals,
        forecasts=forecasts,
        updated_at=updated_at,
    )


def write_cache(actuals: list[dict], forecasts: list[dict]) -> datetime:
    """Persist the raw dataset atomically and return its timestamp."""
    path = _cache_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    updated_at = datetime.now(timezone.utc)

    payload = {
        "cache_version": CACHE_VERSION,
        "dataset": DATASET_KEY,
        "updated_at": updated_at.isoformat().replace("+00:00", "Z"),
        "source": {
            "provider": "Elexon BMRS Insights API",
            "actuals": "FUELHH (fuelType=WIND)",
            "forecasts": "WINDFOR",
        },
        "actuals": actuals,
        "forecasts": forecasts,
    }

    tmp_path = path.with_name(f"{path.name}.tmp")
    tmp_path.write_text(
        json.dumps(payload, separators=(",", ":")),
        encoding="utf-8",
    )
    os.replace(tmp_path, path)
    logger.info(
        "Cached %d actual and %d forecast rows at %s",
        len(actuals),
        len(forecasts),
        path,
    )
    return updated_at


def is_fresh(updated_at: datetime, ttl_seconds: int) -> bool:
    age = (datetime.now(timezone.utc) - updated_at).total_seconds()
    return age < ttl_seconds
