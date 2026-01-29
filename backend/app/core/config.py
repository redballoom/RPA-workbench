"""
Core configuration settings
"""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RPA Workbench Backend"

    # Database Configuration - use absolute path
    DATABASE_URL: str = "sqlite+aiosqlite:////home/redballooon/Desktop/claude_code_projects/RPA-workbench/backend/app.db"

    # JWT Configuration
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Security
    ALLOWED_HOSTS: list[str] = ["*"]

    # CORS Configuration
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Intranet Proxy Configuration (内网穿透配置)
    INTRANET_PROXY_BASE_URL: str = "https://qn-v.xf5920.cn/yingdao"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
