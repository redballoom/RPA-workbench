"""
Task repository
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.models.task import Task
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task, dict, dict]):
    """
    Task repository for task-specific operations
    """

    def __init__(self, db: AsyncSession):
        super().__init__(Task, db)

    async def get_by_shadow_bot_account(self, shadow_bot_account: str) -> List[Task]:
        """
        Get tasks by shadow bot account name
        """
        try:
            result = await self.db.execute(
                select(Task).where(Task.shadow_bot_account == shadow_bot_account)
            )
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_app_name(self, app_name: str) -> List[Task]:
        """
        Get tasks by application name
        """
        try:
            result = await self.db.execute(
                select(Task).where(Task.app_name == app_name)
            )
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_status(self, status: str) -> List[Task]:
        """
        Get tasks by status
        """
        try:
            result = await self.db.execute(
                select(Task).where(Task.status == status)
            )
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def search(
        self,
        search_term: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Task]:
        """
        Search tasks by multiple criteria
        """
        try:
            query = select(Task)

            if search_term:
                query = query.where(
                    or_(
                        Task.task_name.ilike(f"%{search_term}%"),
                        Task.shadow_bot_account.ilike(f"%{search_term}%"),
                        Task.host_ip.ilike(f"%{search_term}%"),
                        Task.app_name.ilike(f"%{search_term}%"),
                    )
                )

            if status:
                query = query.where(Task.status == status)

            query = query.offset(skip).limit(limit)

            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def count_search(
        self,
        search_term: Optional[str] = None,
        status: Optional[str] = None,
    ) -> int:
        """
        Count tasks matching search criteria
        """
        try:
            query = select(func.count(Task.id))

            if search_term:
                query = query.where(
                    or_(
                        Task.task_name.ilike(f"%{search_term}%"),
                        Task.shadow_bot_account.ilike(f"%{search_term}%"),
                        Task.host_ip.ilike(f"%{search_term}%"),
                        Task.app_name.ilike(f"%{search_term}%"),
                    )
                )

            if status:
                query = query.where(Task.status == status)

            result = await self.db.execute(query)
            return result.scalar_one()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_running_tasks(self) -> List[Task]:
        """
        Get all running tasks
        """
        return await self.get_by_status("running")

    async def get_pending_tasks(self) -> List[Task]:
        """
        Get all pending tasks
        """
        return await self.get_by_status("pending")

    async def get_completed_tasks(self) -> List[Task]:
        """
        Get all completed tasks
        """
        return await self.get_by_status("completed")

    async def get_failed_tasks(self) -> List[Task]:
        """
        Get all failed tasks
        """
        return await self.get_by_status("failed")

    async def update_status(
        self,
        id: str,
        status: str,
        last_run_time: Optional[str] = None,
    ) -> Optional[Task]:
        """
        Update task status with optional timestamp
        """
        try:
            update_data = {"status": status}
            if last_run_time:
                update_data["last_run_time"] = last_run_time

            await self.db.execute(
                update(Task).where(Task.id == id).values(**update_data)
            )
            await self.db.commit()

            result = await self.db.execute(
                select(Task).where(Task.id == id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            await self.db.rollback()
            raise
