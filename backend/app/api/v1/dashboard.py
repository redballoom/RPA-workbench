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
    db: AsyncSession = Depends(get_db),
):
    """
    Get performance trends over time
    """
    service = DashboardService(db)
    return await service.get_performance_trends(days=days)
