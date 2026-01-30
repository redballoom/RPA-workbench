"""
Dashboard API endpoints
"""
from typing import Optional
from datetime import timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    Get dashboard statistics
    """
    service = DashboardService(db)
    return await service.get_stats()


@router.get("/performance")
async def get_performance_trends(
    days: int = Query(default=7, ge=1, le=30, description="Number of days to analyze"),
    timezone: str = Query(default="Asia/Shanghai", description="Timezone for grouping: 'UTC' or 'Asia/Shanghai'"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get performance trends over time

    - **days**: Number of days to analyze (1-30)
    - **timezone**: Timezone for date grouping (default: Asia/Shanghai)
    """
    service = DashboardService(db)
    return await service.get_performance_trends(days=days, timezone=timezone)


@router.get("/execution-rank")
async def get_execution_rank(
    limit: int = Query(default=10, ge=1, le=50, description="Maximum number of items to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get execution time ranking by app name (all history)

    - **limit**: Maximum number of items to return (1-50, default: 10)
    """
    service = DashboardService(db)
    return await service.get_execution_rank(limit=limit)
