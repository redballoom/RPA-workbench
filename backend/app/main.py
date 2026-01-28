"""
Main FastAPI application entry point
"""
import asyncio
import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine
from app.api.v1 import router as api_v1_router
from app.services.sse_service import set_sse_service, get_sse_service, SSEService

settings = get_settings()

# 确保静态文件目录存在
STATIC_DIR = Path("app/static")
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "screenshots").mkdir(exist_ok=True)
(UPLOAD_DIR / "logs").mkdir(exist_ok=True)

# 全局 SSE 服务实例
sse_service: SSEService = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan events
    """
    # Startup
    print("🚀 Starting up RPA Workbench Backend...")

    # Initialize SSE service
    global sse_service
    sse_service = SSEService()
    set_sse_service(sse_service)
    print("✅ SSE service initialized")

    # Test database connection
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        print("✅ Database connected successfully")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise

    print(f"✅ Application started successfully")
    print(f"📚 API Documentation: http://localhost:8000/docs")
    print(f"📖 ReDoc: http://localhost:8000/redoc")

    yield

    # Shutdown
    print("🛑 Shutting down RPA Workbench Backend...")
    await engine.dispose()
    print("✅ Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="RPA Workbench Backend API - Robot Process Automation Management Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Add middleware
# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host Middleware (security)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS,
)


@app.get("/")
async def root() -> dict:
    """
    Root endpoint
    """
    return {
        "message": "RPA Workbench Backend API",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/docs",
    }


@app.get("/health")
async def health_check() -> dict:
    """
    Health check endpoint
    """
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))

        # Check SSE service status
        sse_status = "running" if get_sse_service() else "not initialized"

        return {
            "status": "healthy",
            "database": "connected",
            "version": "1.0.0",
            "sse": sse_status,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e),
            },
        )


# Include API routers
app.include_router(api_v1_router)

# 挂载静态文件目录（用于截图和日志文件访问）
app.mount("/static", StaticFiles(directory="app/static"), name="static")


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request,
    exc: HTTPException
) -> JSONResponse:
    """
    Global HTTP exception handler
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(
    request: Request,
    exc: Exception
) -> JSONResponse:
    """
    Global exception handler
    """
    # Log the exception
    print(f"❌ Unhandled exception: {exc}")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error",
            }
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
