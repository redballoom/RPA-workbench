# RPA Workbench 系统设计文档

> 版本: 1.0
> 更新日期: 2026-01-21
> 状态: 已确认

---

## 目录

1. [系统架构](#一系统架构)
2. [影刀应用集成规范](#二影刀应用集成规范)
3. [Webhook 接口设计](#三webhook-接口设计)
4. [SSE 实时推送设计](#四sse-实时推送设计)
5. [前端页面联动逻辑](#五前端页面联动逻辑)
6. [task_count 自动同步机制](#六task_count-自动同步机制)
7. [数据流汇总](#七数据流汇总)
8. [实施清单](#八实施清单)

---

## 一、系统架构

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              RPA Workbench 系统架构                               │
└──────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                              【前端 React 应用】                              │
  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
  │  │  账号管理页  │  │  任务控制页  │  │  执行日志页  │  │      看板           │  │
  │  │             │  │             │  │             │  │                     │  │
  │  │ • 机器人账号 │  │ • 任务列表   │  │ • 日志列表   │  │ • 统计概览         │  │
  │  │ • 主机IP    │  │ • 启动/停止  │  │ • 搜索筛选   │  │ • 性能趋势          │  │
  │  │ • 状态      │  │ • 新增任务   │  │ • 导出CSV   │  │ • 任务分布          │  │
  │  │ • 最近应用  │  │ • 任务数量   │  │             │  │                     │  │
  │  │ • 最后时间  │  │   (联动账号) │  │             │  │                     │  │
  │  │ • 绑定任务数│  │             │  │             │  │                     │  │
  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
  │         │                │                │                      │              │
  │         └────────────────┴────────────────┴──────────────────────┘              │
  │                                    │                                          │
  │                          SSE/WebSocket 实时推送                                 │
  │                                    │                                          │
  └────────────────────────────────────┼────────────────────────────────────────────┘
                                       │
                                       ▼
  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                           【后端 FastAPI 服务】                                   │
  │  ┌─────────────────────────────────────────────────────────────────────────────┐ │
  │  │                         API 接口层                                           │ │
  │  │  /api/v1/accounts  │  /api/v1/tasks  │  /api/v1/logs  │  /api/v1/webhook    │ │
  │  └─────────────────────────────────────────────────────────────────────────────┘ │
  │                                       │                                          │
  │  ┌────────────────────────────────────┼───────────────────────────────────────┐  │
  │  │                         服务层 (Services)                                  │  │
  │  │  AccountService  │  TaskService  │  ExecutionLogService  │  Dashboard    │  │
  │  └────────────────────────────────────┴───────────────────────────────────────┘  │
  │                                       │                                          │
  │  ┌────────────────────────────────────┼───────────────────────────────────────┐  │
  │  │                         仓储层 (Repositories)                             │  │
  │  │  AccountRepository  │  TaskRepository  │  ExecutionLogRepository          │  │
  │  └────────────────────────────────────┴───────────────────────────────────────┘  │
  │                                       │                                          │
  │  ┌────────────────────────────────────┼───────────────────────────────────────┐  │
  │  │                         SSE 事件推送服务                                   │  │
  │  │  当账号/日志/任务状态变更时，向所有订阅者推送事件                          │  │
  │  └─────────────────────────────────────────────────────────────────────────────┘  │
  └───────────────────────────────────────┬────────────────────────────────────────────┘
                                          │
                                          ▼
  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                              【数据库 SQLite】                                    │
  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────────────┐   │
  │  │   accounts  │  │    tasks    │  │           execution_logs                │   │
  │  ├─────────────┤  ├─────────────┤  ├─────────────────────────────────────────┤   │
  │  │ id          │  │ id          │  │ id                                      │   │
  │  │ shadow_bot_ │  │ task_name   │  │ text                                    │   │
  │  │   account   │  │ shadow_bot_ │  │ app_name                                │   │
  │  │ host_ip     │  │   account   │  │ shadow_bot_account                      │   │
  │  │ status      │  │ host_ip     │  │ status                                  │   │
  │  │ recent_app  │  │ app_name    │  │ start_time                              │   │
  │  │ end_time    │  │ status      │  │ end_time                                │   │
  │  │ task_count  │  │ task_count  │  │ duration                                │   │
  │  │ task_control│  │ config_file │  │ host_ip                                 │   │
  │  │ created_at  │  │ config_info │  │ log_info                                │   │
  │  └─────────────┘  │ last_run_time│  │ screenshot                              │   │
  │                   │ trigger_time │  │ created_at                              │   │
  │                   └─────────────┘  └─────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、影刀应用集成规范

### 2.1 影刀流程配置

影刀流程中，在**最后一步**添加「HTTP请求」模块：

```
【HTTP请求模块配置】
URL: http://你的服务器地址/api/v1/webhook/execution-complete
方法: POST
Content-Type: application/json

【请求体JSON】（影刀变量替换）
{
  "shadow_bot_account": "${shadowBotAccount}",
  "app_name": "${appName}",
  "status": "${executionStatus}",
  "start_time": "${startTime}",
  "end_time": "${endTime}",
  "duration_seconds": ${durationSeconds},
  "result_summary": {
    "total_items": ${totalItems},
    "success_items": ${successItems},
    "failed_items": ${failedItems},
    "error_message": "${errorMessage}"
  },
  "log_info": ${includeLogInfo},
  "screenshot": ${includeScreenshot}
}
```

### 2.2 影刀变量说明

| 变量名 | 来源 | 说明 |
|-------|------|------|
| `shadowBotAccount` | RPA工作bench任务配置 | 用户在任务控制页选择账号时传入 |
| `appName` | 影刀应用名称 | 固定不变的应用名称 |
| `executionStatus` | 影刀执行结果 | `completed` / `failed` |
| `startTime` | 影刀流程开始时间 | 流程开始时记录 |
| `endTime` | 影刀当前时间 | 请求时动态获取 |
| `durationSeconds` | 计算值 | (endTime - startTime) / 1000 |
| `result_summary` | 业务数据 | 采集数量、处理结果等 |

### 2.3 影刀端伪代码示例

```javascript
// 影刀流程开始时记录开始时间
var startTime = new Date().toISOString();
setVariable("startTime", startTime);

// ... 业务执行逻辑 ...

// 流程结束时（最后一步）
var endTime = new Date().toISOString();
var durationSeconds = (new Date(endTime) - new Date(startTime)) / 1000;

// 构建请求体
var payload = {
  shadow_bot_account: getVariable("shadowBotAccount"),
  app_name: getVariable("appName"),
  status: hasErrors() ? "failed" : "completed",
  start_time: startTime,
  end_time: endTime,
  duration_seconds: durationSeconds,
  result_summary: {
    total_items: getVariable("totalItems"),
    success_items: getVariable("successItems"),
    failed_items: getVariable("failedItems")
  },
  log_info: true,
  screenshot: false
};

// 发送 HTTP 请求
sendHttpRequest("POST", "http://你的服务器/api/v1/webhook/execution-complete", payload);
```

---

## 三、Webhook 接口设计

### 3.1 请求格式

```
POST /api/v1/webhook/execution-complete
Content-Type: application/json
```

### 3.2 请求体字段说明

```json
{
  "shadow_bot_account": "robot_account_01",
  "app_name": "数据采集流程_v2",
  "status": "completed",
  "start_time": "2026-01-21T10:00:00Z",
  "end_time": "2026-01-21T10:05:30Z",
  "duration_seconds": 330.5,
  "result_summary": {
    "total_items": 150,
    "success_items": 148,
    "failed_items": 2,
    "error_message": "2条数据格式错误"
  },
  "log_info": true,
  "screenshot": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `shadow_bot_account` | string | ✅ | 影刀机器人账号（用于定位账号） |
| `app_name` | string | ✅ | 影刀应用名称 |
| `status` | string | ✅ | 执行状态：`completed` / `failed` |
| `start_time` | string | ✅ | ISO 8601 格式开始时间 |
| `end_time` | string | ✅ | ISO 8601 格式结束时间 |
| `duration_seconds` | number | ✅ | 执行时长（秒） |
| `result_summary` | object | ❌ | 执行结果汇总 |
| `result_summary.total_items` | number | ❌ | 处理总数 |
| `result_summary.success_items` | number | ❌ | 成功数 |
| `result_summary.failed_items` | number | ❌ | 失败数 |
| `result_summary.error_message` | string | ❌ | 错误信息 |
| `log_info` | boolean | ✅ | 是否包含详细日志 |
| `screenshot` | boolean | ✅ | 是否包含截图 |

### 3.3 响应格式

**成功响应 (200):**
```json
{
  "success": true,
  "message": "执行日志已记录",
  "log_id": "log_xxx"
}
```

**失败响应 (400/500):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS",
    "message": "无效的status值，仅支持 completed/failed"
  }
}
```

### 3.4 后端处理逻辑

```python
@router.post("/execution-complete", response_model=WebhookResponse)
async def execution_complete(payload: WebhookPayload):
    """
    Webhook 回调处理：
    1. 创建执行日志
    2. 更新账号状态 (recent_app, status, end_time)
    3. SSE 推送事件通知前端刷新
    """
    log_service = ExecutionLogService(db)
    account_service = AccountService(db)

    # 1. 创建执行日志
    log = await log_service.create_log(
        text=f"执行 {payload.app_name} 完成，状态: {payload.status}",
        app_name=payload.app_name,
        shadow_bot_account=payload.shadow_bot_account,
        status=payload.status,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration=payload.duration_seconds,
        host_ip="",  # 可从账号表获取
        log_info=payload.log_info,
        screenshot=payload.screenshot,
    )

    # 2. 更新账号状态
    accounts = await account_service.get_accounts_by_shadow_bot(payload.shadow_bot_account)
    for account in accounts:
        await account_service.update_account(
            account.id,
            {
                "recent_app": payload.app_name,
                "status": payload.status,
                "end_time": payload.end_time,
            }
        )

    # 3. SSE 推送事件
    await sse_service.broadcast({
        "type": "LOG_CREATED",
        "account_id": account.id,
        "log_id": log.id,
        "shadow_bot_account": payload.shadow_bot_account
    })

    return WebhookResponse(
        success=True,
        message="执行日志已记录",
        log_id=log.id
    )
```

---

## 四、SSE 实时推送设计

### 4.1 SSE 事件类型

| 事件类型 | 触发时机 | 前端响应 |
|---------|---------|---------|
| `log_created` | 新建执行日志 | 执行日志页刷新 |
| `account_updated` | 账号状态变更 | 账号管理页刷新 |
| `task_updated` | 任务状态变更 | 任务控制页刷新 |

### 4.2 SSE 接口

```
GET /api/v1/sse/events
```

### 4.3 SSE 事件流格式

```
event: log_created
data: {"type":"log_created","log_id":"xxx","account_id":"yyy"}

event: account_updated
data: {"type":"account_updated","account_id":"yyy","changes":{"status":"completed"}}

event: task_updated
data: {"type":"task_updated","task_id":"zzz","changes":{"status":"pending"}}
```

### 4.4 SSE 服务实现

```python
# backend/app/services/sse_service.py
from typing import Dict, List, Callable
from fastapi import Request
from sse_starlette.sse import EventSourceResponse
import json

class SSEService:
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}

    async def subscribe(self, request: Request, account_id: str = None):
        """订阅 SSE 事件"""
        async def event_generator():
            try:
                while True:
                    # 等待新事件
                    event = await self._wait_for_event(account_id)
                    yield {
                        "event": event["type"],
                        "data": json.dumps(event["data"])
                    }
            except asyncio.CancelledError:
                # 客户端断开连接
                pass

        return EventSourceResponse(event_generator())

    async def broadcast(self, event: Dict):
        """广播事件给所有订阅者"""
        # 实现事件广播逻辑
        pass
```

### 4.5 前端 SSE 连接

```typescript
// frontend/src/lib/sse.ts
import { useEffect, useState, useCallback } from 'react';

const SSE_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888';

interface SSEEvent {
  type: 'log_created' | 'account_updated' | 'task_updated';
  data: any;
}

export function useSSE() {
  const [connected, setConnected] = useState(false);

  const connect = useCallback((onEvent: (event: SSEEvent) => void) => {
    const eventSource = new EventSource(`${SSE_BASE_URL}/api/v1/sse/events`);

    eventSource.onopen = () => {
      setConnected(true);
      console.log('SSE 连接已建立');
    };

    eventSource.addEventListener('log_created', (e) => {
      const data = JSON.parse(e.data);
      onEvent({ type: 'log_created', data });
    });

    eventSource.addEventListener('account_updated', (e) => {
      const data = JSON.parse(e.data);
      onEvent({ type: 'account_updated', data });
    });

    eventSource.addEventListener('task_updated', (e) => {
      const data = JSON.parse(e.data);
      onEvent({ type: 'task_updated', data });
    });

    eventSource.onerror = () => {
      setConnected(false);
      console.error('SSE 连接断开');
      // 可选：实现自动重连
    };

    return () => eventSource.close();
  }, []);

  return { connected, connect };
}
```

---

## 五、前端页面联动逻辑

### 5.1 账号管理页

| 字段 | 更新时机 | 数据来源 |
|-----|---------|---------|
| 机器人账号 | - | 数据库 |
| 主机IP | - | 数据库 |
| 状态 | 收到 `account_updated` 事件 | Webhook 更新 |
| 最近应用 | 收到 `account_updated` 事件 | Webhook 更新 |
| 结束时间 | 收到 `account_updated` 事件 | Webhook 更新 |
| **绑定任务数** | 任务增删时自动计算 | 自动同步 |

### 5.2 任务控制页

| 字段 | 更新时机 | 数据来源 |
|-----|---------|---------|
| 任务名称 | - | 数据库 |
| 机器人账号 | - | 数据库 |
| 主机IP | - | 数据库 |
| 应用名称 | - | 数据库 |
| 状态 | 收到 `task_updated` 事件 | Webhook 更新 |
| 最后运行时间 | 收到 `task_updated` 事件 | Webhook 更新 |
| 操作按钮 | 收到 `task_updated` 事件 | 状态映射 |

### 5.3 执行日志页

| 字段 | 更新时机 | 数据来源 |
|-----|---------|---------|
| 日志列表 | 收到 `log_created` 事件 | Webhook 新增 |

### 5.4 前端使用示例

```tsx
// AccountManagement.tsx
import { useSSE } from '../lib/sse';

export default function AccountManagement() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { connect } = useSSE();

  // SSE 事件处理
  useEffect(() => {
    const cleanup = connect((event) => {
      if (event.type === 'account_updated') {
        // 刷新账号列表
        loadAccounts();
      }
      if (event.type === 'log_created') {
        // 可选：显示新日志通知
        toast.info('收到新的执行日志');
      }
    });

    return cleanup;
  }, [connect]);

  // 初始加载
  useEffect(() => {
    loadAccounts();
  }, []);

  return (
    // ... 组件渲染
  );
}
```

---

## 六、task_count 自动同步机制

### 6.1 数据库模型

```python
# backend/app/models/account.py
class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shadow_bot_account = Column(String(100), nullable=False, index=True)
    host_ip = Column(String(15), nullable=False, index=True)
    status = Column(Enum("pending", "completed", "running", name="account_status"), nullable=False, index=True)
    recent_app = Column(String(100), nullable=True)
    end_time = Column(DateTime, nullable=True)
    task_control = Column(String(100), unique=True, nullable=False, index=True)
    task_count = Column(Integer, default=0, nullable=False, index=True)  # 新增字段
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
```

### 6.2 后端同步逻辑

```python
# backend/app/services/task_service.py
class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TaskRepository(db)
        self.account_repo = AccountRepository(db)

    async def create_task(self, task_in: TaskCreate) -> TaskResponse:
        """创建任务后，自动更新关联账号的 task_count"""
        task = await self.repo.create(task_in.model_dump())

        # ✅ 更新账号的任务数量
        await self._sync_task_count(task.shadow_bot_account)

        return TaskResponse.model_validate(task)

    async def delete_task(self, task_id: str) -> bool:
        """删除任务后，自动更新关联账号的 task_count"""
        task = await self.repo.get(task_id)
        if not task:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail={"code": "NOT_FOUND", "message": "Task not found"}
            )

        shadow_bot_account = task.shadow_bot_account
        deleted = await self.repo.delete(task_id)

        # ✅ 更新账号的任务数量
        await self._sync_task_count(shadow_bot_account)

        return deleted

    async def _sync_task_count(self, shadow_bot_account: str):
        """同步账号的任务数量"""
        # 统计该账号下的任务数量
        tasks = await self.repo.get_by_shadow_bot_account(shadow_bot_account)
        task_count = len(tasks)

        # 更新所有关联账号的 task_count
        accounts = await self.account_repo.get_by_shadow_bot(shadow_bot_account)
        for account in accounts:
            await self.account_repo.update(account.id, {"task_count": task_count})
```

### 6.3 前端展示

```tsx
// AccountManagement.tsx - 账号管理页表格
<tr className="bg-slate-50 dark:bg-slate-800/50">
  <th>机器人账号</th>
  <th>主机IP</th>
  <th>状态</th>
  <th>最近应用</th>
  <th>结束时间</th>
  <th>任务控制</th>
  <th>绑定任务数</th>  {/* 新增列 */}
  <th>操作</th>
</tr>

// 表格体中
<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
  <span className="font-medium">{account.task_count || 0}</span>
  <span className="text-slate-400 ml-1">个任务</span>
</td>
```

---

## 七、数据流汇总

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              【完整数据流】                                      │
└────────────────────────────────────────────────────────────────────────────────┘

  ① 用户在"任务控制页"新增任务
         │
         ▼
  ② 后端创建任务记录 + 调用 _sync_task_count 更新账号的 task_count
         │
         ▼
  ③ 用户点击"启动" → 影刀应用开始执行 (本地运行 3 分钟)
         │
         ▼
  ④ 影刀执行完成 → POST /api/v1/webhook/execution-complete
         │
         ▼
  ⑤ 后端处理：
     ├─ 创建执行日志 (execution_logs 表)
     ├─ 更新账号状态 (recent_app, status, end_time)
     ├─ SSE 广播事件
     └─ 返回成功响应
         │
         ▼
  ⑥ 前端收到 SSE 事件，自动刷新：
     ├─ 账号管理页 → 显示最新状态、最近应用、结束时间
     ├─ 执行日志页 → 显示新增的日志记录
     └─ 任务控制页 → 按钮状态改为"待启动"
         │
         ▼
  ⑦ 闭环完成 ✓
```

---

## 八、实施清单

| 优先级 | 模块 | 任务 | 文件位置 | 状态 |
|-------|------|------|---------|------|
| P0 | 数据库 | 添加 `task_count` 字段到 accounts 表 | `backend/app/models/account.py` | 待开发 |
| P0 | 后端 | 实现 `_sync_task_count` 自动同步 | `backend/app/services/task_service.py` | 待开发 |
| P0 | 后端 | Webhook 接口添加 `result_summary` | `backend/app/api/v1/webhook.py` | 待开发 |
| P0 | 后端 | SSE 实时推送服务 | `backend/app/services/sse_service.py` | 待开发 |
| P0 | 后端 | SSE API 端点 | `backend/app/api/v1/sse.py` | 待开发 |
| P1 | 前端 | 账号管理页添加"绑定任务数"列 | `frontend/src/pages/AccountManagement.tsx` | 待开发 |
| P1 | 前端 | SSE 连接封装 | `frontend/src/lib/sse.ts` | 待开发 |
| P1 | 前端 | SSE 事件监听刷新 (账号管理) | `AccountManagement.tsx` | 待开发 |
| P1 | 前端 | SSE 事件监听刷新 (执行日志) | `ExecutionLogs.tsx` | 待开发 |
| P1 | 前端 | SSE 事件监听刷新 (任务控制) | `TaskControl.tsx` | 待开发 |
| P2 | 文档 | 影刀集成配置指南 | `doc/yingdao-integration-guide.md` | 待开发 |

---

## 九、数据库表结构

### 9.1 accounts 表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | String(36) | 主键 UUID |
| shadow_bot_account | String(100) | 影刀账号 |
| host_ip | String(15) | 主机IP |
| status | Enum | pending/completed/running |
| recent_app | String(100) | 最近执行的应用 |
| end_time | DateTime | 最后结束时间 |
| task_control | String(100) | 任务控制标识 |
| task_count | Integer | 绑定的任务数量 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

### 9.2 tasks 表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | String(36) | 主键 UUID |
| task_name | String(100) | 任务名称 |
| shadow_bot_account | String(100) | 关联的影刀账号 |
| host_ip | String(15) | 主机IP |
| app_name | String(100) | 影刀应用名称 |
| status | Enum | pending/completed/running/failed |
| config_file | Boolean | 配置文件 |
| config_info | Boolean | 配置信息 |
| last_run_time | DateTime | 最后运行时间 |
| trigger_time | DateTime | 触发时间 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

### 9.3 execution_logs 表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | String(36) | 主键 UUID |
| text | Text | 日志文本 |
| app_name | String(100) | 应用名称 |
| shadow_bot_account | String(100) | 影刀账号 |
| status | Enum | completed/failed/running |
| start_time | DateTime | 开始时间 |
| end_time | DateTime | 结束时间 |
| duration | Float | 执行时长（秒） |
| host_ip | String(15) | 主机IP |
| log_info | Boolean | 包含日志信息 |
| screenshot | Boolean | 包含截图 |
| created_at | DateTime | 创建时间 |

---

## 十、API 端点汇总

### 10.1 账号管理

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/v1/accounts | 获取账号列表 |
| GET | /api/v1/accounts/{id} | 获取单个账号 |
| POST | /api/v1/accounts | 创建账号 |
| PUT | /api/v1/accounts/{id} | 更新账号 |
| DELETE | /api/v1/accounts/{id} | 删除账号 |

### 10.2 任务管理

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/v1/tasks | 获取任务列表 |
| GET | /api/v1/tasks/{id} | 获取单个任务 |
| POST | /api/v1/tasks | 创建任务 |
| PUT | /api/v1/tasks/{id} | 更新任务 |
| DELETE | /api/v1/tasks/{id} | 删除任务 |
| POST | /api/v1/tasks/{id}/start | 启动任务 |
| POST | /api/v1/tasks/{id}/stop | 停止任务 |

### 10.3 执行日志

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/v1/logs | 获取日志列表 |
| GET | /api/v1/logs/export | 导出日志 CSV |

### 10.4 仪表盘

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/v1/dashboard/stats | 获取统计数据 |
| GET | /api/v1/dashboard/performance | 获取性能趋势 |

### 10.5 Webhook (影刀回调)

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | /api/v1/webhook/execution-complete | 影刀执行完成回调 |
| POST | /api/v1/webhook/heartbeat | 心跳保活 (可选) |

### 10.6 SSE 实时推送

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/v1/sse/events | SSE 事件流 |

---

## 十一、注意事项

1. **影刀账号定位**：仅通过 `shadow_bot_account` + `app_name` 定位，无需额外 ID
2. **认证预留**：Webhook 接口预留认证字段，暂不实现
3. **SSE 兼容性**：确保服务器支持长连接，某些代理可能需要特殊配置
4. **任务数量同步**：task_count 由后端自动维护，前端只读展示
5. **时区处理**：所有时间使用 ISO 8601 格式 (UTC)

---

*文档版本 1.0 - 2026-01-21*
