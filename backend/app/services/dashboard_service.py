"""
Dashboard service - business logic for dashboard operations
"""
from typing import Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.account_service import AccountService
from app.services.task_service import TaskService
from app.services.execution_log_service import ExecutionLogService


class DashboardService:
    """Service for dashboard business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.account_service = AccountService(db)
        self.task_service = TaskService(db)
        self.log_service = ExecutionLogService(db)

    async def get_stats(self) -> Dict[str, Any]:
        """
        Get dashboard statistics
        """
        # Account stats
        account_stats = await self.account_service.get_account_stats()

        # Task stats
        task_stats = await self.task_service.get_task_stats()

        # Log stats
        log_stats = await self.log_service.get_log_stats()
        success_rate = await self.log_service.get_success_rate()

        return {
            "accounts": {
                "total": await self.account_service.get_total_count(),
                "by_status": account_stats,
            },
            "tasks": {
                "total": await self.task_service.get_total_count(),
                "by_status": task_stats,
            },
            "execution_logs": {
                "total": await self.log_service.get_total_count(),
                "by_status": log_stats,
                "success_rate": round(success_rate, 2),
            },
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def get_performance_trends(
        self,
        days: int = 7,
        timezone: str = "Asia/Shanghai",
    ) -> Dict[str, Any]:
        """
        Get performance trends over time

        Args:
            days: Number of days to analyze
            timezone: Timezone for grouping ('UTC' or 'Asia/Shanghai')
        """
        # Get date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Get aggregated data (使用北京时间分组)
        daily_stats = await self.log_service.get_daily_stats(
            start_date=start_date,
            end_date=end_date,
            timezone=timezone,
        )

        # Format response
        daily_stats_list = []
        total_executions = 0
        total_completed = 0
        total_failed = 0
        total_duration = 0

        for stat in daily_stats:
            daily_stats_list.append({
                "date": stat["date"],
                "totalExecutions": stat["total"],
                "completed": stat["completed"],
                "failed": stat["failed"],
                "avgDuration": round(stat["avg_duration"], 1) if stat["avg_duration"] else 0,
            })
            total_executions += stat["total"]
            total_completed += stat["completed"]
            total_failed += stat["failed"]
            total_duration += (stat["avg_duration"] or 0) * stat["total"]

        # Calculate overall metrics
        completion_rate = (total_completed / total_executions) if total_executions > 0 else 0
        avg_duration = (total_duration / total_executions) if total_executions > 0 else 0

        return {
            "period": f"last_{days}_days",
            "dailyStats": daily_stats_list,
            "totalExecutions": total_executions,
            "completionRate": round(completion_rate, 2),
            "avgDuration": round(avg_duration, 1),
        }
