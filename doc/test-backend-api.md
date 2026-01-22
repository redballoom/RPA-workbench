# RPA Workbench 后端 API 测试文档

> **文档版本**: v1.0
> **创建日期**: 2026-01-21
> **测试工具**: Postman / curl
> **API Base URL**: http://localhost:8000/api/v1

---

## 1. 快速开始

### 1.1 启动后端服务

```bash
cd /home/redballooon/Desktop/claude_code_projects/RPA-workbench/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 1.2 API 文档

- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc

### 1.3 数据库位置

```
/home/redballooon/Desktop/claude_code_projects/RPA-workbench/backend/app.db
```

---

## 2. 数据库表结构

### 2.1 accounts 表（账号表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | VARCHAR(36) | 主键，UUID格式 |
| shadow_bot_account | VARCHAR(100) | 机器人账号名 |
| host_ip | VARCHAR(15) | 主机IP地址 |
| status | VARCHAR(20) | 状态：pending/completed/running |
| recent_app | VARCHAR(100) | 最近运行的应用 |
| end_time | TIMESTAMP | 结束时间 |
| task_control | VARCHAR(100) | 任务控制标识 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 2.2 tasks 表（任务表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | VARCHAR(36) | 主键，UUID格式 |
| task_name | VARCHAR(200) | 任务名称 |
| shadow_bot_account | VARCHAR(100) | 关联账号 |
| host_ip | VARCHAR(15) | 主机IP |
| app_name | VARCHAR(100) | 应用名称 |
| last_run_time | TIMESTAMP | 最后运行时间 |
| status | VARCHAR(20) | 状态：pending/completed/running/failed |
| config_file | BOOLEAN | 是否有配置文件 |
| config_info | BOOLEAN | 是否有配置信息 |
| trigger_time | TIMESTAMP | 触发时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 2.3 execution_logs 表（执行日志表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | VARCHAR(36) | 主键，UUID格式 |
| text | VARCHAR(255) | 日志文本 |
| app_name | VARCHAR(100) | 应用名称 |
| shadow_bot_account | VARCHAR(100) | 机器人账号 |
| status | VARCHAR(20) | 状态：completed/failed/running |
| start_time | TIMESTAMP | 开始时间 |
| end_time | TIMESTAMP | 结束时间 |
| duration | DECIMAL(10,2) | 执行时长（分钟） |
| host_ip | VARCHAR(15) | 主机IP |
| log_info | BOOLEAN | 是否有日志信息 |
| screenshot | BOOLEAN | 是否有截图 |
| created_at | TIMESTAMP | 创建时间 |

---

## 3. API 端点总览

### 3.1 账号管理模块

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/v1/accounts | 获取账号列表 |
| GET | /api/v1/accounts/{id} | 获取单个账号 |
| POST | /api/v1/accounts | 创建账号 |
| PUT | /api/v1/accounts/{id} | 更新账号 |
| DELETE | /api/v1/accounts/{id} | 删除账号 |

### 3.2 任务控制模块

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/v1/tasks | 获取任务列表 |
| GET | /api/v1/tasks/{id} | 获取单个任务 |
| POST | /api/v1/tasks | 创建任务 |
| PUT | /api/v1/tasks/{id} | 更新任务 |
| DELETE | /api/v1/tasks/{id} | 删除任务 |
| POST | /api/v1/tasks/{id}/start | 启动任务 |
| POST | /api/v1/tasks/{id}/stop | 停止任务 |

### 3.3 执行日志模块

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/v1/logs | 获取日志列表 |
| GET | /api/v1/logs/export | 导出日志 |
| GET | /api/v1/logs/{id} | 获取单个日志 |

### 3.4 仪表盘模块

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/v1/dashboard/stats | 获取统计数据 |
| GET | /api/v1/dashboard/performance | 获取性能趋势 |

### 3.5 Webhook 模块

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/v1/webhook/execution-complete | 执行完成回调 |
| POST | /api/v1/webhook/heartbeat | 心跳检测 |

---

## 4. 账号管理 API 测试

### 4.1 创建账号

**POST** `/api/v1/accounts`

**Request Body:**
```json
{
    "shadowBotAccount": "test_account_001",
    "hostIp": "192.168.1.100"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/v1/accounts" \
  -H "Content-Type: application/json" \
  -d '{"shadowBotAccount": "test_account_001", "hostIp": "192.168.1.100"}'
```

**Postman 设置:**
- Method: POST
- URL: http://localhost:8000/api/v1/accounts
- Headers: Content-Type: application/json
- Body (raw JSON):
```json
{
    "shadowBotAccount": "test_account_001",
    "hostIp": "192.168.1.100"
}
```

**预期响应 (201 Created):**
```json
{
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "shadowBotAccount": "test_account_001",
        "hostIp": "192.168.1.100",
        "status": "pending",
        "recentApp": null,
        "endTime": null,
        "taskControl": "test_account_001--192.168.1....",
        "taskCount": 0,
        "createdAt": "2026-01-21T10:00:00",
        "updatedAt": "2026-01-21T10:00:00"
    },
    "meta": {
        "timestamp": "2026-01-21T10:00:00Z"
    }
}
```

### 4.2 获取账号列表

**GET** `/api/v1/accounts`

**Query Parameters:**
- `page` (optional): 页码，默认 1
- `pageSize` (optional): 每页数量，默认 20
- `search` (optional): 搜索关键词
- `status` (optional): 状态筛选

**cURL:**
```bash
# 获取所有账号
curl "http://localhost:8000/api/v1/accounts"

# 分页获取
curl "http://localhost:8000/api/v1/accounts?page=1&pageSize=10"

# 搜索账号
curl "http://localhost:8000/api/v1/accounts?search=test"

# 按状态筛选
curl "http://localhost:8000/api/v1/accounts?status=pending"
```

**Postman 设置:**
- Method: GET
- URL: http://localhost:8000/api/v1/accounts?page=1&pageSize=10

**预期响应:**
```json
{
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "shadowBotAccount": "test_account_001",
            "hostIp": "192.168.1.100",
            "status": "pending",
            "recentApp": null,
            "endTime": null,
            "taskControl": "test_account_001--192.168.1....",
            "taskCount": 0,
            "createdAt": "2026-01-21T10:00:00",
            "updatedAt": "2026-01-21T10:00:00"
        }
    ],
    "meta": {
        "total": 1,
        "page": 1,
        "pageSize": 20,
        "totalPages": 1,
        "timestamp": "2026-01-21T10:00:00Z"
    },
    "links": {
        "first": "/api/v1/accounts?page=1",
        "prev": null,
        "next": null,
        "last": "/api/v1/accounts?page=1"
    }
}
```

### 4.3 获取单个账号

**GET** `/api/v1/accounts/{id}`

**cURL:**
```bash
curl "http://localhost:8000/api/v1/accounts/550e8400-e29b-41d4-a716-446655440001"
```

**Postman 设置:**
- Method: GET
- URL: http://localhost:8000/api/v1/accounts/550e8400-e29b-41d4-a716-446655440001

**预期响应 (200 OK):**
```json
{
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "shadowBotAccount": "test_account_001",
        "hostIp": "192.168.1.100",
        "status": "pending",
        "recentApp": null,
        "endTime": null,
        "taskControl": "test_account_001--192.168.1....",
        "taskCount": 0,
        "createdAt": "2026-01-21T10:00:00",
        "updatedAt": "2026-01-21T10:00:00"
    },
    "meta": {
        "timestamp": "2026-01-21T10:00:00Z"
    }
}
```

**错误响应 (404 Not Found):**
```json
{
    "error": {
        "code": 404,
        "message": "Account with ID 'not-found-id' not found"
    }
}
```

### 4.4 更新账号

**PUT** `/api/v1/accounts/{id}`

**Request Body:**
```json
{
    "shadowBotAccount": "updated_account_001",
    "hostIp": "192.168.1.200"
}
```

**cURL:**
```bash
curl -X PUT "http://localhost:8000/api/v1/accounts/550e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -d '{"shadowBotAccount": "updated_account_001", "hostIp": "192.168.1.200"}'
```

**Postman 设置:**
- Method: PUT
- URL: http://localhost:8000/api/v1/accounts/550e8400-e29b-41d4-a716-446655440001
- Body (raw JSON):
```json
{
    "shadowBotAccount": "updated_account_001",
    "hostIp": "192.168.1.200"
}
```

**预期响应 (200 OK):**
```json
{
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "shadowBotAccount": "updated_account_001",
        "hostIp": "192.168.1.200",
        "status": "pending",
        "recentApp": null,
        "endTime": null,
        "taskControl": "updated_account_001--192.168.1....",
        "taskCount": 0,
        "createdAt": "2026-01-21T10:00:00",
        "updatedAt": "2026-01-21T10:05:00"
    },
    "meta": {
        "timestamp": "2026-01-21T10:05:00Z"
    }
}
```

### 4.5 删除账号

**DELETE** `/api/v1/accounts/{id}`

**cURL:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/accounts/550e8400-e29b-41d4-a716-446655440001"
```

**Postman 设置:**
- Method: DELETE
- URL: http://localhost:8000/api/v1/accounts/550e8400-e29b-41d4-a716-446655440001

**预期响应 (200 OK):**
```json
{
    "message": "Account deleted successfully",
    "code": "DELETED"
}
```

---

## 5. 任务控制 API 测试

### 5.1 创建任务（需要先创建账号）

**POST** `/api/v1/tasks`

**Request Body:**
```json
{
    "taskName": "test_account_001-云仓收藏",
    "shadowBotAccount": "test_account_001",
    "hostIp": "192.168.1.100",
    "appName": "云仓收藏",
    "configFile": true,
    "configInfo": false
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "test_account_001-云仓收藏",
    "shadowBotAccount": "test_account_001",
    "hostIp": "192.168.1.100",
    "appName": "云仓收藏",
    "configFile": true,
    "configInfo": false
  }'
```

**Postman 设置:**
- Method: POST
- URL: http://localhost:8000/api/v1/tasks
- Body (raw JSON):
```json
{
    "taskName": "test_account_001-云仓收藏",
    "shadowBotAccount": "test_account_001",
    "hostIp": "192.168.1.100",
    "appName": "云仓收藏",
    "configFile": true,
    "configInfo": false
}
```

**预期响应 (201 Created):**
```json
{
    "data": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "taskName": "test_account_001-云仓收藏",
        "shadowBotAccount": "test_account_001",
        "hostIp": "192.168.1.100",
        "appName": "云仓收藏",
        "lastRunTime": null,
        "status": "pending",
        "configFile": true,
        "configInfo": false,
        "triggerTime": null,
        "createdAt": "2026-01-21T10:00:00",
        "updatedAt": "2026-01-21T10:00:00"
    },
    "meta": {
        "timestamp": "2026-01-21T10:00:00Z"
    }
}
```

### 5.2 获取任务列表

**GET** `/api/v1/tasks`

**Query Parameters:**
- `page` (optional): 页码，默认 1
- `pageSize` (optional): 每页数量，默认 20
- `search` (optional): 搜索关键词
- `status` (optional): 状态筛选 (pending/running/completed/failed)
- `appName` (optional): 按应用名筛选
- `shadowBotAccount` (optional): 按账号名筛选

**cURL:**
```bash
# 获取所有任务
curl "http://localhost:8000/api/v1/tasks"

# 筛选运行中的任务
curl "http://localhost:8000/api/v1/tasks?status=running"

# 搜索特定应用
curl "http://localhost:8000/api/v1/tasks?search=云仓"
```

**预期响应:**
```json
{
    "data": [
        {
            "id": "660e8400-e29b-41d4-a716-446655440001",
            "taskName": "test_account_001-云仓收藏",
            "shadowBotAccount": "test_account_001",
            "hostIp": "192.168.1.100",
            "appName": "云仓收藏",
            "lastRunTime": null,
            "status": "pending",
            "configFile": true,
            "configInfo": false,
            "triggerTime": null,
            "createdAt": "2026-01-21T10:00:00",
            "updatedAt": "2026-01-21T10:00:00"
        }
    ],
    "meta": {
        "total": 1,
        "page": 1,
        "pageSize": 20,
        "totalPages": 1,
        "timestamp": "2026-01-21T10:00:00Z"
    },
    "links": {
        "first": "/api/v1/tasks?page=1",
        "prev": null,
        "next": null,
        "last": "/api/v1/tasks?page=1"
    }
}
```

### 5.3 启动任务

**POST** `/api/v1/tasks/{id}/start`

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/v1/tasks/660e8400-e29b-41d4-a716-446655440001/start"
```

**Postman 设置:**
- Method: POST
- URL: http://localhost:8000/api/v1/tasks/660e8400-e29b-41d4-a716-446655440001/start

**预期响应:**
```json
{
    "message": "Task started successfully",
    "taskId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "running"
}
```

**错误响应 - 任务已在运行 (400 Bad Request):**
```json
{
    "error": {
        "code": 400,
        "message": "Task is already running"
    }
}
```

### 5.4 停止任务

**POST** `/api/v1/tasks/{id}/stop`

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/v1/tasks/660e8400-e29b-41d4-a716-446655440001/stop"
```

**Postman 设置:**
- Method: POST
- URL: http://localhost:8000/api/v1/tasks/660e8400-e29b-41d4-a716-446655440001/stop

**预期响应:**
```json
{
    "message": "Task stopped successfully",
    "taskId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "completed"
}
```

### 5.5 更新任务

**PUT** `/api/v1/tasks/{id}`

**Request Body:**
```json
{
    "taskName": "updated_task_name",
    "appName": "更新后的应用名"
}
```

**cURL:**
```bash
curl -X PUT "http://localhost:8000/api/v1/tasks/660e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -d '{"taskName": "updated_task_name", "appName": "更新后的应用名"}'
```

### 5.6 删除任务

**DELETE** `/api/v1/tasks/{id}`

**cURL:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/tasks/660e8400-e29b-41d4-a716-446655440001"
```

---

## 6. 执行日志 API 测试

### 6.1 获取日志列表

**GET** `/api/v1/logs`

**Query Parameters:**
- `page` (optional): 页码，默认 1
- `pageSize` (optional): 每页数量，默认 20
- `search` (optional): 搜索关键词
- `status` (optional): 状态筛选 (completed/failed/running)
- `appName` (optional): 按应用名筛选
- `shadowBotAccount` (optional): 按账号名筛选
- `hostIp` (optional): 按IP筛选
- `startDate` (optional): 开始时间
- `endDate` (optional): 结束时间

**cURL:**
```bash
curl "http://localhost:8000/api/v1/logs?page=1&pageSize=10"
```

**预期响应:**
```json
{
    "data": [
        {
            "id": "770e8400-e29b-41d4-a716-446655440001",
            "text": "Execution of 云仓收藏 completed with status: completed",
            "appName": "云仓收藏",
            "shadowBotAccount": "test_account_001",
            "status": "completed",
            "startTime": "2026-01-21T10:00:00",
            "endTime": "2026-01-21T10:15:00",
            "duration": 15.0,
            "hostIp": "192.168.1.100",
            "logInfo": false,
            "screenshot": false,
            "createdAt": "2026-01-21T10:15:00"
        }
    ],
    "meta": {
        "total": 1,
        "page": 1,
        "pageSize": 20,
        "totalPages": 1,
        "timestamp": "2026-01-21T10:15:00Z"
    },
    "links": {
        "first": "/api/v1/logs?page=1",
        "prev": null,
        "next": null,
        "last": "/api/v1/logs?page=1"
    }
}
```

### 6.2 导出日志

**GET** `/api/v1/logs/export`

**Query Parameters:**
- `search` (optional): 搜索关键词
- `status` (optional): 状态筛选
- `appName` (optional): 按应用名筛选
- `startDate` (optional): 开始时间
- `endDate` (optional): 结束时间

**cURL:**
```bash
curl "http://localhost:8000/api/v1/logs/export" \
  -o execution_logs.csv
```

**Postman 设置:**
- Method: GET
- URL: http://localhost:8000/api/v1/logs/export
- Response: CSV 文件下载

### 6.3 获取单个日志

**GET** `/api/v1/logs/{id}`

**cURL:**
```bash
curl "http://localhost:8000/api/v1/logs/770e8400-e29b-41d4-a716-446655440001"
```

---

## 7. 仪表盘 API 测试

### 7.1 获取统计数据

**GET** `/api/v1/dashboard/stats`

**cURL:**
```bash
curl "http://localhost:8000/api/v1/dashboard/stats"
```

**预期响应:**
```json
{
    "totalAccounts": 5,
    "activeTasks": 2,
    "completedJobs": 127,
    "totalExecutionHours": 842.5
}
```

### 7.2 获取性能趋势

**GET** `/api/v1/dashboard/performance`

**Query Parameters:**
- `days` (optional): 分析天数，默认 7，最大 30

**cURL:**
```bash
# 最近7天趋势
curl "http://localhost:8000/api/v1/dashboard/performance"

# 最近30天趋势
curl "http://localhost:8000/api/v1/dashboard/performance?days=30"
```

**预期响应:**
```json
{
    "period": "last_7_days",
    "dailyStats": [
        {
            "date": "2026-01-21",
            "totalExecutions": 15,
            "completed": 12,
            "failed": 3,
            "avgDuration": 12.5
        },
        {
            "date": "2026-01-20",
            "totalExecutions": 18,
            "completed": 16,
            "failed": 2,
            "avgDuration": 14.2
        }
    ],
    "totalExecutions": 105,
    "completionRate": 0.89,
    "avgDuration": 13.5
}
```

---

## 8. Webhook API 测试

### 8.1 执行完成回调

**POST** `/api/v1/webhook/execution-complete`

**Request Body:**
```json
{
    "shadow_bot_account": "test_account_001",
    "app_name": "云仓收藏",
    "status": "completed",
    "end_time": "2026-01-21T14:30:00",
    "duration": 120.5,
    "log_info": false,
    "screenshot": false
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/v1/webhook/execution-complete" \
  -H "Content-Type: application/json" \
  -d '{
    "shadow_bot_account": "test_account_001",
    "app_name": "云仓收藏",
    "status": "completed",
    "end_time": "2026-01-21T14:30:00",
    "duration": 120.5,
    "log_info": false,
    "screenshot": false
  }'
```

**预期响应:**
```json
{
    "success": true,
    "message": "Execution log created successfully",
    "log_id": "770e8400-e29b-41d4-a716-446655440001"
}
```

### 8.2 心跳检测

**POST** `/api/v1/webhook/heartbeat`

**Query Parameters:**
- `shadow_bot_account`: 账号名
- `app_name`: 应用名

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/v1/webhook/heartbeat?shadow_bot_account=test_account_001&app_name=云仓收藏"
```

**预期响应:**
```json
{
    "success": true,
    "message": "Heartbeat received",
    "log_id": null
}
```

---

## 9. 系统健康检查

### 9.1 健康检查

**GET** `/health`

**cURL:**
```bash
curl "http://localhost:8000/health"
```

**预期响应:**
```json
{
    "status": "healthy",
    "database": "connected",
    "version": "1.0.0"
}
```

### 9.2 根路径

**GET** `/`

**cURL:**
```bash
curl "http://localhost:8000/"
```

**预期响应:**
```json
{
    "message": "RPA Workbench Backend API",
    "version": "1.0.0",
    "docs": "/api/v1/docs"
}
```

---

## 10. 完整测试流程

### 10.1 账号 CRUD 完整测试

```bash
# 1. 创建账号
echo "=== 创建账号 ==="
curl -X POST "http://localhost:8000/api/v1/accounts" \
  -H "Content-Type: application/json" \
  -d '{"shadowBotAccount": "test_user", "hostIp": "192.168.1.100"}'

# 2. 获取账号列表
echo -e "\n=== 获取账号列表 ==="
curl "http://localhost:8000/api/v1/accounts"

# 3. 获取单个账号 (替换为实际ID)
echo -e "\n=== 获取单个账号 ==="
curl "http://localhost:8000/api/v1/accounts/<ACCOUNT_ID>"

# 4. 更新账号
echo -e "\n=== 更新账号 ==="
curl -X PUT "http://localhost:8000/api/v1/accounts/<ACCOUNT_ID>" \
  -H "Content-Type: application/json" \
  -d '{"shadowBotAccount": "updated_user"}'

# 5. 删除账号
echo -e "\n=== 删除账号 ==="
curl -X DELETE "http://localhost:8000/api/v1/accounts/<ACCOUNT_ID>"
```

### 10.2 任务生命周期完整测试

```bash
# 1. 创建账号
ACCOUNT_ID=$(curl -X POST "http://localhost:8000/api/v1/accounts" \
  -H "Content-Type: application/json" \
  -d '{"shadowBotAccount": "lifecycle_test", "hostIp": "192.168.1.100"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
echo "Created account: $ACCOUNT_ID"

# 2. 创建任务
TASK_ID=$(curl -X POST "http://localhost:8000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "lifecycle_test-测试任务",
    "shadowBotAccount": "lifecycle_test",
    "hostIp": "192.168.1.100",
    "appName": "测试任务",
    "configFile": true,
    "configInfo": false
  }' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
echo "Created task: $TASK_ID"

# 3. 查看任务状态
echo -e "\n=== 初始任务状态 ==="
curl "http://localhost:8000/api/v1/tasks/$TASK_ID"

# 4. 启动任务
echo -e "\n=== 启动任务 ==="
curl -X POST "http://localhost:8000/api/v1/tasks/$TASK_ID/start"

# 5. 再次查看任务状态
echo -e "\n=== 启动后任务状态 ==="
curl "http://localhost:8000/api/v1/tasks/$TASK_ID"

# 6. 停止任务
echo -e "\n=== 停止任务 ==="
curl -X POST "http://localhost:8000/api/v1/tasks/$TASK_ID/stop"

# 7. 最终任务状态
echo -e "\n=== 最终任务状态 ==="
curl "http://localhost:8000/api/v1/tasks/$TASK_ID"

# 8. 查看执行日志
echo -e "\n=== 执行日志 ==="
curl "http://localhost:8000/api/v1/logs"

# 9. 查看仪表盘统计
echo -e "\n=== 仪表盘统计 ==="
curl "http://localhost:8000/api/v1/dashboard/stats"

# 10. 清理 - 删除任务
echo -e "\n=== 删除任务 ==="
curl -X DELETE "http://localhost:8000/api/v1/tasks/$TASK_ID"
```

---

## 11. 常见错误处理

### 11.1 错误响应格式

```json
{
    "error": {
        "code": 400,
        "message": "Error description"
    }
}
```

### 11.2 常见错误码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 400 | Bad Request | 请求参数错误 |
| 404 | Not Found | 资源不存在 |
| 422 | Unprocessable Entity | 数据验证失败 |
| 500 | Internal Server Error | 服务器内部错误 |

### 11.3 验证错误示例

**请求:**
```bash
curl -X POST "http://localhost:8000/api/v1/accounts" \
  -H "Content-Type: application/json" \
  -d '{"shadowBotAccount": "", "hostIp": "invalid-ip"}'
```

**响应 (422):**
```json
{
    "detail": [
        {
            "loc": ["body", "shadowBotAccount"],
            "msg": "field required",
            "type": "value_error.missing"
        },
        {
            "loc": ["body", "hostIp"],
            "msg": "Invalid IP address format",
            "type": "value_error"
        }
    ]
}
```

---

## 12. Postman 导入配置

### 12.1 创建 Collection

1. 打开 Postman
2. 点击 "New Collection" → 命名为 "RPA Workbench API"
3. 在 Collection 中创建以下文件夹:
   - Accounts
   - Tasks
   - Logs
   - Dashboard
   - Webhook

### 12.2 环境变量

创建 Postman Environment，添加以下变量:

| 变量名 | 初始值 | 说明 |
|--------|--------|------|
| baseUrl | http://localhost:8000/api/v1 | API 基础地址 |
| accountId | | 账号ID |
| taskId | | 任务ID |

### 12.3 账号管理请求

**创建账号:**
- Method: POST
- URL: {{baseUrl}}/accounts
- Headers: Content-Type: application/json
- Body:
```json
{
    "shadowBotAccount": "{{$randomAlphaNumeric}}",
    "hostIp": "192.168.{{$randomInt 1 255}}.{{$randomInt 1 255}}"
}
```

---

## 13. 备注

### 13.1 当前认证状态

**注意**: 当前 API 暂未启用 JWT 认证，所有端点可直接访问。

### 13.2 数据库位置

```
/home/redballooon/Desktop/claude_code_projects/RPA-workbench/backend/app.db
```

### 13.3 测试数据清理

测试完成后，可使用以下命令重置数据库:

```bash
# 备份原数据库
cp app.db app.db.backup

# 删除数据库重新初始化
rm app.db
# 重启后端服务自动创建新数据库
```

---

**文档结束**

**编制**: Claude Code
**日期**: 2026-01-21
