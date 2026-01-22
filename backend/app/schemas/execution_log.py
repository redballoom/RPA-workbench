"""
ExecutionLog Pydantic schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import LogStatus, PaginatedResponse, PaginationParams, SearchParams


# ============ ExecutionLog Schemas ============

class ExecutionLogBase(BaseModel):
    """Base ExecutionLog schema with common fields"""
    text: str = Field(..., min_length=1, max_length=255, description="Log text")
    app_name: str = Field(..., min_length=1, max_length=100, description="Application name")
    shadow_bot_account: str = Field(..., min_length=1, max_length=100, description="ShadowBot account name")
    start_time: datetime = Field(..., description="Execution start time")
    end_time: datetime = Field(..., description="Execution end time")
    duration: float = Field(..., ge=0, description="Duration in seconds")
    host_ip: str = Field(default="", max_length=15, description="Host IP address")


class ExecutionLogCreate(ExecutionLogBase):
    """Schema for creating an execution log"""
    status: LogStatus = Field(default=LogStatus.running, description="Execution status")
    log_info: bool = Field(default=False, description="Has log info")
    screenshot: bool = Field(default=False, description="Has screenshot")


class ExecutionLogUpdate(BaseModel):
    """Schema for updating an execution log"""
    text: Optional[str] = Field(default=None, min_length=1, max_length=255)
    status: Optional[LogStatus] = None
    end_time: Optional[datetime] = None
    duration: Optional[float] = Field(default=None, ge=0)
    log_info: Optional[bool] = None
    screenshot: Optional[bool] = None


class ExecutionLogInDB(ExecutionLogBase):
    """Schema for execution log in database"""
    id: str = Field(..., description="Log UUID")
    status: LogStatus
    log_info: bool
    screenshot: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ExecutionLogResponse(ExecutionLogInDB):
    """Schema for execution log response"""
    pass


# ============ ExecutionLog List Schemas ============

class ExecutionLogListParams(PaginationParams, SearchParams):
    """Parameters for listing execution logs"""
    status: Optional[LogStatus] = Field(default=None, description="Filter by status")
    app_name: Optional[str] = Field(default=None, description="Filter by app name")
    shadow_bot_account: Optional[str] = Field(default=None, description="Filter by ShadowBot account")
    host_ip: Optional[str] = Field(default=None, description="Filter by host IP")
    start_date: Optional[datetime] = Field(default=None, description="Start date filter")
    end_date: Optional[datetime] = Field(default=None, description="End date filter")


class ExecutionLogListResponse(PaginatedResponse[ExecutionLogResponse]):
    """Response schema for execution log list"""
    pass


# ============ ExecutionLog Export Schemas ============

class ExecutionLogExportResponse(BaseModel):
    """Response schema for log export"""
    message: str = "Logs exported successfully"
    total_count: int
    file_format: str = "csv"
    download_url: Optional[str] = None
