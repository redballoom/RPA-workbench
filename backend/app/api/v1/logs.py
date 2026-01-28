"""
ExecutionLog API endpoints
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
import csv
import io

from app.core.database import get_db
from app.services.execution_log_service import ExecutionLogService
from app.schemas.execution_log import (
    ExecutionLogResponse,
    ExecutionLogListResponse,
)
from app.schemas.common import LogStatus

router = APIRouter(prefix="/logs", tags=["Execution Logs"])


@router.get("", response_model=ExecutionLogListResponse)
async def list_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(default=None, description="Search keyword"),
    status: Optional[LogStatus] = Query(default=None, description="Filter by status"),
    app_name: Optional[str] = Query(default=None, description="Filter by app name"),
    shadow_bot_account: Optional[str] = Query(default=None, description="Filter by ShadowBot account"),
    host_ip: Optional[str] = Query(default=None, description="Filter by host IP"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    sort_by: Optional[str] = Query(default="start_time", description="Sort field: start_time, created_at, duration"),
    order: Optional[str] = Query(default="desc", description="Sort order: asc, desc"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all execution logs with pagination, search, and filtering
    """
    service = ExecutionLogService(db)
    result = await service.list_logs(
        page=page,
        page_size=page_size,
        search=search,
        status=status.value if status else None,
        app_name=app_name,
        shadow_bot_account=shadow_bot_account,
        host_ip=host_ip,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        order=order,
    )
    return ExecutionLogListResponse(**result)


@router.get("/export")
async def export_logs(
    search: Optional[str] = Query(default=None, description="Search keyword"),
    status: Optional[LogStatus] = Query(default=None, description="Filter by status"),
    app_name: Optional[str] = Query(default=None, description="Filter by app name"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export execution logs to CSV format
    """
    service = ExecutionLogService(db)
    logs = await service.export_logs(
        search=search,
        status=status.value if status else None,
        app_name=app_name,
        start_date=start_date,
        end_date=end_date,
    )

    # Create CSV content
    output = io.StringIO()
    fieldnames = [
        "id",
        "text",
        "app_name",
        "shadow_bot_account",
        "status",
        "start_time",
        "end_time",
        "duration",
        "host_ip",
        "log_info",
        "screenshot",
        "created_at",
    ]

    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for log in logs:
        log_dict = log.model_dump()
        writer.writerow({
            "id": log_dict["id"],
            "text": log_dict["text"],
            "app_name": log_dict["app_name"],
            "shadow_bot_account": log_dict["shadow_bot_account"],
            "status": log_dict["status"],
            "start_time": log_dict["start_time"].isoformat() if log_dict["start_time"] else "",
            "end_time": log_dict["end_time"].isoformat() if log_dict["end_time"] else "",
            "duration": float(log_dict["duration"]) if log_dict["duration"] else 0,
            "host_ip": log_dict["host_ip"],
            "log_info": log_dict["log_info"],
            "screenshot": log_dict["screenshot"],
            "created_at": log_dict["created_at"].isoformat() if log_dict["created_at"] else "",
        })

    csv_content = output.getvalue()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=execution_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        },
    )


@router.get("/{log_id}", response_model=ExecutionLogResponse)
async def get_log(
    log_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single execution log by ID
    """
    service = ExecutionLogService(db)
    log = await service.get_log(log_id)

    if not log:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": f"ExecutionLog with ID '{log_id}' not found",
            },
        )

    return log
