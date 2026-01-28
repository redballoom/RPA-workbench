"""
API v1 router module
"""
from fastapi import APIRouter
from app.api.v1.accounts import router as accounts_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.logs import router as logs_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.webhook import router as webhook_router
from app.api.v1.sse import router as sse_router
from app.api.v1.resources import router as resources_router

router = APIRouter(prefix="/api/v1")

router.include_router(accounts_router)
router.include_router(tasks_router)
router.include_router(logs_router)
router.include_router(dashboard_router)
router.include_router(webhook_router)
router.include_router(sse_router)
router.include_router(resources_router)
