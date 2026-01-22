"""
Account API endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.account_service import AccountService
from app.schemas.account import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
    AccountListResponse,
)
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("", response_model=AccountListResponse)
async def list_accounts(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(default=None, description="Search keyword"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    host_ip: Optional[str] = Query(default=None, description="Filter by host IP"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all accounts with pagination, search, and filtering
    """
    service = AccountService(db)
    result = await service.list_accounts(
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        host_ip=host_ip,
    )
    return AccountListResponse(**result)


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single account by ID
    """
    service = AccountService(db)
    account = await service.get_account(account_id)

    if not account:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": f"Account with ID '{account_id}' not found",
            },
        )

    return account


@router.post("", response_model=AccountResponse, status_code=201)
async def create_account(
    account_in: AccountCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new account
    """
    service = AccountService(db)
    return await service.create_account(account_in)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    account_in: AccountUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing account
    """
    service = AccountService(db)
    return await service.update_account(account_id, account_in)


@router.delete("/{account_id}", response_model=MessageResponse)
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete an account
    """
    service = AccountService(db)
    deleted = await service.delete_account(account_id)

    if not deleted:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "DELETE_FAILED",
                "message": "Failed to delete account",
            },
        )

    return MessageResponse(
        message="Account deleted successfully",
        code="DELETED",
    )
