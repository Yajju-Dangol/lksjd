"""Liveness probe used by Docker, load balancers and the frontend."""

from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import settings
from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Service health")
def health() -> HealthResponse:
    return HealthResponse(
        service=settings.project_name,
        version=settings.version,
        environment=settings.environment,
        timestamp=datetime.now(timezone.utc),
    )
