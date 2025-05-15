from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, func, text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base
from .model import DictMixin
from .types import StringUUID
from .account import Tenant


class Agent(Base, DictMixin):
    """Application Model"""
    __tablename__ = "agents"

    # Primary and Foreign Keys
    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=func.uuid_generate_v4())

    tenant_id: Mapped[str] = mapped_column(StringUUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="apps", lazy="joined")

    # Basic Information
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''::character varying"))
    version: Mapped[str] = mapped_column(String(255), nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(Text)
    url: Mapped[Optional[str]] = mapped_column(Text)
    documentation_url: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(255), nullable=False)
    agent_config: Mapped[dict] = mapped_column(JSON, nullable=False, default={})
    authentication: Mapped[dict] = mapped_column(JSON, nullable=False, default={})
    provider: Mapped[dict] = mapped_column(JSON, nullable=False, default={})
    capabilities: Mapped[dict] = mapped_column(JSON, nullable=False, default={})
    skills: Mapped[list] = mapped_column(JSON, nullable=False, default=[])
    default_input_modes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=["text"])
    default_output_modes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=["text"])

    # Audit Fields
    created_by: Mapped[Optional[str]] = mapped_column(StringUUID)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_by: Mapped[Optional[str]] = mapped_column(StringUUID)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )


class AgentTask(Base, DictMixin):
    __tablename__ = "agent_tasks"

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=func.uuid_generate_v4())
    agent_id: Mapped[str] = mapped_column(StringUUID, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False,
                                          index=True)
    session_id: Mapped[str] = mapped_column(StringUUID, nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(16), nullable=True, index=True)
    message: Mapped[dict] = mapped_column(JSON, default={}, nullable=True)
    push_notification: Mapped[dict] = mapped_column(JSON, default={}, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    artifacts: Mapped[list] = mapped_column(JSON)
    history: Mapped[list] = mapped_column(JSON)
    task_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default={}, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )


class AgentLog(Base, DictMixin):
    __tablename__ = "agent_logs"

    id: Mapped[int] = mapped_column(primary_key=True, nullable=False, autoincrement=True)
    agent_id: Mapped[str] = mapped_column(StringUUID, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False,
                                          index=True)
    type: Mapped[str] = mapped_column(String(36), nullable=True, index=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    headers: Mapped[Optional[dict]] = mapped_column(JSON, default={}, nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=True)
    response_code: Mapped[int] = mapped_column(nullable=True)
    response: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
