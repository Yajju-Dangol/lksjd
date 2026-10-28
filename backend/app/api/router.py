"""Aggregates the versioned routers mounted by `main.py`."""

from fastapi import APIRouter

from app.api.v1.endpoints import generation_data, health, metrics

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(generation_data.router)
api_router.include_router(metrics.router)
