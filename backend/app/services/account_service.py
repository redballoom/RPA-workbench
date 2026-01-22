"""
Account service - business logic for account operations
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.account_repository import AccountRepository
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.schemas.common import AccountStatus


class AccountService:
    """Service for account business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AccountRepository(db)

    async def get_account(self, account_id: str) -> Optional[AccountResponse]:
        """Get a single account by ID"""
        account = await self.repo.get(account_id)
        if account:
            return AccountResponse.model_validate(account)
        return None

    async def list_accounts(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        host_ip: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List accounts with pagination, search, and filtering"""
        skip = (page - 1) * page_size

        # Build filters
        filters = {}
        if status:
            filters["status"] = status
        if host_ip:
            filters["host_ip"] = host_ip

        # Get items and count
        if search:
            items = await self.repo.search(search_term=search, skip=skip, limit=page_size)
            total = await self.repo.count_search(search_term=search)
        else:
            items = await self.repo.get_multi(
                skip=skip,
                limit=page_size,
                filters=filters if filters else {},
            )
            total = await self.repo.count(filters=filters if filters else {})

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "items": [AccountResponse.model_validate(item) for item in items],
        }

    async def create_account(self, account_in: AccountCreate) -> AccountResponse:
        """Create a new account"""
        # Check for duplicate task_control
        existing = await self.repo.get_by_task_control(account_in.task_control)
        if existing:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "DUPLICATE_RESOURCE",
                    "message": f"Account with task_control '{account_in.task_control}' already exists",
                },
            )

        account = await self.repo.create(account_in.model_dump())
        return AccountResponse.model_validate(account)

    async def update_account(
        self, account_id: str, account_in
    ) -> Optional[AccountResponse]:
        """Update an existing account"""
        account = await self.repo.get(account_id)
        if not account:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NOT_FOUND",
                    "message": f"Account with ID '{account_id}' not found",
                },
            )

        # Filter out None values for update (handle both dict and Pydantic model)
        if hasattr(account_in, "model_dump"):
            update_data = {k: v for k, v in account_in.model_dump().items() if v is not None}
        elif isinstance(account_in, dict):
            update_data = {k: v for k, v in account_in.items() if v is not None}
        else:
            update_data = account_in

        # Convert string datetime to datetime objects
        from datetime import datetime
        if "end_time" in update_data and isinstance(update_data["end_time"], str):
            update_data["end_time"] = datetime.fromisoformat(update_data["end_time"].replace("Z", "+00:00"))

        updated_account = await self.repo.update(account_id, update_data)
        return AccountResponse.model_validate(updated_account)

    async def delete_account(self, account_id: str) -> bool:
        """Delete an account"""
        account = await self.repo.get(account_id)
        if not account:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NOT_FOUND",
                    "message": f"Account with ID '{account_id}' not found",
                },
            )

        deleted = await self.repo.delete(account_id)
        return deleted

    async def get_account_stats(self) -> Dict[str, int]:
        """Get account statistics by status"""
        stats = {}
        for status in AccountStatus:
            accounts = await self.repo.get_by_status(status.value)
            stats[status.value] = len(accounts)
        return stats

    async def get_total_count(self) -> int:
        """Get total account count"""
        return await self.repo.count()

    async def get_accounts_by_shadow_bot(self, shadow_bot_account: str) -> List[AccountResponse]:
        """Get all accounts by shadow bot account name"""
        accounts = await self.repo.get_by_shadow_bot_account_list(shadow_bot_account)
        return [AccountResponse.model_validate(account) for account in accounts]
