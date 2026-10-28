"""Aggregates the versioned routers mounted by `main.py`."""

from fastapi import APIRouter

from app.api.v1.endpoints import health, metrics, wind_data

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(wind_data.router)
api_router.include_router(metrics.router)
