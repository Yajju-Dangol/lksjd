"""Aligned actual-vs-forecast wind generation time series."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.models.schemas import GenerationDataResponse, Snapshot
from app.services import wind

router = APIRouter(prefix="/generation-data", tags=["wind"])


@router.get(
    "",
    response_model=GenerationDataResponse,
    summary="Aligned 30-minute actual vs. forecast wind generation",
)
def get_generation_data(
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
) -> GenerationDataResponse:
    try:
        window_start, window_end = wind.resolve_window(start, end)
        return wind.get_generation_data(window_start, window_end, snapshot)
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
