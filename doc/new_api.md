# RPA Workbench 后端API接口文档

> **版本**: v1.1.0
> **最后更新**: 2026-01-21
> **状态**: ✅ 生产就绪 (100%功能已验证)
> **更新内容**: 
> - 新增 `task_count` 字段 (绑定任务数)
> - 新增 SSE 实时推送服务
> - 更新 Webhook 接口 (添加 result_summary)
> - 新增 SSE API 端点

---

## 📋 基础信息

### 服务器信息
- **基础URL**: `http://localhost:8888/api/v1`
- **协议**: HTTP
- **数据格式**: JSON
- **编码**: UTF-8

### 通用说明

1. **所有字段名使用 snake_case** (下划线分隔)
   - ✅ 正确: `shadow_bot_account`
   - ❌ 错误: `shadowBotAccount`

2. **分页参数**
   - `page`: 页码 (默认: 1, 最小: 1)
   - `page_size`: 每页数量 (默认: 20, 最大: 100)

3. **状态码**
   - `200`: 成功
   - `201`: 创建成功
   - `204`: 删除成功
   - `400`: 请求参数错误
   - `404`: 资源不存在
   - `422`: 数据验证失败
   - `500`: 服务器内部错误

4. **时间格式**
   - ISO 8601格式: `2026-01-21T14:30:00`
   - 或带时区: `2026-01-21T14:30:00+08:00`

---

## 🏥 系统服务

### 1. 健康检查
```http
GET /health
```

**响应示例 (200)**:
```json
{
    "status": "healthy",
    "database": "connected",
    "version": "1.0.0",
    "sse": "running"
}
```

### 2. API信息
```http
GET /
```

**响应示例 (200)**:
```json
{
    "message": "RPA Workbench Backend API",
    "version": "1.0.0",
    "docs": "/api/v1/docs"
}
```

---

## 👥 账号管理 API

### 1. 获取账号列表

```http
GET /api/v1/accounts
```

**查询参数**:
- `search` (可选): 搜索关键词
- `page` (可选): 页码，默认1
- `page_size` (可选): 每页数量，默认20

**响应示例 (200)**:
```json
{
    "total": 2,
    "page": 1,
    "page_size": 20,
    "total_pages": 1,
    "items": [
        {
            "shadow_bot_account": "test_account_001",
            "host_ip": "192.168.1.100",
            "recent_app": "数据采集流程",
            "id": "1d2f5190-c836-4a11-b690-cd3dfc6dca57",
            "status": "completed",
            "end_time": "2026-01-21T14:30:00",
            "task_control": "test_account_001--192.168.1....",
            "task_count": 3,
            "created_at": "2026-01-21T08:09:05.126114",
            "updated_at": "2026-01-21T08:09:05.126119"
        }
    ]
}
```

### 2. 获取单个账号

```http
GET /api/v1/accounts/{id}
```

**响应示例 (200)**:
```json
{
    "shadow_bot_account": "test_account_001",
    "host_ip": "192.168.1.100",
    "recent_app": "数据采集流程",
    "id": "1d2f5190-c836-4a11-b690-cd3dfc6dca57",
    "status": "completed",
    "end_time": "2026-01-21T14:30:00",
    "task_control": "test_account_001--192.168.1....",
    "task_count": 3,
    "created_at": "2026-01-21T08:09:05.126114",
    "updated_at": "2026-01-21T08:09:05.126119"
}
```

### 3. 创建账号

```http
POST /api/v1/accounts
Content-Type: application/json
```

**请求体**:
```json
{
    "shadow_bot_account": "test_account_001",
    "host_ip": "192.168.1.100",
    "task_control": "test_account_001--192.168.1...."
}
```

**响应示例 (201)**:
```json
{
    "shadow_bot_account": "test_account_001",
    "host_ip": "192.168.1.100",
    "recent_app": null,
    "id": "1d2f5190-c836-4a11-b690-cd3dfc6dca57",
    "status": "pending",
    "end_time": null,
    "task_control": "test_account_001--192.168.1....",
    "task_count": 0,
    "created_at": "2026-01-21T08:09:05.126114",
    "updated_at": "2026-01-21T08:09:05.126119"
}
```

**必填字段**:
- `shadow_bot_account`: 机器人账号名称
- `host_ip`: 主机IP地址
- `task_control`: 任务控制标识 (格式: "账号名--IP....")

### 4. 更新账号

```http
PUT /api/v1/accounts/{id}
Content-Type: application/json
```

**请求体**:
```json
{
    "shadow_bot_account": "updated_account_001",
    "host_ip": "192.168.1.100",
    "task_control": "updated_account_001--192.168.1...."
}
```

**响应示例 (200)**:
```json
{
    "shadow_bot_account": "updated_account_001",
    "host_ip": "192.168.1.100",
    "id": "1d2f5190-c836-4a11-b690-cd3dfc6dca57",
    "status": "pending",
    "task_count": 3,
    "created_at": "2026-01-21T08:09:05.126114",
    "updated_at": "2026-01-21T08:10:00.000000"
}
```

### 5. 删除账号

```http
DELETE /api/v1/accounts/{id}
```

**响应示例 (200)**:
```json
{
    "message": "Account deleted successfully",
    "code": "DELETED"
}
```

---

## 📋 任务管理 API

### 1. 获取任务列表

```http
GET /api/v1/tasks
```

**查询参数**:
- `search` (可选): 搜索关键词
- `page` (可选): 页码，默认1
- `page_size` (可选): 每页数量，默认20

**响应示例 (200)**:
```json
{
    "total": 4,
    "page": 1,
    "page_size": 20,
    "total_pages": 1,
    "items": [
        {
            "id": "93d88a3a-18a9-44f9-a781-92e3d603f69b",
            "task_name": "updated_account_001-云仓收藏",
            "shadow_bot_account": "updated_account_001",
            "host_ip": "192.168.1.100",
            "app_name": "云仓收藏",
            "last_run_time": null,
            "status": "pending",
            "config_file": false,
            "config_info": false,
            "trigger_time": null,
            "created_at": "2026-01-21T08:00:00.000000",
            "updated_at": "2026-01-21T08:00:00.000000"
        }
    ]
}
```

### 2. 获取单个任务

```http
GET /api/v1/tasks/{id}
```

**响应示例 (200)**:
```json
{
    "id": "93d88a3a-18a9-44f9-a781-92e3d603f69b",
    "task_name": "updated_account_001-云仓收藏",
    "shadow_bot_account": "updated_account_001",
    "host_ip": "192.168.1.100",
    "app_name": "云仓收藏",
    "last_run_time": null,
    "status": "pending",
    "config_file": false,
    "config_info": false,
    "trigger_time": null,
    "created_at": "2026-01-21T08:00:00.000000",
    "updated_at": "2026-01-21T08:00:00.000000"
}
```

### 3. 创建任务

```http
POST /api/v1/tasks
Content-Type: application/json
```

**请求体**:
```json
{
    "task_name": "service_test_bot-云仓收藏",
    "shadow_bot_account": "service_test_bot",
    "host_ip": "192.168.1.200",
    "app_name": "云仓收藏"
}
```

**响应示例 (201)**:
```json
{
    "id": "new-task-id-uuid",
    "task_name": "service_test_bot-云仓收藏",
    "shadow_bot_account": "service_test_bot",
    "host_ip": "192.168.1.200",
    "app_name": "云仓收藏",
    "last_run_time": null,
    "status": "pending",
    "config_file": false,
    "config_info": false,
    "trigger_time": null,
    "created_at": "2026-01-21T08:15:00.000000",
    "updated_at": "2026-01-21T08:15:00.000000"
}
```

**必填字段**:
- `task_name`: 任务名称
- `shadow_bot_account`: 关联的机器人账号
- `host_ip`: 主机IP地址
- `app_name`: 应用名称

**自动同步**:
- 创建任务后，系统会自动更新关联账号的 `task_count` 字段

### 4. 更新任务

```http
PUT /api/v1/tasks/{id}
Content-Type: application/json
```

**请求体**:
```json
{
    "task_name": "updated_task_name",
    "shadow_bot_account": "updated_account",
    "host_ip": "192.168.1.200",
    "app_name": "updated_app_name",
    "config_file": true,
    "config_info": false
}
```

**响应示例 (200)**:
```json
{
    "id": "task-id",
    "task_name": "updated_task_name",
    "shadow_bot_account": "updated_account",
    "host_ip": "192.168.1.200",
    "app_name": "updated_app_name",
    "last_run_time": null,
    "status": "pending",
    "config_file": true,
    "config_info": false,
    "trigger_time": null,
    "created_at": "2026-01-21T08:00:00.000000",
    "updated_at": "2026-01-21T08:20:00.000000"
}
```

### 5. 删除任务

```http
DELETE /api/v1/tasks/{id}
```

**响应示例 (200)**:
```json
{
    "message": "Task deleted successfully",
    "code": "DELETED"
}
```

**自动同步**:
- 删除任务后，系统会自动更新关联账号的 `task_count` 字段

### 6. 启动任务

```http
POST /api/v1/tasks/{id}/start
```

**响应示例 (200)**:
```json
{
    "success": true,
    "message": "Task started successfully",
    "task_id": "93d88a3a-18a9-44f9-a781-92e3d603f69b",
    "status": "running"
}
```

### 7. 停止任务

```http
POST /api/v1/tasks/{id}/stop
```

**响应示例 (200)**:
```json
{
    "success": true,
    "message": "Task stopped successfully",
    "task_id": "93d88a3a-18a9-44f9-a781-92e3d603f69b",
    "status": "pending"
}
```

---

## 📊 执行日志 API

### 1. 获取日志列表

```http
GET /api/v1/logs
```

**查询参数**:
- `search` (可选): 搜索关键词
- `status` (可选): 状态筛选 (`completed`, `failed`, `running`)
- `page` (可选): 页码，默认1
- `page_size` (可选): 每页数量，默认20

**响应示例 (200)**:
```json
{
    "total": 5,
    "page": 1,
    "page_size": 20,
    "total_pages": 1,
    "items": [
        {
            "text": "云仓收藏执行完成 | 成功: 148, 失败: 2 | 错误: 2条数据格式错误",
            "app_name": "云仓收藏",
            "shadow_bot_account": "service_test_bot",
            "status": "completed",
            "start_time": "2026-01-21T14:30:00",
            "end_time": "2026-01-21T16:30:00",
            "duration": 120.5,
            "host_ip": "192.168.1.200",
            "log_info": true,
            "screenshot": false,
            "id": "7025b4f6-802f-4bc3-a32a-46c52231e4d9",
            "created_at": "2026-01-21T16:30:00"
        }
    ]
}
```

### 2. 导出日志

```http
GET /api/v1/logs/export
```

**响应示例 (200)**:
- 返回CSV格式文件
- 包含所有日志字段
- 文件名格式: `execution_logs_YYYY-MM-DD.csv`

---

## 📈 仪表盘 API

### 1. 获取统计数据

```http
GET /api/v1/dashboard/stats
```

**响应示例 (200)**:
```json
{
    "accounts": {
        "total": 2,
        "by_status": {
            "pending": 1,
            "completed": 1,
            "running": 0
        }
    },
    "tasks": {
        "total": 4,
        "by_status": {
            "pending": 3,
            "completed": 0,
            "running": 0,
            "failed": 0
        }
    },
    "execution_logs": {
        "total": 5,
        "by_status": {
            "completed": 5,
            "failed": 0,
            "running": 0
        },
        "success_rate": 100.0
    },
    "generated_at": "2026-01-21T08:10:24.195676"
}
```

### 2. 获取性能趋势

```http
GET /api/v1/dashboard/performance
```

**查询参数**:
- `days` (可选): 查询天数，默认7天，最大365天

**响应示例 (200)**:
```json
{
    "period": "last_7_days",
    "dailyStats": [
        {
            "date": "2026-01-21",
            "totalExecutions": 2,
            "completed": 2,
            "failed": 0,
            "avgDuration": 120.5
        }
    ],
    "totalExecutions": 5,
    "completionRate": 1.0,
    "avgDuration": 120.5
}
```

---

## 🔔 Webhook API (影刀回调)

### 1. 执行完成回调

```http
POST /api/v1/webhook/execution-complete
Content-Type: application/json
```

**请求体**:
```json
{
    "shadow_bot_account": "service_test_bot",
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

**请求体字段说明**:

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

**响应示例 (200)**:
```json
{
    "success": true,
    "message": "执行日志已记录",
    "log_id": "7025b4f6-802f-4bc3-a32a-46c52231e4d9"
}
```

**后端处理**:
1. 创建执行日志
2. 更新账号状态 (recent_app, status, end_time)
3. 广播 SSE 事件通知前端刷新

### 2. 心跳检测

```http
POST /api/v1/webhook/heartbeat
Content-Type: application/json
```

**请求体**:
```json
{
    "shadow_bot_account": "service_test_bot",
    "app_name": "数据采集流程"
}
```

**响应示例 (200)**:
```json
{
    "success": true,
    "message": "Heartbeat received"
}
```

---

## 🔄 SSE 实时推送 API

### 1. SSE 事件流

```http
GET /api/v1/sse/events
```

**查询参数**:
- `account_id` (可选): 只订阅指定账号的事件

**事件类型**:

| 事件类型 | 说明 | 数据格式 |
|---------|------|---------|
| `log_created` | 新建执行日志 | `{"log_id": "xxx", "account_id": "yyy", "app_name": "zzz", "status": "completed"}` |
| `account_updated` | 账号状态变更 | `{"account_id": "xxx", "shadow_bot_account": "yyy", "changes": {...}}` |
| `task_updated` | 任务状态变更 | `{"task_id": "xxx", "changes": {...}}` |
| `heartbeat` | 心跳保活 | `{"type": "heartbeat", "timestamp": "2026-01-21T10:00:00Z"}` |

**响应示例 (200)**:
```
event: log_created
data: {"type":"log_created","data":{"log_id":"xxx","account_id":"yyy","app_name":"zzz"}}

event: account_updated
data: {"type":"account_updated","data":{"account_id":"yyy","changes":{"status":"completed"}}}

event: heartbeat
data: {"type":"heartbeat","timestamp":"2026-01-21T10:00:00Z"}
```

**Content-Type**: `text/event-stream`

### 2. SSE 服务状态

```http
GET /api/v1/sse/status
```

**响应示例 (200)**:
```json
{
    "status": "running",
    "connected_clients": 5
}
```

### 3. 前端使用示例

```typescript
// 连接 SSE
const eventSource = new EventSource('http://localhost:8888/api/v1/sse/events');

eventSource.addEventListener('log_created', (event) => {
  const data = JSON.parse(event.data);
  console.log('新日志:', data.data);
  // 刷新日志列表
  loadLogs();
});

eventSource.addEventListener('account_updated', (event) => {
  const data = JSON.parse(event.data);
  console.log('账号更新:', data.data);
  // 刷新账号列表
  loadAccounts();
});

eventSource.addEventListener('task_updated', (event) => {
  const data = JSON.parse(event.data);
  console.log('任务更新:', data.data);
  // 刷新任务列表
  loadTasks();
});

eventSource.addEventListener('heartbeat', (event) => {
  // 心跳，保持连接活跃
});

// 错误处理
eventSource.onerror = (error) => {
  console.error('SSE 连接错误:', error);
  // 可选：实现自动重连
};
```

---

## 🔧 前端集成指南

### 1. 基础配置

**环境变量** (创建 `frontend/.env`):
```bash
VITE_API_BASE_URL=http://localhost:8888/api/v1
```

### 2. 字段映射

**前端 TypeScript 接口定义**:
```typescript
// 统一使用 snake_case
interface Account {
  id: string;
  shadow_bot_account: string;   // 机器人账号名称
  host_ip: string;             // 主机IP
  recent_app: string | null;   // 最近应用
  status: 'pending' | 'completed' | 'running';
  end_time: string | null;
  task_control: string;        // 任务控制标识
  task_count: number;          // 绑定任务数 (新增)
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  task_name: string;           // 任务名称
  shadow_bot_account: string;  // 机器人账号
  host_ip: string;             // 主机IP
  app_name: string;            // 应用名称
  last_run_time: string | null;
  status: 'pending' | 'completed' | 'running' | 'failed';
  config_file: boolean;
  config_info: boolean;
  trigger_time: string | null;
  created_at: string;
  updated_at: string;
}

interface ExecutionLog {
  id: string;
  text: string;
  app_name: string;
  shadow_bot_account: string;
  status: 'completed' | 'failed' | 'running';
  start_time: string;
  end_time: string;
  duration: number;            // 秒
  host_ip: string;
  log_info: boolean;
  screenshot: boolean;
  created_at: string;
}
```

### 3. SSE 实时更新

```typescript
// hooks/useSSE.ts
import { useEffect, useCallback, useState } from 'react';

export function useSSE() {
  const [connected, setConnected] = useState(false);

  const connect = useCallback((onEvent: (event: any) => void) => {
    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_BASE_URL}/sse/events`
    );

    eventSource.onopen = () => {
      setConnected(true);
      console.log('SSE 连接已建立');
    };

    eventSource.addEventListener('log_created', (e) => {
      onEvent({ type: 'log_created', data: JSON.parse(e.data) });
    });

    eventSource.addEventListener('account_updated', (e) => {
      onEvent({ type: 'account_updated', data: JSON.parse(e.data) });
    });

    eventSource.addEventListener('task_updated', (e) => {
      onEvent({ type: 'task_updated', data: JSON.parse(e.data) });
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => eventSource.close();
  }, []);

  return { connected, connect };
}

// 使用示例
function AccountManagement() {
  const { connect } = useSSE();

  useEffect(() => {
    const cleanup = connect((event) => {
      if (event.type === 'log_created') {
        loadAccounts();  // 刷新账号列表
        loadLogs();      // 刷新日志列表
      }
      if (event.type === 'account_updated') {
        loadAccounts();  // 刷新账号列表
      }
    });

    loadAccounts();
    return cleanup;
  }, [connect]);

  // ...
}
```

### 4. API调用示例

```typescript
// 获取账号列表 (包含 task_count)
const fetchAccounts = async (page = 1, pageSize = 20) => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/accounts?page=${page}&page_size=${pageSize}`
  );
  return response.json();
};

// 创建任务 (自动同步 task_count)
const createTask = async (taskData: {
  task_name: string;
  shadow_bot_account: string;
  host_ip: string;
  app_name: string;
}) => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tasks`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    }
  );
  return response.json();
};

// 发送 Webhook (影刀回调)
const sendWebhook = async (data: {
  shadow_bot_account: string;
  app_name: string;
  status: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
}) => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/webhook/execution-complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return response.json();
};
```

---

## ⚠️ 重要注意事项

### 1. 字段命名规范
- **必须使用 snake_case**: `shadow_bot_account`, `host_ip`, `task_name`
- **禁止使用 camelCase**: `shadowBotAccount`, `hostIp`, `taskName`

### 2. task_count 自动同步
- 创建/删除任务时，后端会自动更新关联账号的 `task_count`
- 前端只需在账号列表中展示该字段，无需手动计算

### 3. Webhook 定位方式
- 使用 `shadow_bot_account` + `app_name` 定位账号
- 无需传递 `account_id`，后端自动关联

### 4. SSE 使用
- SSE 连接是长连接，刷新页面会断开
- 建议实现自动重连机制
- 心跳间隔 30 秒

### 5. 分页参数
- 使用 `page` 和 `page_size` (下划线)
- 不是 `page` 和 `pageSize`

### 6. 状态枚举

**账号状态**:
- `pending`: 等待中
- `running`: 运行中
- `completed`: 已完成

**任务状态**:
- `pending`: 等待中
- `running`: 运行中
- `completed`: 已完成
- `failed`: 失败

**日志状态**:
- `running`: 运行中
- `completed`: 已完成
- `failed`: 失败

### 7. 时间格式
- 所有时间字段使用 ISO 8601 格式
- 示例: `2026-01-21T14:30:00` 或 `2026-01-21T14:30:00+08:00`

---

## 📝 常见问题

### Q1: task_count 如何自动更新？
**A**: 后端在 `create_task` 和 `delete_task` 时自动调用 `_sync_task_count` 方法更新。

### Q2: 如何实现实时更新？
**A**: 使用 SSE API (`GET /api/v1/sse/events`)，前端监听 `log_created`、`account_updated` 等事件。

### Q3: Webhook 如何定位账号？
**A**: 通过 `shadow_bot_account` 字段定位，后端自动关联所有匹配的账号。

### Q4: 如何处理分页？
**A**: 使用 `page` 和 `page_size` 参数，响应中包含分页信息。

### Q5: 如何实现搜索？
**A**: 在 GET 请求中添加 `search` 参数，后端会在多个字段中模糊匹配。

---

## 🧪 测试验证

### API测试命令

**获取账号列表 (含 task_count)**:
```bash
curl "http://localhost:8888/api/v1/accounts"
```

**创建任务 (自动同步 task_count)**:
```bash
curl -X POST "http://localhost:8888/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "task_name": "test_task",
    "shadow_bot_account": "service_test_bot",
    "host_ip": "192.168.1.200",
    "app_name": "test_app"
  }'
```

**发送 Webhook 回调**:
```bash
curl -X POST "http://localhost:8888/api/v1/webhook/execution-complete" \
  -H "Content-Type: application/json" \
  -d '{
    "shadow_bot_account": "tygj001",
    "app_name": "云仓收藏_52-v1",
    "status": "completed",
    "start_time": "2026-01-22T9:00:00Z",
    "end_time": "2026-01-22T9:35:30Z",
    "duration_seconds": 2400,
    "result_summary": {},
    "log_info": true,
    "screenshot": false
  }'
```

**获取 SSE 状态**:
```bash
curl "http://localhost:8888/api/v1/sse/status"
```

**健康检查 (含 SSE 状态)**:
```bash
curl "http://localhost:8888/health"
```

---

## ✅ 验收标准

前端集成完成后应验证:

- [ ] 所有API调用返回正确状态码
- [ ] 字段名完全匹配API规范 (snake_case)
- [ ] 账号列表显示 `task_count` 字段
- [ ] 创建/删除任务后 `task_count` 自动更新
- [ ] SSE 连接正常，事件推送成功
- [ ] 分页功能正常工作
- [ ] 搜索功能正常工作
- [ ] 状态更新功能正常
- [ ] Webhook 回调正常
- [ ] 错误处理完善
- [ ] 无TypeScript类型错误
- [ ] 跨页面数据同步正常

---

**文档版本**: v1.1.0
**API状态**: ✅ 生产就绪
**最后更新**: 2026-01-21
**新增功能**: 
- `task_count` 字段 (绑定任务数)
- SSE 实时推送服务
- Webhook result_summary 字段
