"""
SSE (Server-Sent Events) Service for real-time updates

提供 SSE 实时推送服务，用于：
- 日志创建事件 (log_created)
- 账号状态更新事件 (account_updated)
- 任务状态更新事件 (task_updated)
"""
import asyncio
import json
import logging
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class SSEClient:
    """SSE 客户端连接"""
    client_id: str
    account_id: Optional[str] = None
    queue: asyncio.Queue = field(default_factory=asyncio.Queue)
    connected_at: datetime = field(default_factory=datetime.utcnow)


class SSEService:
    """
    SSE 实时推送服务

    使用示例:
        # 在 main.py 中初始化
        sse_service = SSEService()

        # 在 Webhook 处理中广播事件
        await sse_service.broadcast({
            "type": "log_created",
            "data": {"log_id": "xxx", "account_id": "yyy"}
        })

        # 在前端连接 SSE
        const eventSource = new EventSource('/api/v1/sse/events');
    """

    def __init__(self):
        self._clients: Dict[str, SSEClient] = {}
        self._client_counter = 0
        self._lock = asyncio.Lock()

    async def add_client(self, client_id: str, account_id: Optional[str] = None) -> SSEClient:
        """添加一个新的 SSE 客户端"""
        async with self._lock:
            client = SSEClient(
                client_id=client_id,
                account_id=account_id
            )
            self._clients[client_id] = client
            logger.info(f"SSE client connected: {client_id}, account_id: {account_id}")
            return client

    async def remove_client(self, client_id: str):
        """移除 SSE 客户端"""
        async with self._lock:
            if client_id in self._clients:
                del self._clients[client_id]
                logger.info(f"SSE client disconnected: {client_id}")

    async def get_client_count(self) -> int:
        """获取当前连接的客户端数量"""
        async with self._lock:
            return len(self._clients)

    async def broadcast(self, event: Dict[str, any]):
        """
        广播事件给所有连接的客户端

        Args:
            event: 事件字典，包含 type 和 data 字段
                   例如: {"type": "log_created", "data": {"log_id": "xxx"}}
        """
        event_json = json.dumps(event, default=str)
        disconnected = []

        async with self._lock:
            for client_id, client in self._clients.items():
                try:
                    await client.queue.put(event_json)
                except Exception as e:
                    logger.error(f"Failed to send event to client {client_id}: {e}")
                    disconnected.append(client_id)

        # 清理断开的客户端
        for client_id in disconnected:
            await self.remove_client(client_id)

    async def send_to_account(self, account_id: str, event: Dict[str, any]):
        """
        发送事件给指定账号关联的所有客户端

        Args:
            account_id: 账号ID
            event: 事件字典
        """
        event_json = json.dumps(event, default=str)
        disconnected = []

        async with self._lock:
            for client_id, client in self._clients.items():
                if client.account_id == account_id:
                    try:
                        await client.queue.put(event_json)
                    except Exception as e:
                        logger.error(f"Failed to send event to client {client_id}: {e}")
                        disconnected.append(client_id)

        for client_id in disconnected:
            await self.remove_client(client_id)

    async def generate_events(self, client: SSEClient):
        """
        为指定客户端生成 SSE 事件流

        用于 FastAPI 路由中作为事件源
        """
        try:
            while True:
                try:
                    # 等待新事件，超时后发送心跳
                    event_data = await asyncio.wait_for(
                        client.queue.get(),
                        timeout=30.0  # 30秒心跳间隔
                    )

                    # 解析事件类型
                    event_dict = json.loads(event_data)
                    event_type = event_dict.get("type", "message")

                    yield {
                        "event": event_type,
                        "data": event_data
                    }

                except asyncio.TimeoutError:
                    # 发送心跳保持连接
                    yield {
                        "event": "heartbeat",
                        "data": json.dumps({
                            "type": "heartbeat",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                    }

        except asyncio.CancelledError:
            # 客户端断开连接
            logger.debug(f"SSE event generation cancelled for client {client.client_id}")
        except Exception as e:
            logger.error(f"SSE event generation error: {e}")
        finally:
            await self.remove_client(client.client_id)


# 全局 SSE 服务实例 (在 main.py 中初始化)
_sse_service: Optional[SSEService] = None


def get_sse_service() -> Optional[SSEService]:
    """获取全局 SSE 服务实例"""
    return _sse_service


def set_sse_service(service: SSEService):
    """设置全局 SSE 服务实例"""
    global _sse_service
    _sse_service = service
