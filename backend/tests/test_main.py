"""
Test health check endpoint
"""
import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    """
    Test health check endpoint
    """
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["database"] == "connected"


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """
    Test root endpoint
    """
    response = await client.get("/")
    assert response.status_code == 200
    assert "RPA Workbench Backend API" in response.json()["message"]
