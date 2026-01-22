"""
Webhook API endpoints for external app callbacks (e.g., ShadowBot/影刀)
"""
from typing import Optional, Dict, Any
from datetime import datetime
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
    start_time: str = Field(..., description="ISO 8601 格式开始时间")
    end_time: str = Field(..., description="ISO 8601 格式结束时间")
    duration_seconds: float = Field(..., ge=0, description="执行时长（秒）")
    result_summary: Optional[ResultSummary] = Field(default=None, description="执行结果汇总")
    log_info: bool = Field(default=False, description="是否包含详细日志")
    screenshot: bool = Field(default=False, description="是否包含截图")


class WebhookResponse(BaseModel):
    """Response for webhook calls"""
    success: bool
    message: str
    log_id: Optional[str] = None


class HeartbeatPayload(BaseModel):
    """心跳 payload"""
    shadow_bot_account: str = Field(..., description="影刀机器人账号")
    app_name: str = Field(..., description="影刀应用名称")


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
    2. Updates the account's recent_app, status, and end_time
    3. Broadcasts SSE event to notify frontend (if SSE service is available)

    Required fields: shadow_bot_account, app_name (used to locate the account)
    """
    log_service = ExecutionLogService(db)
    account_service = AccountService(db)

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

        # Create execution log
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
            except Exception as sse_error:
                # SSE 推送失败不影响主流程
                print(f"SSE broadcast error: {sse_error}")

        return WebhookResponse(
            success=True,
            message="执行日志已记录",
            log_id=log.id if log else None,
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
