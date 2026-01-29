"""
Webhook API endpoints for external app callbacks (e.g., ShadowBot/影刀)
"""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.execution_log_service import ExecutionLogService
from app.services.account_service import AccountService
from app.services.task_service import TaskService
from app.schemas.common import LogStatus

router = APIRouter(prefix="/webhook", tags=["Webhook"])


class ResultSummary(BaseModel):
    """执行结果汇总"""
    total_items: int = Field(default=0, description="处理总数")
    success_items: int = Field(default=0, description="成功数")
    failed_items: int = Field(default=0, description="失败数")
    error_message: Optional[str] = Field(default=None, description="错误信息")


class WebhookExecutionComplete(BaseModel):
    """
    Webhook payload for execution completion from ShadowBot/影刀

    使用 shadow_bot_account + app_name 定位账号，无需额外 ID
    """
    shadow_bot_account: str = Field(..., min_length=1, description="影刀机器人账号")
    app_name: str = Field(..., min_length=1, description="影刀应用名称")
    status: str = Field(..., description="执行状态: completed / failed / timeout")
    start_time: str = Field(..., description="开始时间")
    end_time: str = Field(..., description="结束时间")
    duration_seconds: float = Field(..., ge=0, description="执行时长（秒）")
    result_summary: Optional[ResultSummary] = Field(default=None, description="执行结果汇总")
    log_info: bool = Field(default=False, description="是否包含详细日志")
    screenshot: bool = Field(default=False, description="是否包含截图")

    # 云端资源 URL
    screenshot_url: Optional[str] = Field(default=None, description="截图云端 OSS URL")
    log_url: Optional[str] = Field(default=None, description="日志云端 OSS URL")


class WebhookResponse(BaseModel):
    """Response for webhook calls"""
    success: bool
    message: str
    log_id: Optional[str] = None
    screenshot_url: Optional[str] = None
    log_url: Optional[str] = None


class HeartbeatPayload(BaseModel):
    """心跳 payload"""
    shadow_bot_account: str = Field(..., description="影刀机器人账号")
    app_name: str = Field(..., description="影刀应用名称")


class ExecutionConfirmRequest(BaseModel):
    """确认请求 payload"""
    shadow_bot_account: str = Field(..., min_length=1, description="影刀机器人账号")
    app_name: str = Field(..., min_length=1, description="影刀应用名称")
    action: str = Field(default="START", description="动作: START / STOP")


@router.post("/confirm", response_model=WebhookResponse)
async def confirm_execution(
    payload: ExecutionConfirmRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    影刀应用确认接口

    监听程序在成功获取控制请求并触发影刀应用后，调用此接口确认。
    此接口用于将任务状态更新为"运行中"。

    Parameters:
        shadow_bot_account: 影刀机器人账号
        app_name: 影刀应用名称
        action: 动作类型 (START / STOP)
    """
    task_service = TaskService(db)
    account_service = AccountService(db)

    try:
        # 根据 action 更新状态
        if payload.action == "START":
            new_status = "running"
        elif payload.action == "STOP":
            new_status = "pending"
        else:
            new_status = payload.action.lower()

        # 更新任务状态
        updated_count = await task_service.update_task_status_by_app(
            shadow_bot_account=payload.shadow_bot_account,
            app_name=payload.app_name,
            new_status=new_status,
        )

        # 获取关联账号并更新状态
        accounts = await account_service.get_accounts_by_shadow_bot(payload.shadow_bot_account)
        for account in accounts:
            await account_service.update_account(
                account.id,
                {
                    "status": new_status,
                    "recent_app": payload.app_name,
                }
            )

        # SSE 广播事件
        from app.main import sse_service
        if sse_service:
            try:
                await sse_service.broadcast({
                    "type": "task_updated",
                    "data": {
                        "shadow_bot_account": payload.shadow_bot_account,
                        "app_name": payload.app_name,
                        "changes": {
                            "status": new_status,
                        }
                    }
                })
            except Exception as sse_error:
                print(f"SSE broadcast error: {sse_error}")

        if updated_count > 0:
            return WebhookResponse(
                success=True,
                message=f"任务状态已更新为 '{new_status}'",
            )
        else:
            return WebhookResponse(
                success=True,
                message="未找到匹配的任务，状态无需更新",
            )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "CONFIRM_ERROR",
                "message": f"Failed to process confirm: {str(e)}",
            },
        )


@router.post("/execution-complete", response_model=WebhookResponse)
async def execution_complete(
    payload: WebhookExecutionComplete,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook endpoint called by ShadowBot/影刀 when execution completes.

    This endpoint:
    1. Creates an execution log entry
    2. Saves screenshot and log content files if provided
    3. Updates the account's recent_app, status, and end_time
    4. Broadcasts SSE event to notify frontend (if SSE service is available)

    Required fields: shadow_bot_account, app_name (used to locate the account)
    """
    log_service = ExecutionLogService(db)
    account_service = AccountService(db)
    task_service = TaskService(db)

    try:
        # 构建日志文本
        result_info = ""
        if payload.result_summary:
            result_info = f" | 成功: {payload.result_summary.success_items}, 失败: {payload.result_summary.failed_items}"
            if payload.result_summary.error_message:
                result_info += f" | 错误: {payload.result_summary.error_message}"

        log_text = f"执行 {payload.app_name} 完成，状态: {payload.status}{result_info}"

        # 获取 host_ip (从关联账号中获取)
        accounts = await account_service.get_accounts_by_shadow_bot(payload.shadow_bot_account)
        host_ip = accounts[0].host_ip if accounts else ""

        # 先创建日志（获取 log_id）
        log = await log_service.create_log(
            text=log_text,
            app_name=payload.app_name,
            shadow_bot_account=payload.shadow_bot_account,
            status=payload.status,
            start_time=payload.start_time,
            end_time=payload.end_time,
            duration=payload.duration_seconds,
            host_ip=host_ip,
            log_info=payload.log_info,
            screenshot=payload.screenshot,
        )

        log_id = log.id

        # 保存云端资源 URL
        screenshot_path = None
        log_content_path = None

        if payload.screenshot_url:
            screenshot_path = payload.screenshot_url
            await log_service.update_log(log_id, {"screenshot_path": screenshot_path})

        if payload.log_url:
            log_content_path = payload.log_url
            await log_service.update_log(log_id, {"log_content": payload.log_url})

        # Update account's recent_app, status, and end_time
        for account in accounts:
            await account_service.update_account(
                account.id,
                {
                    "recent_app": payload.app_name,
                    "status": payload.status,
                    "end_time": payload.end_time,
                }
            )

        # 【核心修复】更新对应任务的状态为 pending
        # 根据 shadow_bot_account + app_name 查找并更新任务状态
        task_status = "pending" if payload.status in ["completed", "failed"] else payload.status
        await task_service.update_task_status_by_app(
            shadow_bot_account=payload.shadow_bot_account,
            app_name=payload.app_name,
            new_status=task_status,
        )

        # SSE 广播事件 (如果 SSE 服务已注册)
        from app.main import sse_service
        if sse_service:
            try:
                await sse_service.broadcast({
                    "type": "log_created",
                    "data": {
                        "log_id": log.id,
                        "shadow_bot_account": payload.shadow_bot_account,
                        "app_name": payload.app_name,
                        "status": payload.status,
                    }
                })

                # 同时发送账号更新事件
                for account in accounts:
                    await sse_service.broadcast({
                        "type": "account_updated",
                        "data": {
                            "account_id": account.id,
                            "shadow_bot_account": payload.shadow_bot_account,
                            "changes": {
                                "recent_app": payload.app_name,
                                "status": payload.status,
                                "end_time": payload.end_time,
                            }
                        }
                    })

                # 发送任务更新事件
                await sse_service.broadcast({
                    "type": "task_updated",
                    "data": {
                        "shadow_bot_account": payload.shadow_bot_account,
                        "app_name": payload.app_name,
                        "changes": {
                            "status": task_status,
                        }
                    }
                })
            except Exception as sse_error:
                # SSE 推送失败不影响主流程
                print(f"SSE broadcast error: {sse_error}")

        return WebhookResponse(
            success=True,
            message="执行日志已记录",
            log_id=log_id,
            screenshot_url=screenshot_path,
            log_url=log_content_path,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "WEBHOOK_ERROR",
                "message": f"Failed to process webhook: {str(e)}",
            },
        )


@router.post("/heartbeat", response_model=WebhookResponse)
async def heartbeat(
    payload: HeartbeatPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Heartbeat endpoint to update account's running status.

    Called periodically by ShadowBot while executing.
    """
    account_service = AccountService(db)

    try:
        accounts = await account_service.get_accounts_by_shadow_bot(payload.shadow_bot_account)
        for account in accounts:
            await account_service.update_account(
                account.id,
                {
                    "status": "running",
                    "recent_app": payload.app_name,
                }
            )

        return WebhookResponse(
            success=True,
            message="Heartbeat received",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "HEARTBEAT_ERROR",
                "message": f"Failed to process heartbeat: {str(e)}",
            },
        )
