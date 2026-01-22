# RPA Workbench 后端开发产品需求文档（PRD）

**文档版本**：v1.0
**创建日期**：2026-01-21
**产品名称**：RPA Workbench Backend
**技术栈**：Python FastAPI + SQLite
**文档类型**：Product Requirements Document

---

## 1. 产品概述

### 1.1 产品定位

RPA Workbench是一个**机器人流程自动化（RPA）管理平台**，专注于为企业和开发者提供统一的RPA任务管理解决方案。该平台支持多账号管理、任务调度控制、实时监控和执行日志分析，实现自动化流程的全生命周期管理。

### 1.2 目标用户

- **RPA开发者**：需要快速创建、测试和管理自动化任务
- **运维工程师**：需要监控多个自动化任务的执行状态
- **业务分析师**：需要分析自动化任务的执行效率和成功率
- **系统管理员**：需要管理多个机器人账号和执行环境

### 1.3 核心价值

- **统一管理**：集中管理多个ShadowBot账号和执行主机
- **任务编排**：灵活创建、配置和调度自动化任务
- **实时监控**：通过仪表盘实时查看系统运行状态和性能指标
- **数据洞察**：详细的执行日志分析，帮助优化自动化流程
- **简化操作**：提供直观的Web界面，降低RPA管理门槛

### 1.4 项目状态

- ✅ **前端完成度**：100%（React + TypeScript）
- 🔄 **后端开发**：待开始（FastAPI + SQLite）
- 📋 **接口规格**：已完成（15个API端点）
- 🏗️ **架构设计**：已完成

---

## 2. 业务需求

### 2.1 核心业务流程

#### 流程一：账号管理流程
```
创建账号 → 验证IP格式 → 关联任务统计 → 任务控制标识生成 → 支持任务创建
```

**详细说明**：
1. 用户创建ShadowBot账号
2. 系统验证IP地址格式和唯一性
3. 自动生成任务控制标识（格式：`${账号名}--${IP前11位}....`）
4. 关联统计该账号下的任务数量
5. 支持后续任务创建时选择该账号

#### 流程二：任务生命周期管理
```
创建任务 → 配置验证 → 启动执行 → 状态更新 → 生成日志 → 统计分析
```

**状态流转**：
- `pending` → `running` → `completed` ✅
- `pending` → `failed` ❌
- `running` → `failed` ❌（异常中断）

**关键特性**：
- 任务启动时调用外部控制URL
- 支持配置文件和配置信息标记
- 自动记录启动/结束时间
- 实时更新执行状态

#### 流程三：执行日志分析
```
任务执行 → 记录日志 → 状态筛选 → 多维度搜索 → 导出分析 → 性能优化
```

**分析维度**：
- 时间维度：按执行时长分析（分钟 → 小时）
- 状态维度：成功/失败/运行中
- 账号维度：按ShadowBot账号分组
- 应用维度：按应用名称统计

### 2.2 业务场景

#### 场景A：电商自动化管理
**应用类型**：云仓收藏、财务台账下载
**典型任务**：
- 商品自动收藏（5-15分钟）
- 财务报表自动下载（20-90分钟）

**管理需求**：
- 多账号并行执行
- 实时监控执行进度
- 失败任务自动告警

#### 场景B：跨境电商合规
**应用类型**：AMZ-GPSR自动提交
**典型任务**：
- 合规报告生成（9-12小时）
- 文档自动提交（2-6小时）

**管理需求**：
- 长耗时任务管理
- 批量账号操作
- 执行历史追踪

#### 场景C：多环境测试
**应用类型**：自动化测试任务
**典型任务**：
- 回归测试（30-120分钟）
- 集成测试（2-4小时）

**管理需求**：
- 测试环境隔离
- 结果对比分析
- 性能基准测试

---

## 3. 功能需求

### 3.1 账号管理模块

#### 3.1.1 账号CRUD操作

**功能点**：账号的创建、读取、更新、删除

**需求详述**：
- **创建账号**：支持批量导入和单个添加
- **查询账号**：支持分页、搜索（账号名、IP）
- **更新账号**：支持修改账号名和IP地址
- **删除账号**：级联删除关联任务和日志

**验证规则**：
- 账号名：1-100字符，必填
- IP地址：IPv4格式，必填
- 唯一性：账号名+IP组合唯一

**API端点**：
- `GET /api/v1/accounts` - 列表查询（支持search参数）
- `GET /api/v1/accounts/{id}` - 单个查询
- `POST /api/v1/accounts` - 创建
- `PUT /api/v1/accounts/{id}` - 更新
- `DELETE /api/v1/accounts/{id}` - 删除

#### 3.1.2 账号关联统计

**功能点**：动态计算账号关联的任务数量

**需求详述**：
- 实时统计每个账号下的任务总数
- 按任务状态分类统计（pending/running/completed/failed）
- 支持按状态筛选账号列表

### 3.2 任务控制模块

#### 3.2.1 任务CRUD操作

**功能点**：任务的完整生命周期管理

**需求详述**：
- **创建任务**：关联账号、应用名称、配置选项
- **查询任务**：支持分页、搜索、多字段过滤
- **更新任务**：修改任务配置和应用信息
- **删除任务**：级联删除关联日志

**验证规则**：
- 任务名：1-100字符，必填，格式 `${shadowBotAccount}-${appName}`
- 应用名：1-100字符，必填
- 账号关联：必须存在有效的账号记录
- 配置标记：布尔类型，可选

**API端点**：
- `GET /api/v1/tasks` - 列表查询（支持search、page、pageSize）
- `GET /api/v1/tasks/{id}` - 单个查询
- `POST /api/v1/tasks` - 创建
- `PUT /api/v1/tasks/{id}` - 更新
- `DELETE /api/v1/tasks/{id}` - 删除

#### 3.2.2 任务执行控制

**功能点**：任务的启动和停止操作

**需求详述**：
- **启动任务**：
  - 生成控制URL：`https://qn-v.xf5920.cn/yingdao?backend_ip=${task.hostIp}&tak=${encodeURIComponent(task.appName)}&target=START`
  - 更新任务状态为 `running`
  - 记录启动时间
  - 创建执行日志记录
- **停止任务**：
  - 更新任务状态为 `completed`
  - 记录结束时间
  - 更新执行日志

**验证规则**：
- 仅 `pending` 状态可启动
- 仅 `running` 状态可停止
- 启动前验证账号有效性
- 停止后生成完整日志记录

**API端点**：
- `POST /api/v1/tasks/{id}/start` - 启动任务
- `POST /api/v1/tasks/{id}/stop` - 停止任务

### 3.3 执行日志模块

#### 3.3.1 日志查询分析

**功能点**：多维度执行日志查询和筛选

**需求详述**：
- **日志列表**：支持分页浏览，默认每页20条
- **搜索过滤**：
  - 文本搜索：日志文本、应用名、账号名、IP地址、ID
  - 状态筛选：completed、failed、running
- **数据展示**：
  - 自动格式化执行时长（分钟 → X小时Y分钟）
  - 显示完整时间范围（开始时间、结束时间）
  - 标记日志信息和截图存在性

**API端点**：
- `GET /api/v1/logs` - 列表查询（支持search、status、page、pageSize）
- `GET /api/v1/logs/export` - 导出功能

#### 3.3.2 日志导出

**功能点**：支持日志数据导出

**需求详述**：
- 导出格式：CSV、JSON
- 导出范围：支持筛选条件导出
- 大数据量：支持异步导出和下载

### 3.4 仪表盘统计模块

#### 3.4.1 实时统计数据

**功能点**：系统整体运行状态概览

**需求详述**：
- **核心指标**：
  - 账号总数（Total Accounts）
  - 活跃任务数（Active Tasks）
  - 已完成任务数（Completed Jobs）
  - 总执行时长（Execution Time）
- **性能趋势**：24小时任务执行趋势（面积图）
- **状态分布**：任务状态占比（饼图）
- **最近记录**：最新5条执行日志

**API端点**：
- `GET /api/v1/dashboard/stats` - 统计数据
- `GET /api/v1/dashboard/performance` - 性能趋势

---

## 4. 技术架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     RPA Workbench                           │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                             │
│  - Dashboard  - Account Mgmt  - Task Control  - Logs       │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP API (RESTful)
┌─────────────────────┴───────────────────────────────────────┐
│  Backend (FastAPI + Python 3.12)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ API Layer   │ │ Service     │ │ Repository  │          │
│  │   Routes    │ │   Layer     │ │   Layer     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────┬───────────────────────────────────────┘
                      │ SQLAlchemy ORM
┌─────────────────────┴───────────────────────────────────────┐
│  Database (SQLite)                                         │
│  - accounts  - tasks  - execution_logs  - users             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 后端技术栈

| 类别 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| **Web框架** | FastAPI | 0.110+ | 高性能异步API框架 |
| **数据库** | SQLite | 3.45+ | 零配置嵌入式数据库 |
| **ORM** | SQLAlchemy | 2.0+ | Python主流ORM |
| **数据验证** | Pydantic | 2.6+ | 数据序列化和验证 |
| **认证** | PyJWT | 2.8+ | JWT令牌认证 |
| **迁移工具** | Alembic | 1.13+ | 数据库版本管理 |
| **文档** | OpenAPI | 3.0+ | 自动生成API文档 |
| **测试** | pytest | 8.0+ | 单元测试框架 |
| **代码质量** | ruff | 0.1+ | 代码检查和格式化 |

### 4.3 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI应用入口
│   ├── core/                        # 核心配置
│   │   ├── __init__.py
│   │   ├── config.py                # 环境配置
│   │   ├── database.py              # 数据库配置
│   │   └── security.py               # 安全认证
│   ├── api/                         # API路由
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── accounts.py           # 账号管理API
│   │       ├── tasks.py              # 任务控制API
│   │       ├── logs.py               # 执行日志API
│   │       └── dashboard.py          # 仪表盘API
│   ├── models/                       # 数据模型
│   │   ├── __init__.py
│   │   ├── account.py                # 账号模型
│   │   ├── task.py                   # 任务模型
│   │   ├── execution_log.py          # 日志模型
│   │   └── user.py                   # 用户模型
│   ├── schemas/                      # Pydantic模式
│   │   ├── __init__.py
│   │   ├── account.py                # 账号模式
│   │   ├── task.py                   # 任务模式
│   │   ├── execution_log.py          # 日志模式
│   │   └── response.py               # 响应模式
│   ├── services/                     # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── account_service.py
│   │   ├── task_service.py
│   │   ├── log_service.py
│   │   └── dashboard_service.py
│   ├── repositories/                 # 数据访问层
│   │   ├── __init__.py
│   │   ├── base.py                   # 基础仓储类
│   │   ├── account_repository.py
│   │   ├── task_repository.py
│   │   └── log_repository.py
│   └── utils/                        # 工具函数
│       ├── __init__.py
│       ├── decorators.py             # 装饰器
│       └── helpers.py               # 辅助函数
├── tests/                            # 测试文件
│   ├── __init__.py
│   ├── conftest.py                  # pytest配置
│   ├── test_accounts.py            # 账号测试
│   ├── test_tasks.py               # 任务测试
│   └── test_logs.py                # 日志测试
├── requirements.txt                  # 依赖列表
├── pyproject.toml                   # 项目配置
├── alembic.ini                      # 迁移配置
└── README.md                        # 项目说明
```

---

## 5. 数据库设计

### 5.1 数据库选择

**选择**：SQLite
**原因**：
- 零配置：无需安装和配置数据库服务器
- 轻量级：单个文件存储，降低部署复杂度
- 可靠：ACID事务支持，数据完整性保证
- 兼容：标准SQL语法，SQLAlchemy原生支持
- 适合规模：支持TB级数据，满足中小型项目需求

### 5.2 数据表设计

#### 5.2.1 accounts 表（账号表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 主键，UUID格式 |
| `shadow_bot_account` | VARCHAR(100) | NOT NULL | 机器人账号名 |
| `host_ip` | VARCHAR(15) | NOT NULL | 主机IP地址 |
| `status` | ENUM | NOT NULL | 状态：pending/completed/running |
| `recent_app` | VARCHAR(100) | | 最近运行的应用 |
| `end_time` | TIMESTAMP | | 结束时间 |
| `task_control` | VARCHAR(100) | UNIQUE | 任务控制标识 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**索引**：
- `idx_accounts_shadow_bot` ON shadow_bot_account
- `idx_accounts_host_ip` ON host_ip
- `idx_accounts_status` ON status
- `idx_accounts_task_control` ON task_control

#### 5.2.2 tasks 表（任务表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 主键，UUID格式 |
| `task_name` | VARCHAR(200) | NOT NULL | 任务名称 |
| `shadow_bot_account` | VARCHAR(100) | NOT NULL | 关联账号 |
| `host_ip` | VARCHAR(15) | NOT NULL | 主机IP |
| `app_name` | VARCHAR(100) | NOT NULL | 应用名称 |
| `last_run_time` | TIMESTAMP | | 最后运行时间 |
| `status` | ENUM | NOT NULL | 状态：pending/completed/running/failed |
| `config_file` | BOOLEAN | DEFAULT FALSE | 是否有配置文件 |
| `config_info` | BOOLEAN | DEFAULT FALSE | 是否有配置信息 |
| `trigger_time` | TIMESTAMP | | 触发时间 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**索引**：
- `idx_tasks_shadow_bot` ON shadow_bot_account
- `idx_tasks_status` ON status
- `idx_tasks_app_name` ON app_name
- `idx_tasks_created_at` ON created_at

#### 5.2.3 execution_logs 表（执行日志表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 主键，UUID格式 |
| `text` | VARCHAR(255) | NOT NULL | 日志文本 |
| `app_name` | VARCHAR(100) | NOT NULL | 应用名称 |
| `shadow_bot_account` | VARCHAR(100) | NOT NULL | 机器人账号 |
| `status` | ENUM | NOT NULL | 状态：completed/failed/running |
| `start_time` | TIMESTAMP | NOT NULL | 开始时间 |
| `end_time` | TIMESTAMP | NOT NULL | 结束时间 |
| `duration` | DECIMAL(10,2) | NOT NULL | 执行时长（分钟） |
| `host_ip` | VARCHAR(15) | NOT NULL | 主机IP |
| `log_info` | BOOLEAN | DEFAULT FALSE | 是否有日志信息 |
| `screenshot` | BOOLEAN | DEFAULT FALSE | 是否有截图 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |

**索引**：
- `idx_logs_shadow_bot` ON shadow_bot_account
- `idx_logs_status` ON status
- `idx_logs_start_time` ON start_time
- `idx_logs_app_name` ON app_name

#### 5.2.4 users 表（用户表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 主键，UUID格式 |
| `username` | VARCHAR(50) | UNIQUE NOT NULL | 用户名 |
| `email` | VARCHAR(100) | UNIQUE NOT NULL | 邮箱 |
| `password_hash` | VARCHAR(255) | NOT NULL | 密码哈希 |
| `full_name` | VARCHAR(100) | | 全名 |
| `role` | ENUM | NOT NULL | 角色：admin/user |
| `is_active` | BOOLEAN | DEFAULT TRUE | 是否激活 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**索引**：
- `idx_users_username` ON username
- `idx_users_email` ON email

### 5.3 数据关系

```
users (1) ──→ (N) accounts
   │
   └─── 可管理多个账号

accounts (1) ──→ (N) tasks
   │
   └─── 一个账号可创建多个任务

tasks (1) ──→ (N) execution_logs
   │
   └─── 一个任务可产生多条执行日志
```

### 5.4 初始化数据

```sql
-- 插入示例账号数据
INSERT INTO accounts (id, shadow_bot_account, host_ip, status, recent_app, end_time, task_control, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'redballoon', '192.168.4.205', 'completed', '云仓收藏', '2026-01-20 10:30:00', 'redballoon--192.168.4....', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'tygj001', '192.168.6.52', 'running', 'AMZ-GPSR', NULL, 'tygj001--192.168.6....', NOW(), NOW());

-- 插入示例任务数据
INSERT INTO tasks (id, task_name, shadow_bot_account, host_ip, app_name, status, config_file, config_info, trigger_time, created_at, updated_at)
VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'redballoon-云仓收藏', 'redballoon', '192.168.4.205', '云仓收藏', 'completed', TRUE, TRUE, '2026-01-20 09:00:00', NOW(), NOW());
```

---

## 6. API 设计

### 6.1 API 规范

- **协议**：HTTP/1.1
- **格式**：JSON
- **编码**：UTF-8
- **版本**：v1（路径前缀 `/api/v1`）
- **认证**：JWT Bearer Token
- **文档**：OpenAPI 3.0（自动生成）

### 6.2 统一响应格式

#### 成功响应
```json
{
  "data": { /* 具体数据 */ },
  "meta": {
    "timestamp": "2026-01-21T10:30:00Z"
  }
}
```

#### 列表响应（分页）
```json
{
  "data": [ /* 数组数据 */ ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "timestamp": "2026-01-21T10:30:00Z"
  },
  "links": {
    "first": "/api/v1/accounts?page=1",
    "prev": null,
    "next": "/api/v1/accounts?page=2",
    "last": "/api/v1/accounts?page=5"
  }
}
```

#### 错误响应
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "hostIp",
        "message": "Invalid IP address format"
      }
    ]
  }
}
```

### 6.3 状态码规范

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 200 | OK | 成功获取数据 |
| 201 | Created | 成功创建资源 |
| 204 | No Content | 成功删除（无返回体） |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（重复创建） |
| 422 | Unprocessable | 业务逻辑错误 |
| 500 | Internal Error | 服务器内部错误 |

### 6.4 API 端点详情

#### 6.4.1 账号管理 API

**基础URL**：`/api/v1/accounts`

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | / | 获取账号列表 | user+ |
| GET | /{id} | 获取单个账号 | user+ |
| POST | / | 创建账号 | user+ |
| PUT | /{id} | 更新账号 | user+ |
| DELETE | /{id} | 删除账号 | admin |

**GET /api/v1/accounts**

Query参数：
- `search`（可选）：搜索关键词
- `page`（可选）：页码，默认1
- `pageSize`（可选）：每页数量，默认20

响应示例：
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "shadowBotAccount": "redballoon",
      "hostIp": "192.168.4.205",
      "status": "completed",
      "recentApp": "云仓收藏",
      "endTime": "2026-01-20 10:30:00",
      "taskControl": "redballoon--192.168.4....",
      "taskCount": 5
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

**POST /api/v1/accounts**

请求体：
```json
{
  "shadowBotAccount": "redballoon",
  "hostIp": "192.168.4.205"
}
```

#### 6.4.2 任务控制 API

**基础URL**：`/api/v1/tasks`

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | / | 获取任务列表 | user+ |
| GET | /{id} | 获取单个任务 | user+ |
| POST | / | 创建任务 | user+ |
| PUT | /{id} | 更新任务 | user+ |
| DELETE | /{id} | 删除任务 | admin |
| POST | /{id}/start | 启动任务 | user+ |
| POST | /{id}/stop | 停止任务 | user+ |

**GET /api/v1/tasks**

Query参数：
- `search`（可选）：搜索关键词
- `status`（可选）：状态筛选
- `page`（可选）：页码，默认1
- `pageSize`（可选）：每页数量，默认10

**POST /api/v1/tasks/{id}/start**

响应示例：
```json
{
  "data": {
    "success": true,
    "message": "Task started successfully",
    "controlUrl": "https://qn-v.xf5920.cn/yingdao?backend_ip=192.168.4.205&tak=%E4%BA%91%E4%BB%93%E6%94%B6%E8%97%8F&target=START"
  }
}
```

#### 6.4.3 执行日志 API

**基础URL**：`/api/v1/logs`

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | / | 获取日志列表 | user+ |
| GET | /export | 导出日志 | admin |

**GET /api/v1/logs**

Query参数：
- `search`（可选）：搜索关键词
- `status`（可选）：状态筛选
- `page`（可选）：页码，默认1
- `pageSize`（可选）：每页数量，默认20

#### 6.4.4 仪表盘 API

**基础URL**：`/api/v1/dashboard`

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | /stats | 获取统计数据 | user+ |
| GET | /performance | 获取性能趋势 | user+ |

**GET /api/v1/dashboard/stats**

响应示例：
```json
{
  "data": {
    "totalAccounts": 15,
    "activeTasks": 3,
    "completedJobs": 127,
    "totalExecutionHours": 842.5
  }
}
```

---

## 7. 安全设计

### 7.1 认证与授权

#### 认证机制
- **方式**：JWT Bearer Token
- **令牌格式**：`Bearer <token>`
- **过期时间**：24小时（可配置）
- **刷新机制**：支持令牌刷新

#### 角色权限

| 角色 | 权限范围 |
|------|----------|
| **admin** | 所有操作（CRUD + 系统配置） |
| **user** | 基础操作（查询、创建、更新） |

#### 权限矩阵

| 操作 | admin | user |
|------|-------|------|
| 查询账号/任务/日志 | ✅ | ✅ |
| 创建账号/任务 | ✅ | ✅ |
| 更新账号/任务 | ✅ | ✅ |
| 删除账号/任务 | ✅ | ❌ |
| 启动/停止任务 | ✅ | ✅ |
| 导出日志 | ✅ | ❌ |
| 用户管理 | ✅ | ❌ |

### 7.2 数据安全

#### 输入验证
- **参数验证**：使用Pydantic模型严格验证
- **SQL注入防护**：SQLAlchemy ORM参数化查询
- **XSS防护**：输出转义和内容过滤
- **CSRF防护**：使用JWT而非Cookie

#### 敏感数据处理
- **密码存储**：bcrypt哈希（加盐）
- **令牌存储**：JWT Secret Key环境变量配置
- **日志脱敏**：敏感信息（如密码、Token）自动脱敏

### 7.3 API 安全

#### 限流控制
- **频率限制**：每用户每分钟60次请求
- **突发限制**：允许短时间突发（10秒内20次）
- **限流响应**：返回429状态码

#### CORS 配置
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 错误处理
- **隐藏内部错误**：生产环境不返回堆栈信息
- **统一错误码**：便于客户端处理
- **日志记录**：所有错误写入日志系统

---

## 8. 非功能性需求

### 8.1 性能要求

| 指标 | 目标值 | 说明 |
|------|--------|------|
| **API响应时间** | < 200ms | 单个查询操作 |
| **列表查询时间** | < 500ms | 分页查询（20条记录） |
| **任务启动时间** | < 1s | 包含外部URL调用 |
| **并发用户数** | 100 | 同时在线用户 |
| **数据库容量** | 100万条记录 | 支持TB级数据存储 |

### 8.2 可用性要求

- **系统可用性**：99.5%（年停机时间 < 44小时）
- **备份恢复**：
  - 自动备份：每日凌晨2点
  - 备份保留：30天
  - 恢复时间：< 30分钟
- **容错能力**：
  - 单个API故障不影响其他功能
  - 数据库连接池支持自动重连
  - 外部服务调用失败不影响核心功能

### 8.3 可维护性

- **代码质量**：
  - 测试覆盖率：> 80%
  - 代码规范：遵循PEP 8
  - 类型注解：100%覆盖
- **文档**：
  - API文档：自动生成OpenAPI
  - 代码注释：公共方法必须有文档字符串
  - 架构文档：包含数据流图和部署指南
- **监控**：
  - 应用日志：结构化日志（JSON格式）
  - 性能监控：慢查询日志记录
  - 错误追踪：错误日志聚合

### 8.4 可扩展性

- **水平扩展**：支持多实例部署（后续）
- **数据库迁移**：SQLite → PostgreSQL（可选）
- **微服务拆分**：各模块独立部署能力
- **缓存支持**：Redis缓存层（可选）

---

## 9. 开发计划

### 9.1 开发阶段划分

#### 阶段一：项目初始化与基础架构（Week 1）
**目标**：搭建后端开发环境

**任务清单**：
- [ ] 创建FastAPI项目结构
- [ ] 配置SQLite数据库和SQLAlchemy ORM
- [ ] 配置开发环境（依赖、配置、日志）
- [ ] 实现基础中间件（CORS、认证、错误处理）
- [ ] 创建基础测试框架

**交付物**：
- 可运行的后端服务（端口8888）
- 数据库初始化脚本
- 基础测试套件
- 开发文档

**验收标准**：
- 服务启动无错误
- 数据库连接正常
- API文档可访问（/docs）
- 基础测试通过率100%

#### 阶段二：数据模型与仓储层（Week 2）
**目标**：完成数据层实现

**任务清单**：
- [ ] 定义SQLAlchemy模型（Account、Task、ExecutionLog、User）
- [ ] 创建Alembic迁移脚本
- [ ] 实现基础Repository类
- [ ] 实现CRUD操作的Repository
- [ ] 添加数据库索引优化

**交付物**：
- 完整的数据库表结构
- Repository层代码（增删改查）
- 数据模型测试
- 数据库设计文档

**验收标准**：
- 所有表创建成功
- CRUD操作测试通过
- 索引查询性能符合预期
- 测试覆盖率 > 80%

#### 阶段三：API层开发（Week 3-4）
**目标**：实现所有API端点

**任务清单**：
- [ ] 账号管理API（5个端点）
- [ ] 任务控制API（7个端点）
- [ ] 执行日志API（2个端点）
- [ ] 仪表盘API（2个端点）
- [ ] 请求/响应模式定义
- [ ] 输入验证和错误处理

**交付物**：
- 完整的API实现（16个端点）
- Pydantic模式定义
- API测试用例
- API文档（OpenAPI）

**验收标准**：
- 所有API端点响应正常
- 输入验证正确拦截无效数据
- 错误处理符合规范
- API文档完整准确

#### 阶段四：业务逻辑与服务层（Week 5）
**目标**：实现核心业务逻辑

**任务清单**：
- [ ] 实现AccountService（账号统计、关联查询）
- [ ] 实现TaskService（任务启动/停止逻辑）
- [ ] 实现LogService（日志分析、格式化）
- [ ] 实现DashboardService（统计计算）
- [ ] 集成Repository层与API层

**交付物**：
- Service层代码实现
- 业务逻辑测试
- 端到端集成测试
- 业务流程文档

**验收标准**：
- 业务逻辑测试通过
- 端到端测试覆盖主要流程
- 性能测试符合要求
- 业务流程正确

#### 阶段五：认证与安全（Week 6）
**目标**：实现安全认证机制

**任务清单**：
- [ ] 实现JWT认证中间件
- [ ] 实现用户注册/登录API
- [ ] 实现基于角色的权限控制
- [ ] 添加API限流
- [ ] 安全测试和漏洞修复

**交付物**：
- 认证系统实现
- 权限控制中间件
- 安全测试报告
- 安全配置文档

**验收标准**：
- 未认证访问被正确拒绝
- 权限控制正确生效
- 安全测试无高危漏洞
- API限流正常工作

#### 阶段六：测试与优化（Week 7）
**目标**：完善测试和质量保证

**任务清单**：
- [ ] 编写集成测试
- [ ] 性能测试和优化
- [ ] 错误处理完善
- [ ] 代码审查和重构
- [ ] 文档完善

**交付物**：
- 完整测试套件（覆盖率 > 85%）
- 性能测试报告
- 重构后的代码
- 最终交付文档

**验收标准**：
- 所有测试通过
- 性能指标达标
- 代码质量评审通过
- 文档完整准确

### 9.2 关键里程碑

| 里程碑 | 时间 | 验收标准 |
|--------|------|----------|
| **M1：架构完成** | Week 2 | 数据库设计完成，基础框架可运行 |
| **M2：API开发完成** | Week 4 | 所有API端点实现并通过测试 |
| **M3：业务逻辑完成** | Week 5 | 核心业务流程测试通过 |
| **M4：安全认证完成** | Week 6 | 认证授权机制正常工作 |
| **M5：项目交付** | Week 7 | 测试覆盖达标，性能符合要求 |

### 9.3 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| 技术栈不熟悉 | 开发效率降低 | 提前学习FastAPI，参考最佳实践 |
| 需求变更 | 返工成本高 | 保持与前端开发沟通，文档化管理 |
| 性能问题 | 影响用户体验 | 早期进行性能测试，及时优化 |
| 数据库迁移 | 数据丢失风险 | 完整备份，分步迁移 |
| 测试覆盖不足 | 质量风险 | 强制测试驱动开发，代码审查 |

---

## 10. 验收标准

### 10.1 功能验收

#### 账号管理模块
- [ ] 可以成功创建账号（有效数据）
- [ ] 创建账号时验证IP格式（无效数据被拒绝）
- [ ] 可以查询账号列表（支持分页）
- [ ] 可以搜索账号（模糊搜索正常）
- [ ] 可以更新账号信息
- [ ] 可以删除账号（级联删除）
- [ ] 任务计数正确显示

#### 任务控制模块
- [ ] 可以创建任务（关联有效账号）
- [ ] 任务名自动格式化为 `${账号}-${应用}`
- [ ] 可以查询任务列表（支持分页和搜索）
- [ ] 可以更新任务配置
- [ ] 可以删除任务
- [ ] `pending` 状态可以启动任务
- [ ] `running` 状态可以停止任务
- [ ] 任务状态变更正确
- [ ] 控制URL生成正确

#### 执行日志模块
- [ ] 可以查询日志列表（支持分页）
- [ ] 可以按状态筛选日志
- [ ] 搜索功能正常工作
- [ ] 执行时长格式化为小时+分钟
- [ ] 可以导出日志（CSV/JSON格式）

#### 仪表盘模块
- [ ] 统计数据正确计算
- [ ] 性能趋势图表数据正确
- [ ] 状态分布饼图数据正确
- [ ] 最近记录列表正确显示

### 10.2 性能验收

- [ ] 单个查询API响应时间 < 200ms
- [ ] 列表查询API响应时间 < 500ms
- [ ] 任务启动API响应时间 < 1s
- [ ] 并发10用户测试通过
- [ ] 数据库查询优化（索引命中）

### 10.3 安全验收

- [ ] 未认证访问被拒绝（返回401）
- [ ] 权限不足被拒绝（返回403）
- [ ] JWT令牌过期自动拒绝
- [ ] 无效输入数据被拒绝（返回422）
- [ ] API限流正常工作
- [ ] 敏感数据不在日志中泄露

### 10.4 质量验收

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试覆盖主要业务流程
- [ ] 代码风格检查通过（ruff）
- [ ] 类型检查通过（mypy）
- [ ] API文档自动生成（/docs可访问）
- [ ] 错误处理规范统一

### 10.5 兼容性验收

- [ ] 前端集成测试通过
- [ ] API响应格式符合前端预期
- [ ] 数据模型映射正确
- [ ] 错误码处理一致

---

## 11. 附录

### 11.1 参考文档

- **FastAPI官方文档**：https://fastapi.tiangolo.com/
- **SQLAlchemy文档**：https://docs.sqlalchemy.org/
- **Pydantic文档**：https://docs.pydantic.dev/
- **JWT认证指南**：https://jwt.io/
- **RESTful API设计规范**：https://restfulapi.net/

### 11.2 环境变量

```bash
# 数据库配置
DATABASE_URL=sqlite+aiosqlite:///./app.db

# JWT配置
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# API配置
API_V1_STR=/api/v1
PROJECT_NAME=RPA Workbench

# 日志配置
LOG_LEVEL=INFO

# CORS配置
ALLOWED_HOSTS=["http://localhost:3000"]
```

### 11.3 依赖列表

```txt
fastapi==0.110.0
uvicorn[standard]==0.27.1
sqlalchemy[asyncio]==2.0.27
aiosqlite==0.19.0
pydantic==2.6.1
pydantic[email]==2.6.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
alembic==1.13.1
pytest==8.0.2
pytest-asyncio==0.23.5
pytest-cov==4.1.0
httpx==0.27.0
ruff==0.1.9
mypy==1.8.0
```

### 11.4 部署脚本

```bash
#!/bin/bash
# deploy.sh

# 1. 创建虚拟环境
python -m venv venv
source venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 数据库迁移
alembic upgrade head

# 4. 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 11.5 监控脚本

```python
# health_check.py
import asyncio
from app.core.database import engine

async def check_health():
    try:
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

if __name__ == "__main__":
    result = asyncio.run(check_health())
    print(result)
```

---

**文档结束**

**编制**：Claude Code
**审核**：（待填写）
**批准**：（待填写）

---

*本文档遵循产品需求文档（PRD）标准格式，详细描述了RPA Workbench后端系统的功能需求、技术架构、开发计划和验收标准。所有内容基于前端实现和业务需求分析，为后端开发提供全面的指导。*
