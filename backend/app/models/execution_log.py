"""
ExecutionLog model
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, Boolean, DECIMAL, Index
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.core.database import Base


class ExecutionLog(Base):
    """ExecutionLog model for storing task execution logs"""

    __tablename__ = "execution_logs"

    # Use String for UUID in SQLite
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    text = Column(String(255), nullable=False, index=True)
    app_name = Column(String(100), nullable=False, index=True)
    shadow_bot_account = Column(String(100), nullable=False, index=True)
    status = Column(Enum("completed", "failed", "running", name="log_status"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    duration = Column(DECIMAL(10, 2), nullable=False)
    host_ip = Column(String(15), nullable=False)
    log_info = Column(Boolean, default=False, nullable=False)
    screenshot = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Indexes
    __table_args__ = (
        Index("idx_logs_shadow_bot", "shadow_bot_account"),
        Index("idx_logs_status", "status"),
        Index("idx_logs_start_time", "start_time"),
        Index("idx_logs_app_name", "app_name"),
        Index("idx_logs_host_ip", "host_ip"),
    )

    def __repr__(self) -> str:
        return f"<ExecutionLog(id={self.id}, app_name={self.app_name}, status={self.status})>"
