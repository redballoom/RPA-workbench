"""
Account repository
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.models.account import Account
from app.repositories.base import BaseRepository


class AccountRepository(BaseRepository[Account, dict, dict]):
    """
    Account repository for account-specific operations
    """

    def __init__(self, db: AsyncSession):
        super().__init__(Account, db)

    async def get_by_shadow_bot_account(self, shadow_bot_account: str) -> Optional[Account]:
        """
        Get account by shadow bot account name
        """
        try:
            result = await self.db.execute(
                select(Account).where(Account.shadow_bot_account == shadow_bot_account)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_shadow_bot_account_list(self, shadow_bot_account: str) -> List[Account]:
        """
        Get all accounts by shadow bot account name
        """
        try:
            result = await self.db.execute(
                select(Account).where(Account.shadow_bot_account == shadow_bot_account)
            )
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_host_ip(self, host_ip: str) -> Optional[Account]:
        """
        Get account by host IP
        """
        try:
            result = await self.db.execute(
                select(Account).where(Account.host_ip == host_ip)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_task_control(self, task_control: str) -> Optional[Account]:
        """
        Get account by task control identifier
        """
        try:
            result = await self.db.execute(
                select(Account).where(Account.task_control == task_control)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            await self.db.rollback()
            raise

    async def search(
        self,
        search_term: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Account]:
        """
        Search accounts by shadow_bot_account or host_ip
        """
        try:
            query = select(Account)

            if search_term:
                query = query.where(
                    or_(
                        Account.shadow_bot_account.ilike(f"%{search_term}%"),
                        Account.host_ip.ilike(f"%{search_term}%"),
                    )
                )

            query = query.offset(skip).limit(limit)

            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def count_search(self, search_term: Optional[str] = None) -> int:
        """
        Count accounts matching search criteria
        """
        try:
            query = select(func.count(Account.id))

            if search_term:
                query = query.where(
                    or_(
                        Account.shadow_bot_account.ilike(f"%{search_term}%"),
                        Account.host_ip.ilike(f"%{search_term}%"),
                    )
                )

            result = await self.db.execute(query)
            return result.scalar_one()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_status(self, status: str) -> List[Account]:
        """
        Get accounts by status
        """
        try:
            result = await self.db.execute(
                select(Account).where(Account.status == status)
            )
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_task_count(self, min_count: int = 0) -> List[Account]:
        """
        Get accounts with at least min_count associated tasks
        Note: This is a placeholder as we don't have a direct relationship yet
        """
        # In a real implementation, we would join with tasks table
        # For now, just return all accounts
        try:
            result = await self.db.execute(select(Account))
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise
