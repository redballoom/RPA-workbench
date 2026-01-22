"""
SSE API endpoints for real-time event streaming

Event Types:
- log_created: 新建执行日志
- account_updated: 账号状态变更
- task_updated: 任务状态变更
- heartbeat: 心跳保活
"""
import uuid
from fastapi import APIRouter, Depends, Query, Request
from sse_starlette.sse import EventSourceResponse

from app.services.sse_service import get_sse_service, SSEService

router = APIRouter(prefix="/sse", tags=["SSE"])


@router.get("/events")
async def sse_events(
    request: Request,
    account_id: str = Query(default=None, description="可选：只订阅指定账号的事件"),
):
    """
    SSE 事件流端点

    前端连接示例:
    ```javascript
    const eventSource = new EventSource('http://localhost:8888/api/v1/sse/events');

    eventSource.addEventListener('log_created', (event) => {
      const data = JSON.parse(event.data);
      // 处理新日志
    });

    eventSource.addEventListener('account_updated', (event) => {
      const data = JSON.parse(event.data);
      // 更新账号状态
    });

    eventSource.addEventListener('task_updated', (event) => {
      const data = JSON.parse(event.data);
      // 更新任务状态
    });
    ```

    Event Format:
    ```
    event: log_created
    data: {"type": "log_created", "data": {"log_id": "xxx", "account_id": "yyy"}}
    ```
    """
    sse_service = get_sse_service()

    if not sse_service:
        # SSE 服务未初始化，返回错误
        return {"error": "SSE service not available"}

    # 生成客户端 ID
    client_id = str(uuid.uuid4())

    # 添加客户端
    client = await sse_service.add_client(client_id, account_id)

    # 返回事件流
    return EventSourceResponse(
        sse_service.generate_events(client),
        media_type="text/event-stream"
    )


@router.get("/status")
async def sse_status():
    """获取 SSE 服务状态"""
    sse_service = get_sse_service()

    if not sse_service:
        return {"status": "unavailable", "connected_clients": 0}

    client_count = await sse_service.get_client_count()
    return {
        "status": "running",
        "connected_clients": client_count
    }
