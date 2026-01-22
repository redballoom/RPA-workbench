# RPA Workbench Backend

RPA Workbench后端API服务 - 机器人流程自动化管理平台

## 技术栈

- **Web框架**: FastAPI 0.110+
- **数据库**: SQLite 3.45+ (使用aiosqlite)
- **ORM**: SQLAlchemy 2.0+ (异步支持)
- **数据验证**: Pydantic 2.6+
- **认证**: JWT (PyJWT)
- **迁移工具**: Alembic
- **测试**: pytest + httpx
- **代码质量**: ruff + mypy

## 项目结构

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
│   ├── test_main.py                # 基础测试
│   ├── test_accounts.py            # 账号测试
│   ├── test_tasks.py               # 任务测试
│   └── test_logs.py                # 日志测试
├── requirements.txt                  # 依赖列表
├── pyproject.toml                   # 项目配置
└── README.md                       # 项目说明
```

## 快速开始

### 1. 创建虚拟环境

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，修改配置：

```bash
# 数据库配置
DATABASE_URL=sqlite+aiosqlite:///./app.db

# JWT配置
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# API配置
API_V1_STR=/api/v1
PROJECT_NAME=RPA Workbench Backend

# CORS配置
CORS_ORIGINS=["http://localhost:3000"]
```

### 4. 启动开发服务器

```bash
# 直接运行
python -m app.main

# 或使用uvicorn
uvicorn app.main:app --reload --port 8000
```

### 5. 访问API文档

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## 开发指南

### 运行测试

```bash
# 运行所有测试
pytest

# 运行测试并显示覆盖率
pytest --cov=app

# 运行特定测试文件
pytest tests/test_main.py

# 运行测试并实时重载
pytest --watch
```

### 代码质量检查

```bash
# 使用ruff检查代码
ruff check app/

# 使用ruff格式化代码
ruff format app/

# 使用mypy类型检查
mypy app/
```

### 数据库迁移

```bash
# 初始化迁移
alembic init alembic

# 创建迁移文件
alembic revision --autogenerate -m "Initial migration"

# 应用迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

## API 端点

### 基础端点

- `GET /` - 根路径
- `GET /health` - 健康检查

### 账号管理

- `GET /api/v1/accounts` - 获取账号列表
- `GET /api/v1/accounts/{id}` - 获取单个账号
- `POST /api/v1/accounts` - 创建账号
- `PUT /api/v1/accounts/{id}` - 更新账号
- `DELETE /api/v1/accounts/{id}` - 删除账号

### 任务控制

- `GET /api/v1/tasks` - 获取任务列表
- `GET /api/v1/tasks/{id}` - 获取单个任务
- `POST /api/v1/tasks` - 创建任务
- `PUT /api/v1/tasks/{id}` - 更新任务
- `DELETE /api/v1/tasks/{id}` - 删除任务
- `POST /api/v1/tasks/{id}/start` - 启动任务
- `POST /api/v1/tasks/{id}/stop` - 停止任务

### 执行日志

- `GET /api/v1/logs` - 获取日志列表
- `GET /api/v1/logs/export` - 导出日志

### 仪表盘

- `GET /api/v1/dashboard/stats` - 获取统计数据
- `GET /api/v1/dashboard/performance` - 获取性能趋势

## 环境变量

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | str | `sqlite+aiosqlite:///./app.db` | 数据库连接URL |
| `SECRET_KEY` | str | - | JWT密钥（必须修改） |
| `ALGORITHM` | str | `HS256` | JWT算法 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | int | `1440` | 访问令牌过期时间（分钟） |
| `API_V1_STR` | str | `/api/v1` | API版本前缀 |
| `PROJECT_NAME` | str | `RPA Workbench Backend` | 项目名称 |
| `CORS_ORIGINS` | list | `["http://localhost:3000"]` | 允许的CORS源 |

## 开发规范

### 编码风格

- 遵循PEP 8
- 使用类型提示
- 使用异步/await进行I/O操作
- 使用pydantic进行数据验证

### 测试规范

- 所有新功能必须包含测试
- 测试覆盖率 > 80%
- 使用pytest-asyncio进行异步测试

### 提交规范

使用语义化提交：

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建或工具链变动

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t rpa-workbench-backend .

# 运行容器
docker run -p 8000:8000 rpa-workbench-backend
```

### 生产环境配置

1. 设置 `SECRET_KEY` 环境变量
2. 设置 `echo=False` 在数据库配置中
3. 使用 HTTPS
4. 配置 CORS 源
5. 设置日志级别为 `WARNING`

## 许可证

MIT License

## 贡献

欢迎提交 Pull Request！

## 支持

如有问题，请创建 Issue。
