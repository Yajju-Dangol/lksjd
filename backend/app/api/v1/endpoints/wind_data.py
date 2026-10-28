"""Aligned actual-vs-forecast wind generation time series."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.models.schemas import Snapshot, WindDataResponse
from app.services import wind

router = APIRouter(prefix="/wind-data", tags=["wind"])


@router.get(
    "",
    response_model=WindDataResponse,
    summary="Aligned 30-minute actual vs. forecast wind generation",
)
def get_wind_data(
    start: Annotated[date | None, Query(description="Inclusive start date")] = None,
    end: Annotated[date | None, Query(description="Inclusive end date")] = None,
    snapshot: Annotated[
        Snapshot,
        Query(description="Which forecast vintage to evaluate against"),
    ] = "day_ahead",
) -> WindDataResponse:
    if start and end and start > end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="`start` must be on or before `end`.",
        )

    try:
        return wind.get_aligned_wind_data(start=start, end=end, snapshot=snapshot)
    except NotImplementedError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=(
                "Wind ingestion is not wired up yet. Next step: fetch FUELHH and "
                "WINDFOR from Elexon, cache them, and align on `startTime`."
            ),
        ) from None
