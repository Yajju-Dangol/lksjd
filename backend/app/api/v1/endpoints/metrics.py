"""Aggregate forecast-error KPIs (MAE, RMSE, bias, peak error)."""

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
    start: Annotated[date | None, Query(description="Inclusive start date")] = None,
    end: Annotated[date | None, Query(description="Inclusive end date")] = None,
    snapshot: Annotated[
        Snapshot,
        Query(description="Which forecast vintage to evaluate against"),
    ] = "day_ahead",
) -> MetricsResponse:
    if start and end and start > end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="`start` must be on or before `end`.",
        )

    try:
        return wind.get_metrics(start=start, end=end, snapshot=snapshot)
    except NotImplementedError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=(
                "Metrics are not available until the FUELHH/WINDFOR alignment "
                "pipeline is implemented."
            ),
        ) from None
