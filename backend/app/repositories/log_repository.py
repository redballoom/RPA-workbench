"""
ExecutionLog repository
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc

from app.models.execution_log import ExecutionLog
from app.repositories.base import BaseRepository


class ExecutionLogRepository(BaseRepository[ExecutionLog, dict, dict]):
    """
    ExecutionLog repository for log-specific operations
    """

    def __init__(self, db: AsyncSession):
        super().__init__(ExecutionLog, db)

    async def get_by_shadow_bot_account(self, shadow_bot_account: str) -> List[ExecutionLog]:
        """
        Get logs by shadow bot account name
        """
        try:
            result = await self.db.execute(
                select(ExecutionLog)
                .where(ExecutionLog.shadow_bot_account == shadow_bot_account)
                .order_by(desc(ExecutionLog.start_time))
            )
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_app_name(self, app_name: str) -> List[ExecutionLog]:
        """
        Get logs by application name
        """
        try:
            result = await self.db.execute(
                select(ExecutionLog)
                .where(ExecutionLog.app_name == app_name)
                .order_by(desc(ExecutionLog.start_time))
            )
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_status(self, status: str) -> List[ExecutionLog]:
        """
        Get logs by status
        """
        try:
            result = await self.db.execute(
                select(ExecutionLog)
                .where(ExecutionLog.status == status)
                .order_by(desc(ExecutionLog.start_time))
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
    ) -> List[ExecutionLog]:
        """
        Search logs by multiple criteria
        """
        try:
            query = select(ExecutionLog).order_by(desc(ExecutionLog.start_time))

            if search_term:
                query = query.where(
                    or_(
                        ExecutionLog.text.ilike(f"%{search_term}%"),
                        ExecutionLog.app_name.ilike(f"%{search_term}%"),
                        ExecutionLog.shadow_bot_account.ilike(f"%{search_term}%"),
                        ExecutionLog.host_ip.ilike(f"%{search_term}%"),
                        ExecutionLog.id.ilike(f"%{search_term}%"),
                    )
                )

            if status:
                query = query.where(ExecutionLog.status == status)

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
        Count logs matching search criteria
        """
        try:
            query = select(func.count(ExecutionLog.id))

            if search_term:
                query = query.where(
                    or_(
                        ExecutionLog.text.ilike(f"%{search_term}%"),
                        ExecutionLog.app_name.ilike(f"%{search_term}%"),
                        ExecutionLog.shadow_bot_account.ilike(f"%{search_term}%"),
                        ExecutionLog.host_ip.ilike(f"%{search_term}%"),
                        ExecutionLog.id.ilike(f"%{search_term}%"),
                    )
                )

            if status:
                query = query.where(ExecutionLog.status == status)

            result = await self.db.execute(query)
            return result.scalar_one()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_recent_logs(self, limit: int = 10) -> List[ExecutionLog]:
        """
        Get most recent logs
        """
        try:
            result = await self.db.execute(
                select(ExecutionLog)
                .order_by(desc(ExecutionLog.start_time))
                .limit(limit)
            )
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_total_execution_time(self) -> float:
        """
        Get total execution time across all logs
        """
        try:
            result = await self.db.execute(
                select(func.sum(ExecutionLog.duration))
            )
            total = result.scalar_one()
            return float(total) if total else 0.0
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_time_range(
        self,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
    ) -> List[ExecutionLog]:
        """
        Get logs within a time range
        """
        try:
            query = select(ExecutionLog).order_by(desc(ExecutionLog.start_time))

            if start_time:
                query = query.where(ExecutionLog.start_time >= start_time)

            if end_time:
                query = query.where(ExecutionLog.start_time <= end_time)

            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            await self.db.rollback()
            raise

    async def create_log(
        self,
        text: str,
        app_name: str,
        shadow_bot_account: str,
        status: str,
        start_time: str,
        end_time: str,
        duration: float,
        host_ip: str,
        log_info: bool = False,
        screenshot: bool = False,
    ) -> ExecutionLog:
        """
        Create a new execution log
        """
        try:
            from datetime import datetime

            # Convert string to datetime if needed
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            if isinstance(end_time, str):
                end_time = datetime.fromisoformat(end_time.replace("Z", "+00:00"))

            log_data = {
                "text": text,
                "app_name": app_name,
                "shadow_bot_account": shadow_bot_account,
                "status": status,
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration,
                "host_ip": host_ip,
                "log_info": log_info,
                "screenshot": screenshot,
            }

            db_obj = ExecutionLog(**log_data)
            self.db.add(db_obj)
            await self.db.commit()
            await self.db.refresh(db_obj)
            return db_obj
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_daily_stats(
        self,
        start_date=None,
        end_date=None,
    ) -> List[Dict[str, Any]]:
        """
        Get daily statistics for performance trends
        """
        try:
            from sqlalchemy import text

            # Use SQLite-compatible date formatting with strftime
            query = text("""
                SELECT
                    strftime('%Y-%m-%d', start_time) as date,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    AVG(duration) as avg_duration
                FROM execution_logs
                WHERE start_time >= :start_date AND start_time < :end_date
                GROUP BY strftime('%Y-%m-%d', start_time)
                ORDER BY date
            """)

            result = await self.db.execute(
                query,
                {"start_date": start_date, "end_date": end_date}
            )
            rows = result.fetchall()

            return [
                {
                    "date": row[0] or "",
                    "total": int(row[1]) if row[1] else 0,
                    "completed": int(row[2]) if row[2] else 0,
                    "failed": int(row[3]) if row[3] else 0,
                    "avg_duration": float(row[4]) if row[4] else 0,
                }
                for row in rows
            ]
        except Exception as e:
            await self.db.rollback()
            raise
