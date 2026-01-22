"""
Pytest configuration and fixtures
"""
import asyncio
from typing import AsyncGenerator

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, Base, engine
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    """
    Create an instance of the default event loop for the test session.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_db():
    """
    Create a test database
    """
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    # Drop all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session(test_db) -> AsyncGenerator[AsyncSession, None]:
    """
    Create a test database session
    """
    async with AsyncSessionLocal() as session:
        yield session


@pytest.fixture
async def client(db_session):
    """
    Create a test client
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


# Test data
SAMPLE_ACCOUNT = {
    "shadowBotAccount": "test_account",
    "hostIp": "192.168.1.1",
}

SAMPLE_TASK = {
    "appName": "test_app",
    "shadowBotAccount": "test_account",
    "configFile": False,
    "configInfo": True,
}

SAMPLE_LOG = {
    "text": "test_log",
    "appName": "test_app",
    "shadowBotAccount": "test_account",
    "status": "completed",
    "startTime": "2026-01-21 10:00",
    "endTime": "2026-01-21 10:30",
    "duration": 30.0,
    "hostIp": "192.168.1.1",
    "logInfo": True,
    "screenshot": False,
}
