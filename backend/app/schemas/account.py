"""
Account Pydantic schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import AccountStatus, PaginatedResponse, PaginationParams, SearchParams


# ============ Account Schemas ============

class AccountBase(BaseModel):
    """Base Account schema with common fields"""
    shadow_bot_account: str = Field(..., min_length=1, max_length=100, description="ShadowBot account name")
    host_ip: str = Field(..., min_length=1, max_length=15, description="Host IP address")
    port: int = Field(default=0, ge=0, le=65535, description="Connection port for internal network access")
    recent_app: Optional[str] = Field(default=None, max_length=100, description="Recent application name")


class AccountCreate(AccountBase):
    """Schema for creating an account"""
    status: AccountStatus = Field(default=AccountStatus.pending, description="Account status")


class AccountUpdate(BaseModel):
    """Schema for updating an account"""
    shadow_bot_account: Optional[str] = Field(default=None, min_length=1, max_length=100)
    host_ip: Optional[str] = Field(default=None, min_length=1, max_length=15)
    port: Optional[int] = Field(default=None, ge=0, le=65535)
    recent_app: Optional[str] = Field(default=None, max_length=100)
    status: Optional[AccountStatus] = None
    end_time: Optional[datetime] = None
    task_count: Optional[int] = Field(default=None, ge=0, description="Number of tasks bound to this account")


class AccountInDB(AccountBase):
    """Schema for account in database"""
    id: str = Field(..., description="Account UUID")
    status: AccountStatus
    end_time: Optional[datetime] = None
    task_control: str
    task_count: int = Field(default=0, description="Number of tasks bound to this account")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AccountResponse(AccountInDB):
    """Schema for account response"""
    pass


# ============ Account List Schemas ============

class AccountListParams(PaginationParams, SearchParams):
    """Parameters for listing accounts"""
    status: Optional[AccountStatus] = Field(default=None, description="Filter by status")
    host_ip: Optional[str] = Field(default=None, description="Filter by host IP")


class AccountListResponse(PaginatedResponse[AccountResponse]):
    """Response schema for account list"""
    pass
