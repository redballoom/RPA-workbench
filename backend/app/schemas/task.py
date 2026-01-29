"""
Task Pydantic schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import TaskStatus, PaginatedResponse, PaginationParams, SearchParams


# ============ Task Schemas ============

class TaskBase(BaseModel):
    """Base Task schema with common fields"""
    task_name: str = Field(..., min_length=1, max_length=200, description="Task name")
    shadow_bot_account: str = Field(..., min_length=1, max_length=100, description="ShadowBot account name")
    host_ip: str = Field(..., min_length=1, max_length=15, description="Host IP address")
    app_name: str = Field(..., min_length=1, max_length=100, description="Application name")


class TaskCreate(TaskBase):
    """Schema for creating a task"""
    config_file: bool = Field(default=False, description="Has config file")
    config_info: bool = Field(default=False, description="Has config info")
    config_file_path: Optional[str] = Field(default=None, max_length=500, description="Config file OSS URL")
    config_json: Optional[str] = Field(default=None, max_length=2000, description="Config info JSON")
    trigger_time: Optional[datetime] = Field(default=None, description="Scheduled trigger time")


class TaskUpdate(BaseModel):
    """Schema for updating a task"""
    task_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    shadow_bot_account: Optional[str] = Field(default=None, min_length=1, max_length=100)
    host_ip: Optional[str] = Field(default=None, min_length=1, max_length=15)
    app_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_run_time: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    config_file: Optional[bool] = None
    config_info: Optional[bool] = None
    config_file_path: Optional[str] = Field(default=None, max_length=500)
    config_json: Optional[str] = Field(default=None, max_length=2000)
    trigger_time: Optional[datetime] = None


class TaskInDB(TaskBase):
    """Schema for task in database"""
    id: str = Field(..., description="Task UUID")
    last_run_time: Optional[datetime] = None
    status: TaskStatus
    config_file: bool
    config_info: bool
    config_file_path: Optional[str] = None
    config_json: Optional[str] = None
    trigger_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskResponse(TaskInDB):
    """Schema for task response"""
    pass


# ============ Task Control Schemas ============

class TaskStartResponse(BaseModel):
    """Response schema for starting a task"""
    message: str = "Task started successfully"
    task_id: str
    status: TaskStatus


class TaskStopResponse(BaseModel):
    """Response schema for stopping a task"""
    message: str = "Task stopped successfully"
    task_id: str
    status: TaskStatus


# ============ Task List Schemas ============

class TaskListParams(PaginationParams, SearchParams):
    """Parameters for listing tasks"""
    status: Optional[TaskStatus] = Field(default=None, description="Filter by status")
    app_name: Optional[str] = Field(default=None, description="Filter by app name")
    shadow_bot_account: Optional[str] = Field(default=None, description="Filter by ShadowBot account")


class TaskListResponse(PaginatedResponse[TaskResponse]):
    """Response schema for task list"""
    pass
