"""
Account model
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, Text, Index, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.core.database import Base


class Account(Base):
    """Account model for storing ShadowBot account information"""

    __tablename__ = "accounts"

    # Use String for UUID in SQLite
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shadow_bot_account = Column(String(100), nullable=False, index=True)
    host_ip = Column(String(15), nullable=False, index=True)
    port = Column(Integer, default=0, nullable=False)
    status = Column(Enum("pending", "completed", "failed", "running", name="account_status"), nullable=False, index=True)
    recent_app = Column(String(100), nullable=True)
    end_time = Column(DateTime, nullable=True)
    task_control = Column(String(100), unique=True, nullable=False, index=True)
    task_count = Column(Integer, default=0, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Indexes
    __table_args__ = (
        Index("idx_accounts_shadow_bot", "shadow_bot_account"),
        Index("idx_accounts_host_ip", "host_ip"),
        Index("idx_accounts_status", "status"),
        Index("idx_accounts_task_control", "task_control"),
        Index("idx_accounts_created_at", "created_at"),
        Index("idx_accounts_task_count", "task_count"),
    )

    def __repr__(self) -> str:
        return f"<Account(id={self.id}, shadow_bot_account={self.shadow_bot_account}, host_ip={self.host_ip})>"
