# Issue #8 技术分析与解决方案

## 问题概述

用户需要支持通过内网穿透协议远程控制影刀应用执行。当前系统缺少内网穿透 HTTP 请求功能。

---

## 核心问题提取

### 问题一：启动/停止任务时未发起内网穿透请求

**当前状态：**
- `start_task` 和 `stop_task` 只更新数据库状态
- 没有实际调用内网穿透 API

**期望行为：**
- 启动任务时，向 `https://qn-v.xf5920.cn/yingdao?backend_ip=...&backend_port=...&tak=...&target=START&timestamp=...` 发起 GET 请求
- 停止任务时，向相同地址但 `target=ALL` 发起 GET 请求

### 问题二：任务状态同步问题

**核心问题：**
- HTTP 请求成功不等于影刀应用被成功触发
- 网络波动可能导致请求丢失
- 需要一种确认机制来确保状态同步

**解决方案（用户建议）：**
- 加入确认接口，当影刀应用被触发时主动回调确认
- 确认成功才更新数据库状态为"运行中"
- HTTP 请求失败则前端直接报错

---

## 内网穿透协议规范

### 请求格式

```
GET https://qn-v.xf5920.cn/yingdao?backend_ip=192.168.6.52&backend_port=8000&tak=AMZ-GPSR_v2&target=START&timestamp=1768386942
```

### 参数说明

| 参数 | 说明 | 示例值 |
|------|------|--------|
| backend_ip | 目标主机的局域网 IP | 192.168.6.52 |
| backend_port | 目标监听程序的通讯端口 | 8000 |
| tak | 任务唯一标识（Task Name） | AMZ-GPSR_v2 |
| target | START（启动）/ ALL（停止） | START |
| timestamp | 请求发起的时间戳（秒级 UTC） | 1768386942 |

---

## 解决方案

### 架构设计

```
用户点击启动
    ↓
发起 HTTP 请求到内网穿透 API
    ↓
┌─────────────────────────────────────┐
│  监听程序获取请求，触发影刀应用       │
│  影刀应用执行完成后回调 /webhook/confirm  │
└─────────────────────────────────────┘
    ↓
后端更新任务状态为 "运行中"
    ↓
SSE 推送前端更新状态
```

### 步骤一：添加配置管理

**文件：`backend/app/core/config.py`**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 内网穿透配置
    INTRANET_PROXY_BASE_URL: str = "https://qn-v.xf5920.cn/yingdao"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
```

**文件：`backend/.env`**
```
INTRANET_PROXY_BASE_URL=https://qn-v.xf5920.cn/yingdao
```

### 步骤二：修改后端任务服务

**文件：`backend/app/services/task_service.py`**

1. 添加配置读取
2. 添加 HTTP 请求方法
3. 修改 `start_task` 和 `stop_task`

```python
from app.core.config import settings

async def _send_control_request(
    self,
    backend_ip: str,
    backend_port: int,
    task_name: str,
    target: str,
) -> tuple[bool, str]:
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
        "timestamp": timestamp,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                settings.INTRANET_PROXY_BASE_URL,
                params=params,
                timeout=10.0,
            )
            response.raise_for_status()
            return True, "请求发送成功，等待影刀应用确认"
    except httpx.RequestError as e:
        return False, f"请求失败: {str(e)}"
    except httpx.HTTPStatusError as e:
        return False, f"HTTP 错误: {e.response.status_code}"
```

**修改 start_task 方法：**
```python
async def start_task(self, task_id: str) -> TaskStartResponse:
    """启动任务"""
    task = await self.repo.get(task_id)
    # ... 验证逻辑 ...

    # 获取关联账号的端口信息
    account = await self.account_repo.get_by_shadow_bot_account(task.shadow_bot_account)
    if not account:
        raise HTTPException(status_code=404, detail="关联账号不存在")

    # 发送内网穿透请求
    success, message = await self._send_control_request(
        backend_ip=account.host_ip,
        backend_port=account.port,
        task_name=task.task_name,
        target="START",
    )

    if not success:
        raise HTTPException(status_code=500, detail={
            "code": "CONTROL_REQUEST_FAILED",
            "message": message,
        })

    # 不立即更新状态，等待 webhook/confirm 确认
    return TaskStartResponse(
,
        task_id=task_id,
        status=Task        message=messageStatus.pending,  # 保持待启动，等待确认
    )
```

### 步骤三：添加确认接口

**文件：`backend/app/api/v1/webhook.py`**

```python
@router.post("/confirm")
async def confirm_execution(
    data: ExecutionConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    影刀应用确认接口

    监听程序在成功获取控制请求并触发影刀后，调用此接口确认
    """
    service = TaskService(db)
    updated = await service.confirm_task_start(
        shadow_bot_account=data.shadow_bot_account,
        app_name=data.app_name,
    )

    if updated:
        return {"code": "CONFIRMED", "message": "任务状态已更新为运行中"}
    return {"code": "NOT_FOUND", "message": "未找到匹配的任务"}

# 添加请求模型
class ExecutionConfirmRequest(BaseModel):
    shadow_bot_account: str
    app_name: str
```

### 步骤四：修改前端

**文件：`frontend/src/pages/TaskControl.tsx`**

1. 启动任务后显示等待状态
2. 监听 SSE 事件更新状态

---

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `backend/app/core/config.py` | 添加 Settings 类和配置读取 |
| `backend/app/services/task_service.py` | 添加 `_send_control_request`，修改 `start_task`/`stop_task`，添加 `confirm_task_start` |
| `backend/app/api/v1/webhook.py` | 添加 `/webhook/confirm` 接口 |
| `frontend/src/lib/api.ts` | 更新 API 类型 |
| `frontend/src/pages/TaskControl.tsx` | 优化启动/停止交互，显示等待状态 |

---

## 验证方法

1. **配置测试**：
   ```bash
   # 测试配置读取
   python -c "from app.core.config import settings; print(settings.INTRANET_PROXY_BASE_URL)"
   ```

2. **单元测试**：
   - 测试 HTTP 请求方法
   - 测试确认接口

3. **集成测试**：
   - 添加带端口的账号
   - 创建绑定该账号的任务
   - 点击启动按钮
   - 确认发起 HTTP 请求（可使用 mock 服务器验证）
   - 调用 confirm 接口确认
   - 检查任务状态更新

4. **端到端测试**：完整业务流程

---

## 注意事项

1. **端口字段**：账号已有 `port` 字段，启动任务时从关联账号获取
2. **时间戳**：使用 UTC 时间戳（秒级）
3. **确认机制**：监听程序需要实现 confirm 回调
4. **安全性**：
   - 考虑添加签名验证（可选）
   - 确认接口可添加 IP 白名单
