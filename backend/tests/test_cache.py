from __future__ import annotations

from dataclasses import replace
from pathlib import Path

from app.services import cache


def test_write_cache_survives_read_only_filesystem(monkeypatch, tmp_path) -> None:
    """A read-only serverless bundle must not turn a cache write into a 500."""
    monkeypatch.setattr(
        cache,
        "settings",
        replace(cache.settings, cache_file=tmp_path / "cache_jan2026.json"),
    )

    def fail_write(self, *args, **kwargs):
        raise OSError(30, "Read-only file system", str(self))

    def fail_unlink(self, *args, **kwargs):
        raise OSError(30, "Read-only file system", str(self))

    monkeypatch.setattr(Path, "write_text", fail_write)
    monkeypatch.setattr(Path, "unlink", fail_unlink)

    updated_at = cache.write_cache([], [])

    assert updated_at.tzinfo is not None
