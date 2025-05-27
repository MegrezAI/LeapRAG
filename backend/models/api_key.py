from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, func, text, Integer, Float, Text, JSON
from .database import Base
from .model import DictMixin
from .types import StringUUID
from datetime import datetime


class APIToken(Base, DictMixin):
    __tablename__ = "api_tokens"

    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False, primary_key=True)
    apikey: Mapped[str] = mapped_column(String(255), nullable=False, primary_key=True)
    dialog_id: Mapped[str] = mapped_column(StringUUID, nullable=True, index=True)
    agent_id: Mapped[str] = mapped_column(StringUUID, nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(36), nullable=True, comment="none|agent|dialog", index=True)
    beta: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )


class API4Conversation(Base, DictMixin):
    __tablename__ = "api_4_conversations"

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    dialog_id: Mapped[str] = mapped_column(StringUUID, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(StringUUID, nullable=False, comment="user_id", index=True)
    messages: Mapped[dict] = mapped_column(JSON, nullable=True)
    reference: Mapped[list] = mapped_column(JSON, nullable=True, default=[])
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(36), nullable=True, comment="none|agent|dialog", index=True)
    dsl: Mapped[dict] = mapped_column(JSON, nullable=True, default={})
    duration: Mapped[float] = mapped_column(Float, default=0, index=True)
    round: Mapped[int] = mapped_column(Integer, default=0, index=True)
    thumb_up: Mapped[int] = mapped_column(Integer, default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
