"""
Task service - business logic for task operations
"""
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.task_repository import TaskRepository
from app.repositories.account_repository import AccountRepository
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskStartResponse, TaskStopResponse
from app.schemas.common import TaskStatus


class TaskService:
    """Service for task business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TaskRepository(db)
        self.account_repo = AccountRepository(db)

    async def _send_control_request(
        self,
        backend_ip: str,
        backend_port: int,
        task_name: str,
        target: str,
    ) -> Tuple[bool, str]:
        """
        发送内网穿透控制请求

        Returns:
            (success: bool, message: str)
        """
        import httpx
        from app.core.config import settings

        timestamp = int(datetime.utcnow().timestamp())
        params = {
            "backend_ip": backend_ip,
            "backend_port": backend_port,
            "tak": task_name,
            "target": target,
            "timestamp": str(timestamp),
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    settings.INTRANET_PROXY_BASE_URL,
                    params=params,
                    timeout=10.0,
                )
                response.raise_for_status()
                return True, "控制请求发送成功"
        except httpx.RequestError as e:
            return False, f"请求失败: {str(e)}"
        except httpx.HTTPStatusError as e:
            return False, f"HTTP 错误: {e.response.status_code}"

    async def get_task(self, task_id: str) -> Optional[TaskResponse]:
        """Get a single task by ID"""
        task = await self.repo.get(task_id)
        if task:
            return TaskResponse.model_validate(task)
        return None

    async def list_tasks(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        app_name: Optional[str] = None,
        shadow_bot_account: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List tasks with pagination, search, and filtering"""
        skip = (page - 1) * page_size

        # Build filters
        filters = {}
        if status:
            filters["status"] = status
        if app_name:
            filters["app_name"] = app_name
        if shadow_bot_account:
            filters["shadow_bot_account"] = shadow_bot_account

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
            "items": [TaskResponse.model_validate(item) for item in items],
        }

    async def create_task(self, task_in: TaskCreate) -> TaskResponse:
        """Create a new task and sync task_count to associated accounts"""
        task = await self.repo.create(task_in.model_dump())

        # Sync task_count to associated accounts
        await self._sync_task_count(task.shadow_bot_account)

        return TaskResponse.model_validate(task)

    async def update_task(self, task_id: str, task_in: TaskUpdate) -> Optional[TaskResponse]:
        """Update an existing task and sync task_count"""
        task = await self.repo.get(task_id)
        if not task:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NOT_FOUND",
                    "message": f"Task with ID '{task_id}' not found",
                },
            )

        # 记录修改前的账号
        old_shadow_bot_account = task.shadow_bot_account

        # Filter out None values for update
        update_data = {k: v for k, v in task_in.model_dump().items() if v is not None}

        updated_task = await self.repo.update(task_id, update_data)

        # 检查是否修改了 shadow_bot_account
        new_shadow_bot_account = task_in.shadow_bot_account
        if new_shadow_bot_account and new_shadow_bot_account != old_shadow_bot_account:
            # 同步原账号和新账号的 task_count
            await self._sync_task_count(old_shadow_bot_account)
            await self._sync_task_count(new_shadow_bot_account)
            print(f"[更新任务] 账号从 '{old_shadow_bot_account}' 改为 '{new_shadow_bot_account}'")

        return TaskResponse.model_validate(updated_task)

    async def delete_task(self, task_id: str) -> bool:
        """Delete a task and sync task_count to associated accounts"""
        task = await self.repo.get(task_id)
        if not task:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NOT_FOUND",
                    "message": f"Task with ID '{task_id}' not found",
                },
            )

        # Get shadow_bot_account before deletion for sync
        shadow_bot_account = task.shadow_bot_account

        deleted = await self.repo.delete(task_id)

        # Sync task_count after deletion
        if deleted:
            await self._sync_task_count(shadow_bot_account)

        return deleted

    async def start_task(self, task_id: str) -> TaskStartResponse:
        """Start a task - send control request via intranet proxy

        采用确认模式：发送请求后不立即更新状态，等待 /webhook/confirm 确认后再更新
        """
        task = await self.repo.get(task_id)
        if not task:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NOT_FOUND",
                    "message": f"Task with ID '{task_id}' not found",
                },
            )

        if task.status == TaskStatus.running.value:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "TASK_ALREADY_RUNNING",
                    "message": "Task is already running",
                },
            )

        # 获取关联账号的端口信息
        accounts = await self.account_repo.get_by_shadow_bot_account_list(task.shadow_bot_account)
        if not accounts:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "ACCOUNT_NOT_FOUND",
                    "message": f"Account '{task.shadow_bot_account}' not found",
                },
            )

        account = accounts[0]  # 使用第一个匹配的账号

        # 发送内网穿透控制请求
        success, message = await self._send_control_request(
            backend_ip=account.host_ip,
            backend_port=account.port,
            task_name=task.task_name,
            target="START",
        )

        if not success:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=500,
                detail={
                    "code": "CONTROL_REQUEST_FAILED",
                    "message": message,
                },
            )

        # 【确认模式】不立即更新状态，等待 /webhook/confirm 确认
        # 只记录日志
        print(f"[启动请求] 已发送，等待影刀确认: task={task_id}, app={task.app_name}")

        return TaskStartResponse(
            message="启动请求已发送，等待影刀确认",
            task_id=task_id,
            status=TaskStatus.pending,  # 保持 pending 状态，等待确认
        )

    async def stop_task(self, task_id: str) -> TaskStopResponse:
        """Stop a running task - send control request via intranet proxy

        采用确认模式：发送请求后不立即更新状态，等待 /webhook/confirm 确认后再更新
        """
        task = await self.repo.get(task_id)
        if not task:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NOT_FOUND",
                    "message": f"Task with ID '{task_id}' not found",
                },
            )

        if task.status != TaskStatus.running.value:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "TASK_NOT_RUNNING",
                    "message": "Task is not running",
                },
            )

        # 获取关联账号的端口信息
        accounts = await self.account_repo.get_by_shadow_bot_account_list(task.shadow_bot_account)
        if not accounts:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "ACCOUNT_NOT_FOUND",
                    "message": f"Account '{task.shadow_bot_account}' not found",
                },
            )

        account = accounts[0]

        # 发送内网穿透停止请求
        success, message = await self._send_control_request(
            backend_ip=account.host_ip,
            backend_port=account.port,
            task_name=task.task_name,
            target="ALL",
        )

        if not success:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=500,
                detail={
                    "code": "CONTROL_REQUEST_FAILED",
                    "message": message,
                },
            )

        # 【确认模式】不立即更新状态，等待 /webhook/confirm 确认
        print(f"[停止请求] 已发送，等待影刀确认: task={task_id}, app={task.app_name}")

        return TaskStopResponse(
            message="停止请求已发送，等待影刀确认",
            task_id=task_id,
            status=TaskStatus.running,  # 保持 running 状态，等待确认
        )

    async def force_stop_task(self, task_id: str, force: bool = True) -> TaskStopResponse:
        """
        强制停止任务 - 直接更新状态，不等待回调

        Args:
            task_id: 任务 ID
            force: 是否强制模式（默认 True）
        """
        from fastapi import HTTPException

        task = await self.repo.get(task_id)
        if not task:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NOT_FOUND",
                    "message": f"Task with ID '{task_id}' not found",
                },
            )

        if task.status != TaskStatus.running.value:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "TASK_NOT_RUNNING",
                    "message": "Task is not running",
                },
            )

        # 获取关联账号的端口信息
        accounts = await self.account_repo.get_by_shadow_bot_account_list(task.shadow_bot_account)
        account = accounts[0] if accounts else None

        # 可选：发送停止代理请求（即使失败也继续）
        if force and account:
            try:
                await self._send_control_request(
                    backend_ip=account.host_ip,
                    backend_port=account.port,
                    task_name=task.task_name,
                    target="ALL",
                )
                print(f"[强制停止] 代理请求已发送: {task_id}")
            except Exception as e:
                print(f"[强制停止] 代理请求失败（不影响状态更新）: {e}")

        # 直接更新任务状态为 pending
        await self.repo.update(task_id, {"status": TaskStatus.pending.value})
        print(f"[强制停止] 任务状态已更新为 pending: {task_id}")

        # 更新关联账号状态
        if account:
            await self.account_repo.update(
                account.id,
                {
                    "status": TaskStatus.pending.value,
                    "recent_app": task.app_name,
                }
            )
            print(f"[强制停止] 账号状态已更新: {account.shadow_bot_account}")

        # SSE 广播 - 发送任务更新事件
        try:
            from app.services.sse_service import sse_service
            await sse_service.broadcast({
                "type": "task_updated",
                "data": {
                    "shadow_bot_account": task.shadow_bot_account,
                    "app_name": task.app_name,
                    "changes": {"status": "pending"}
                }
            })
            print(f"[强制停止] 已发送 task_updated 事件: {task.shadow_bot_account}")
        except Exception as e:
            print(f"[强制停止] task_updated SSE 广播失败: {e}")

        # 同时发送 account_updated 事件（解决账号管理页面状态不同步问题）
        if account:
            try:
                await sse_service.broadcast({
                    "type": "account_updated",
                    "data": {
                        "account_id": account.id,
                        "shadow_bot_account": account.shadow_bot_account,
                        "changes": {
                            "status": "pending",
                            "recent_app": task.app_name
                        }
                    }
                })
                print(f"[强制停止] 已发送 account_updated 事件: {account.shadow_bot_account}")
            except Exception as e:
                print(f"[强制停止] account_updated 事件广播失败: {e}")

        return TaskStopResponse(
            message="任务已强制停止",
            task_id=task_id,
            status=TaskStatus.pending,
        )

    async def get_task_stats(self) -> Dict[str, int]:
        """Get task statistics by status"""
        stats = {}
        for status in TaskStatus:
            tasks = await self.repo.get_by_status(status.value)
            stats[status.value] = len(tasks)
        return stats

    async def get_total_count(self) -> int:
        """Get total task count"""
        return await self.repo.count()

    async def get_running_tasks(self) -> List[TaskResponse]:
        """Get all running tasks"""
        tasks = await self.repo.get_by_status(TaskStatus.running.value)
        return [TaskResponse.model_validate(task) for task in tasks]

    async def get_pending_tasks(self) -> List[TaskResponse]:
        """Get all pending tasks"""
        tasks = await self.repo.get_by_status(TaskStatus.pending.value)
        return [TaskResponse.model_validate(task) for task in tasks]

    async def _sync_task_count(self, shadow_bot_account: str):
        """
        Sync task_count to all accounts associated with the given shadow_bot_account.

        This method is called when a task is created or deleted to ensure
        the task_count field in accounts table stays synchronized.
        """
        try:
            # Count tasks associated with this shadow_bot_account
            tasks = await self.repo.get_by_shadow_bot_account(shadow_bot_account)
            task_count = len(tasks)

            # Get all accounts with this shadow_bot_account
            accounts = await self.account_repo.get_by_shadow_bot_account_list(shadow_bot_account)

            # Update task_count for each account
            for account in accounts:
                await self.account_repo.update(account.id, {"task_count": task_count})

        except Exception as e:
            # Log error but don't fail the main operation
            print(f"Error syncing task_count: {e}")

    async def update_task_status_by_app(
        self,
        shadow_bot_account: str,
        app_name: str,
        new_status: str,
    ) -> int:
        """
        Update task status by shadow_bot_account and app_name.

        This is called when webhook receives execution-complete event
        to sync task status with actual execution status.

        Returns the number of tasks updated.
        """
        try:
            # Find tasks matching the criteria
            tasks = await self.repo.get_by_shadow_bot_account(shadow_bot_account)
            matching_tasks = [t for t in tasks if t.app_name.lower() == app_name.lower()]

            updated_count = 0
            for task in matching_tasks:
                await self.repo.update(task.id, {"status": new_status})
                updated_count += 1

            if updated_count > 0:
                print(f"Updated {updated_count} task(s) status to '{new_status}' "
                      f"for account '{shadow_bot_account}' app '{app_name}'")

            return updated_count

        except Exception as e:
            print(f"Error updating task status: {e}")
            return 0
