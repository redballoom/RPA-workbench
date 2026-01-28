"""
ExecutionLog service - business logic for execution log operations
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.log_repository import ExecutionLogRepository
from app.schemas.execution_log import ExecutionLogResponse
from app.schemas.common import LogStatus


class ExecutionLogService:
    """Service for execution log business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ExecutionLogRepository(db)

    async def get_log(self, log_id: str) -> Optional[ExecutionLogResponse]:
        """Get a single execution log by ID"""
        log = await self.repo.get(log_id)
        if log:
            return ExecutionLogResponse.model_validate(log)
        return None

    async def list_logs(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        app_name: Optional[str] = None,
        shadow_bot_account: Optional[str] = None,
        host_ip: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """List execution logs with pagination, search, and filtering"""
        skip = (page - 1) * page_size

        # Get items and count
        if search:
            items = await self.repo.search(
                search_term=search,
                status=status,
                skip=skip,
                limit=page_size,
            )
            total = await self.repo.count_search(search_term=search, status=status)
        else:
            items = await self.repo.get_multi(skip=skip, limit=page_size)
            total = await self.repo.count()

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "items": [ExecutionLogResponse.model_validate(item) for item in items],
        }

    async def export_logs(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        app_name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[ExecutionLogResponse]:
        """Export execution logs"""
        # Get all matching logs
        if search:
            items = await self.repo.search(
                search_term=search,
                status=status,
                skip=0,
                limit=10000,
            )
        else:
            items = await self.repo.get_multi(skip=0, limit=10000)

        return [ExecutionLogResponse.model_validate(item) for item in items]

    async def get_log_stats(self) -> Dict[str, int]:
        """Get log statistics by status"""
        stats = {}
        for status in LogStatus:
            logs = await self.repo.get_by_status(status.value)
            stats[status.value] = len(logs)
        return stats

    async def get_total_count(self) -> int:
        """Get total log count"""
        return await self.repo.count()

    async def get_success_rate(self) -> float:
        """Calculate success rate"""
        stats = await self.get_log_stats()
        completed = stats.get(LogStatus.completed.value, 0)
        failed = stats.get(LogStatus.failed.value, 0)
        total = completed + failed
        return (completed / total * 100) if total > 0 else 0

    async def get_daily_stats(
        self,
        start_date: datetime,
        end_date: datetime,
        timezone: str = "Asia/Shanghai",
    ) -> List[Dict[str, Any]]:
        """Get daily statistics for performance trends"""
        return await self.repo.get_daily_stats(
            start_date=start_date,
            end_date=end_date,
            timezone=timezone,
        )

    async def get_recent_logs(self, limit: int = 10) -> List[ExecutionLogResponse]:
        """Get most recent logs"""
        logs = await self.repo.get_recent_logs(limit=limit)
        return [ExecutionLogResponse.model_validate(log) for log in logs]

    async def create_log(
        self,
        text: str,
        app_name: str,
        shadow_bot_account: str,
        status: str,
        start_time: str,
        end_time: str,
        duration: float,
        host_ip: str = "",
        log_info: bool = False,
        screenshot: bool = False,
    ) -> ExecutionLogResponse:
        """Create a new execution log entry"""
        log = await self.repo.create_log(
            text=text,
            app_name=app_name,
            shadow_bot_account=shadow_bot_account,
            status=status,
            start_time=start_time,
            end_time=end_time,
            duration=duration,
            host_ip=host_ip,
            log_info=log_info,
            screenshot=screenshot,
        )
        return ExecutionLogResponse.model_validate(log)

    async def update_log(self, log_id: str, updates: dict) -> bool:
        """Update an execution log entry"""
        return await self.repo.update(log_id, updates)
