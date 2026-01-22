"""
Task API endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.task_service import TaskService
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskStartResponse,
    TaskStopResponse,
    TaskListResponse,
)
from app.schemas.common import MessageResponse, TaskStatus

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(default=None, description="Search keyword"),
    status: Optional[TaskStatus] = Query(default=None, description="Filter by status"),
    app_name: Optional[str] = Query(default=None, description="Filter by app name"),
    shadow_bot_account: Optional[str] = Query(default=None, description="Filter by ShadowBot account"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all tasks with pagination, search, and filtering
    """
    service = TaskService(db)
    result = await service.list_tasks(
        page=page,
        page_size=page_size,
        search=search,
        status=status.value if status else None,
        app_name=app_name,
        shadow_bot_account=shadow_bot_account,
    )
    return TaskListResponse(**result)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single task by ID
    """
    service = TaskService(db)
    task = await service.get_task(task_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": f"Task with ID '{task_id}' not found",
            },
        )

    return task


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    task_in: TaskCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new task
    """
    service = TaskService(db)
    return await service.create_task(task_in)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_in: TaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing task
    """
    service = TaskService(db)
    return await service.update_task(task_id, task_in)


@router.delete("/{task_id}", response_model=MessageResponse)
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a task
    """
    service = TaskService(db)
    deleted = await service.delete_task(task_id)

    if not deleted:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "DELETE_FAILED",
                "message": "Failed to delete task",
            },
        )

    return MessageResponse(
        message="Task deleted successfully",
        code="DELETED",
    )


@router.post("/{task_id}/start", response_model=TaskStartResponse)
async def start_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Start a task
    """
    service = TaskService(db)
    return await service.start_task(task_id)


@router.post("/{task_id}/stop", response_model=TaskStopResponse)
async def stop_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Stop a running task
    """
    service = TaskService(db)
    return await service.stop_task(task_id)
