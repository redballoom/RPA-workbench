# CLAUDE.md
**Use Chinese to answer**
**数据库在 /home/redballooon/Desktop/claude_code_projects/RPA-workbench/backend/rpa_app.db**
**当用户需要更新修改到远程仓库的化，请执行本地的ssh git 命令的方式 将修改推送到 github 其ssh仓库地址是：git@github.com:redballoom/RPA-workbench.git  其http仓库地址是：https://github.com/redballoom/RPA-workbench.git**
**每次修改后检查前后端服务的连接，确保前端服务都能正常访问**
 
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **RPA Workbench** - a Robot Process Automation management platform with:
- **Frontend**: Complete React/TypeScript application (Vite, Tailwind CSS)
- **Backend**: To be implemented using **Python FastAPI** with **SQLite database**
- **Purpose**: Monitor and control RPA automation tasks, manage bot accounts, view execution logs

The frontend is fully implemented and uses LocalStorage. The backend needs to be built to replace LocalStorage with a real API.

## Quick Start Commands

### Frontend Development
```bash
cd frontend
pnpm install                    # Install dependencies
pnpm dev                        # Start development server (port 3000)
pnpm build                      # Build for production
```

### Backend Development (FastAPI + SQLite)
```bash
# When backend is created
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Architecture Overview

### Frontend Structure (Complete)
```
frontend/src/
├── components/          # Reusable UI components
├── pages/              # 4 main modules:
│   ├── Dashboard.tsx        # System overview & statistics
│   ├── AccountManagement.tsx # Bot account management
│   ├── TaskControl.tsx     # Task execution control
│   └── ExecutionLogs.tsx   # Task execution history
├── contexts/           # React Context (authContext.ts)
├── hooks/             # Custom hooks (useTheme.ts)
└── lib/               # Utilities (utils.ts)
```

### Backend Structure (To Implement)
```
backend/                          # Create this directory
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app entry
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── accounts.py     # Account endpoints
│   │   │   ├── tasks.py        # Task endpoints
│   │   │   ├── logs.py         # Execution log endpoints
│   │   │   └── dashboard.py    # Dashboard stats endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Settings
│   │   └── database.py         # SQLite database config
│   ├── models/
│   │   ├── __init__.py
│   │   ├── account.py          # Account SQLAlchemy model
│   │   ├── task.py             # Task SQLAlchemy model
│   │   └── execution_log.py    # ExecutionLog SQLAlchemy model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── account.py          # Account Pydantic schemas
│   │   ├── task.py             # Task Pydantic schemas
│   │   └── execution_log.py    # ExecutionLog Pydantic schemas
│   └── services/
│       ├── __init__.py
│       ├── account_service.py
│       ├── task_service.py
│       └── execution_log_service.py
├── tests/
├── requirements.txt
└── pyproject.toml
```

## API Integration Guide

The frontend already has **complete API specifications** in `frontend/README.md` (lines 160-308). Use these to implement the backend.

### Required Endpoints

**1. Account Management** (4 endpoints)
- `GET /api/accounts` - List accounts with search
- `GET /api/accounts/{id}` - Get single account
- `POST /api/accounts` - Create account
- `PUT /api/accounts/{id}` - Update account
- `DELETE /api/accounts/{id}` - Delete account

**2. Task Management** (7 endpoints)
- `GET /api/tasks` - List tasks with pagination
- `GET /api/tasks/{id}` - Get single task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `POST /api/tasks/{id}/start` - Start task
- `POST /api/tasks/{id}/stop` - Stop task

**3. Execution Logs** (2 endpoints)
- `GET /api/logs` - List logs with search/filter/pagination
- `GET /api/logs/export` - Export logs

**4. Dashboard Stats** (2 endpoints)
- `GET /api/dashboard/stats` - Get statistics
- `GET /api/dashboard/performance` - Get performance trends

### Data Models

**Account** (`frontend/README.md` lines 112-123):
```typescript
interface Account {
  id: string;
  recordId?: string;
  shadowBotAccount: string;
  hostIp: string;
  status: "completed" | "pending" | "running";
  recentApp: string;
  endTime: string;
  taskControl: string;
  taskCount: number;
}
```

**Task** (`frontend/README.md` lines 128-140):
```typescript
interface Task {
  id: string;
  taskName: string;
  shadowBotAccount: string;
  hostIp: string;
  appName: string;
  lastRunTime: string;
  status: "pending" | "completed" | "running" | "failed";
  configFile: boolean;
  configInfo: boolean;
  triggerTime: string;
}
```

**ExecutionLog** (`frontend/README.md` lines 145-158):
```typescript
interface ExecutionLog {
  id: string;
  text: string;
  appName: string;
  shadowBotAccount: string;
  status: "completed" | "failed" | "running";
  startTime: string;
  endTime: string;
  duration: number;
  hostIp: string;
  logInfo: boolean;
  screenshot: boolean;
}
```

## FastAPI Implementation Notes

### Database: SQLite Configuration
- **Use SQLAlchemy ORM** with SQLite
- **Database file**: `backend/app.db` (or configurable path)
- **Alembic**: For database migrations (optional for SQLite)
- **Simple setup**: No external database server required

### Best Practices (from `.claude/skills/`)
- Use Pydantic v2 models for validation
- Implement proper error handling with HTTPException
- Use async/await for I/O operations
- Follow RESTful conventions
- Include OpenAPI/Swagger documentation (automatic with FastAPI)
- Implement proper status codes (200, 201, 204, 400, 401, 403, 404, 422, 500)
- Use pagination for list endpoints
- Validate all inputs with Pydantic Field validation

### FastAPI Patterns to Use

**1. CRUD Pattern** (see `/.claude/skills/api-design-patterns/api-design-patterns/references/fastapi-examples.md`)
```python
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

class AccountCreate(BaseModel):
    shadowBotAccount: str = Field(..., min_length=1)
    hostIp: str

@app.get("/api/accounts", response_model=PaginatedResponse)
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    # Implementation with SQLite/SQLAlchemy
    query = select(Account)
    if search:
        query = query.filter(Account.shadowBotAccount.contains(search))
    # ... pagination logic
```

**2. Error Handling Pattern**
```python
if not account:
    raise HTTPException(
        status_code=404,
        detail={
            "code": "NOT_FOUND",
            "message": "Account not found"
        }
    )
```

**3. Python Type Hints** (from `/.claude/skills/python-development/python-development/SKILL.md`)
```python
from typing import Optional, List
from collections.abc import Sequence

async def get_accounts() -> List[Account]:
    return await db.accounts.all()
```

### SQLite Setup Example
```python
# backend/app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite+aiosqlite:///./app.db"

engine = create_async_engine(
    DATABASE_URL,
    echo=True  # Set to False in production
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

## Frontend Integration Points

### Data Flow
1. Frontend currently uses LocalStorage
2. All data fetching is in individual page components
3. Frontend uses custom events (`taskUpdated`, `accountUpdated`, `logUpdated`) for cross-component sync

### Integration Steps
1. Replace LocalStorage calls with API calls in frontend components
2. Add error handling for network failures
3. Implement loading states
4. Add request retry logic
5. Update environment variables for API base URL

### Frontend Environment Setup
Create `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Testing

### Frontend Testing
```bash
cd frontend
pnpm test                    # Run all tests
pnpm test -- --watch         # Watch mode
```

### Backend Testing (To Implement)
```bash
cd backend
pytest                       # Run all tests
pytest --cov=app            # Run with coverage
pytest tests/test_accounts.py # Run specific test file
```

**SQLite Testing Tips**:
- Use in-memory SQLite for fast tests
- Create fresh database for each test session
- Seed test data in fixtures

## Important Files

### Frontend
- `frontend/README.md` - **Complete API specifications** (READ THIS FIRST)
- `frontend/package.json` - Dependencies and scripts
- `frontend/src/pages/*.tsx` - Main application modules
- `frontend/src/contexts/authContext.ts` - Authentication context

### Backend (To Create)
- `backend/app/main.py` - FastAPI application entry
- `backend/requirements.txt` - Python dependencies
- `backend/pyproject.toml` - Python project configuration

### Documentation
- `frontend/README.md` - Frontend documentation and API specs
- `/.claude/skills/api-design-patterns/` - API design patterns
- `/.claude/skills/python-development/` - Python development best practices

## Development Workflow

### 1. Backend First (Recommended)
1. Create FastAPI project structure
2. Set up SQLite database with SQLAlchemy ORM
3. Create database models (Account, Task, ExecutionLog)
4. Create Pydantic schemas
5. Implement API endpoints per frontend/README.md
6. Add basic tests
7. Start development server

### 2. Frontend Integration
1. Update frontend components to call real API
2. Add error handling and loading states
3. Remove LocalStorage dependencies
4. Test integration
5. Update deployment configuration

## Common Development Tasks

### Add New API Endpoint
1. Define Pydantic schema in `backend/app/schemas/`
2. Add SQLAlchemy model if needed
3. Implement service layer logic
4. Create endpoint in appropriate `api/v1/*.py` file
5. Add tests
6. Update frontend to use new endpoint

### Modify Data Model
1. Update frontend TypeScript interface in `frontend/README.md`
2. Update backend Pydantic schema
3. Update SQLAlchemy model
4. Create migration (Alembic) or drop/recreate SQLite
5. Update frontend component props/types
6. Test end-to-end

### Add New Frontend Feature
1. Create component in `frontend/src/components/`
2. Add route in `frontend/src/App.tsx`
3. Implement API calls following existing patterns
4. Add to navigation if needed
5. Test thoroughly

## Deployment

### Frontend
```bash
cd frontend
pnpm build
# Deploy dist/ directory to static hosting (Vercel, Netlify, S3, etc.)
```

### Backend
- **SQLite**: Simple deployment, file-based database
- Use Docker for containerization
- Deploy to cloud (AWS, GCP, Azure, Railway, Heroku)
- **For production**: Consider migrating to PostgreSQL
- Configure environment variables
- Set up CI/CD pipeline

## Key Considerations

1. **API Versioning**: Start with `/api/v1/` prefix for future compatibility
2. **CORS**: Configure FastAPI CORS for frontend domain
3. **Error Format**: Keep consistent error response structure
4. **Validation**: Validate all inputs on both frontend and backend
5. **Pagination**: Implement for all list endpoints
6. **Logging**: Add proper logging for debugging
7. **Security**: Don't expose sensitive data, validate permissions
8. **Testing**: Write tests for both frontend and backend
9. **Documentation**: FastAPI auto-generates OpenAPI docs at `/docs`
10. **Performance**: SQLite works well for small-medium datasets

## Available Resources

- **API Design Patterns**: `/.claude/skills/api-design-patterns/api-design-patterns/SKILL.md`
- **Python Development**: `/.claude/skills/python-development/python-development/SKILL.md`
- **FastAPI Examples**: `/.claude/skills/api-design-patterns/api-design-patterns/references/fastapi-examples.md`
- **Frontend Documentation**: `frontend/README.md` (complete API specs)

---

**Priority**: Focus on backend implementation using the detailed API specifications in `frontend/README.md`. The frontend is production-ready and just needs API integration.

**Database**: Use SQLite with SQLAlchemy ORM for simplicity and zero-configuration deployment.
