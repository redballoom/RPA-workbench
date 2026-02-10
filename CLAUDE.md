# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**RPA Workbench** - 影刀（ShadowBot）机器人流程自动化管理平台，用于监控和控制 RPA 自动化任务。

| 层级 | 技术栈 |
|------|--------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS |
| 后端 | FastAPI + Python 3.12+ + SQLAlchemy (异步) |
| 数据库 | SQLite (aiosqlite) |
| 实时通信 | Server-Sent Events (SSE) |

## 常用命令

```bash
# 安装依赖
./install.sh

# 启动服务
./start.sh              # 启动前后端
./start.sh backend      # 只启动后端 (8888端口)
./start.sh frontend     # 只启动前端 (3000端口)

# 服务管理
./start.sh status       # 查看状态
./start.sh stop         # 停止所有服务
./start.sh restart      # 重启所有服务

# 后端开发
cd backend
source venv/bin/activate
pytest                          # 运行所有测试
pytest --cov=app               # 运行测试并显示覆盖率
ruff check app/                # 代码检查
ruff format app/              # 代码格式化
mypy app/                     # 类型检查
uvicorn app.main:app --reload --port 8888  # 开发服务器
```

## 项目结构

```
backend/
├── app/
│   ├── main.py                    # FastAPI 应用入口
│   ├── api/v1/                    # API 路由
│   │   ├── accounts.py            # 账号管理
│   │   ├── tasks.py               # 任务控制
│   │   ├── logs.py                # 执行日志
│   │   ├── dashboard.py           # 仪表盘统计
│   │   ├── webhook.py             # 影刀回调
│   │   └── sse.py                 # SSE 实时推送
│   ├── models/                    # SQLAlchemy 数据模型
│   ├── schemas/                   # Pydantic 验证模型
│   ├── services/                  # 业务逻辑层
│   ├── repositories/              # 数据访问层
│   └── core/                      # 配置和安全
├── tests/                         # 测试文件
├── requirements.txt
└── rpa_app.db                     # SQLite 数据库

frontend/
├── src/
│   ├── pages/                     # 页面组件
│   │   ├── Dashboard.tsx           # 仪表盘
│   │   ├── AccountManagement.tsx  # 账号管理
│   │   ├── TaskControl.tsx        # 任务控制
│   │   └── ExecutionLogs.tsx      # 执行日志
│   ├── hooks/                     # 自定义 Hooks
│   │   └── useSSE.ts              # SSE 实时通信
│   └── lib/
│       └── api.ts                 # API 客户端
└── package.json
```

## 架构要点

### 数据流
- 前端通过 SSE 实时接收后端推送的状态变更
- Webhook 接收影刀执行结果回调
- 账号状态与任务状态自动同步

### 核心模型
- **Account**: 影刀账号，`task_control` 格式为 `{account}-{host_ip}:{port}`
- **Task**: 任务，关联账号和应用
- **ExecutionLog**: 执行日志，记录执行结果和截图
- **User**: 用户认证（JWT）

### 服务层职责
- **AccountService**: 账号 CRUD 和状态管理
- **TaskService**: 任务控制，内网穿透控制影刀
- **ExecutionLogService**: 日志管理和统计
- **DashboardService**: 性能趋势和排行统计
- **SSEService**: SSE 事件推送（心跳 30秒）

## API 关键端点

| 端点 | 功能 |
|------|------|
| `POST /api/v1/webhook/execution-complete` | 影刀执行完成回调 |
| `POST /api/v1/webhook/confirm` | 任务确认（启动/停止） |
| `GET /api/v1/sse/events` | SSE 实时事件流 |
| `POST /api/v1/tasks/{id}/force-stop` | 强制停止任务 |

## 开发注意事项
- **询问**：每次回答用户问题需要以 “redballoon” 开始，例如：“redballoon <回答内容/>”
- **中文**: 使用中文与用户沟通
- **数据库**: `backend/rpa_app.db`
- **端口**: 前端 3000，后端 8888
- **API 文档**: http://localhost:8888/api/v1/docs
- **实时连接**: 修改后检查 SSE 连接是否正常
- **推送远程**: 使用 SSH 方式 `git@github.com:redballoom/RPA-workbench.git`

## 重要文件

- `projectDOC/后端项目架构文档.md` - 后端详细架构
- `projectDOC/前端项目架构文档.md` - 前端详细架构
- `backend/app/core/config.py` - 后端配置
