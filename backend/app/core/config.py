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

    # Frontend URL Configuration
    FRONTEND_URL: str = "http://localhost:3000"

    # Database Configuration - use relative path for portability
    DATABASE_URL: str = "sqlite+aiosqlite:///./rpa_app.db"

    # JWT Configuration
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Security
    ALLOWED_HOSTS: list[str] = ["*"]

    # CORS Configuration - allow all origins for LAN access
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Intranet Proxy Configuration (内网穿透配置)
    INTRANET_PROXY_BASE_URL: str = "https://qn-v.xf5920.cn/yingdao"

    # OSS Configuration (阿里云 OSS)
    OSS_ACCESS_KEY_ID: str = ""
    OSS_ACCESS_KEY_SECRET: str = ""
    OSS_BUCKET_NAME: str = "rpa-workbench"
    OSS_ENDPOINT: str = "oss-cn-shenzhen.aliyuncs.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 动态添加 FRONTEND_URL 到 CORS_ORIGINS
        if self.FRONTEND_URL and self.FRONTEND_URL not in self.CORS_ORIGINS:
            self.CORS_ORIGINS.append(self.FRONTEND_URL)
        # 确保通配符在列表中（生产环境需要）
        if "*" not in self.CORS_ORIGINS:
            self.CORS_ORIGINS.append("*")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
