"""Aggregate forecast-error KPIs (MAE, RMSE, net imbalance, bias)."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.models.schemas import MetricsResponse, Snapshot
from app.services import wind

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get(
    "",
    response_model=MetricsResponse,
    summary="Forecast accuracy KPIs for the selected window",
)
def get_metrics(
    start: Annotated[
        date | None, Query(description="Inclusive start date (January 2026)")
    ] = None,
    end: Annotated[
        date | None, Query(description="Inclusive end date (January 2026)")
    ] = None,
    snapshot: Annotated[
        Snapshot,
        Query(description="Forecast vintage: day-ahead gate closure or latest"),
    ] = "day_ahead",
) -> MetricsResponse:
    try:
        window_start, window_end = wind.resolve_window(start, end)
        return wind.get_metrics(window_start, window_end, snapshot)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from None
    except wind.DataUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from None
