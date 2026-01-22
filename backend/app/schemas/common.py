"""
Common schemas module
"""
from datetime import datetime
from typing import Optional, Generic, TypeVar, List
from pydantic import BaseModel, Field
from enum import Enum


class AccountStatus(str, Enum):
    """Account status enum"""
    pending = "pending"
    completed = "completed"
    running = "running"


class TaskStatus(str, Enum):
    """Task status enum"""
    pending = "pending"
    completed = "completed"
    running = "running"
    failed = "failed"


class LogStatus(str, Enum):
    """Log status enum"""
    completed = "completed"
    failed = "failed"
    running = "running"


class UserRole(str, Enum):
    """User role enum"""
    admin = "admin"
    user = "user"


# Generic type for paginated response
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response"""
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[T]


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")


class SearchParams(BaseModel):
    """Search parameters"""
    search: Optional[str] = Field(default=None, description="Search keyword")


class DateRangeParams(BaseModel):
    """Date range parameters"""
    start_date: Optional[datetime] = Field(default=None, description="Start date")
    end_date: Optional[datetime] = Field(default=None, description="End date")


class StatusFilterParams(BaseModel):
    """Status filter parameters"""
    status: Optional[str] = Field(default=None, description="Filter by status")


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    code: str = "SUCCESS"
