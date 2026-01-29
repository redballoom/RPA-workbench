"""
Task model
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.core.database import Base


class Task(Base):
    """Task model for storing automation task information"""

    __tablename__ = "tasks"

    # Use String for UUID in SQLite
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_name = Column(String(200), nullable=False)
    shadow_bot_account = Column(String(100), nullable=False, index=True)
    host_ip = Column(String(15), nullable=False)
    app_name = Column(String(100), nullable=False, index=True)
    last_run_time = Column(DateTime, nullable=True)
    status = Column(Enum("pending", "running", name="task_status"), nullable=False, default="pending", index=True)
    config_file = Column(Boolean, default=False, nullable=False)
    config_info = Column(Boolean, default=False, nullable=False)

    # ============ 配置相关字段 ============
    # 配置文件路径 (OSS URL)
    config_file_path = Column(String(500), nullable=True)
    # 配置信息 (JSON 格式)
    config_json = Column(String(2000), nullable=True)

    trigger_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Indexes
    __table_args__ = (
        Index("idx_tasks_shadow_bot", "shadow_bot_account"),
        Index("idx_tasks_status", "status"),
        Index("idx_tasks_app_name", "app_name"),
        Index("idx_tasks_created_at", "created_at"),
        Index("idx_tasks_last_run_time", "last_run_time"),
    )

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, task_name={self.task_name}, status={self.status})>"
