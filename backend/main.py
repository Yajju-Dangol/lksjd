"""ASGI entrypoint for the UK wind forecast intelligence API.

Run locally with:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description=(
        "Compares Elexon day-ahead wind forecasts (WINDFOR) with actual wind "
        "generation (FUELHH) for January 2026 and exposes forecast-error metrics."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    """Small discoverability helper for anyone hitting the bare host."""
    return {
        "service": settings.project_name,
        "version": settings.version,
        "docs": "/docs",
        "health": f"{settings.api_v1_prefix}/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
