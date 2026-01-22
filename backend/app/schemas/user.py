"""
User Pydantic schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from app.schemas.common import UserRole, PaginatedResponse, PaginationParams


# ============ User Schemas ============

class UserBase(BaseModel):
    """Base User schema with common fields"""
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="Email address")
    full_name: Optional[str] = Field(default=None, max_length=100, description="Full name")


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str = Field(..., min_length=6, max_length=100, description="Password")
    role: UserRole = Field(default=UserRole.user, description="User role")


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(default=None, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserUpdatePassword(BaseModel):
    """Schema for updating password"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=6, max_length=100, description="New password")


class UserInDB(UserBase):
    """Schema for user in database"""
    id: str = Field(..., description="User UUID")
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserResponse(UserInDB):
    """Schema for user response"""
    pass


class UserListResponse(PaginatedResponse[UserResponse]):
    """Response schema for user list"""
    pass


# ============ Authentication Schemas ============

class LoginRequest(BaseModel):
    """Login request schema"""
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenPayload(BaseModel):
    """Token payload schema"""
    sub: str  # User ID
    username: str
    role: UserRole
    exp: datetime


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema"""
    refresh_token: str
