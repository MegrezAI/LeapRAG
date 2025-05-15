from datetime import datetime
from typing import Optional
from sqlalchemy import String, func, text
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .model import DictMixin
from .types import StringUUID


class LLMFactory(Base, DictMixin):
    __tablename__ = "llm_factories"

    name: Mapped[str] = mapped_column(String(128), primary_key=True, nullable=False, comment="LLM factory name")
    logo: Mapped[Optional[str]] = mapped_column(String, nullable=True, comment="llm logo base64")
    tags: Mapped[str] = mapped_column(String(255), index=True, nullable=False,
                                      comment="LLM, Text Embedding, Image2Text, ASR")
    status: Mapped[Optional[str]] = mapped_column(String(1), index=True, nullable=True, default="1",
                                                  comment="is it validate(0: wasted, 1: validate)")
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )

    def __str__(self):
        return self.name


class LLM(Base, DictMixin):
    __tablename__ = "llms"

    llm_name: Mapped[str] = mapped_column(String(128), primary_key=True, index=True, nullable=False, comment="LLM name")
    model_type: Mapped[str] = mapped_column(String(128), index=True, nullable=False,
                                            comment="LLM, Text Embedding, Image2Text, ASR")
    fid: Mapped[str] = mapped_column(String(128), primary_key=True, index=True, nullable=False,
                                     comment="LLM factory id")
    max_tokens: Mapped[int] = mapped_column(default=0)
    tags: Mapped[str] = mapped_column(String(255), index=True, nullable=False,
                                      comment="LLM, Text Embedding, Image2Text, Chat, 32k...")
    status: Mapped[Optional[str]] = mapped_column(String(1), index=True, nullable=True, default="1",
                                                  comment="is it validate(0: wasted, 1: validate)")
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )

    def __str__(self):
        return self.llm_name


class TenantLLM(Base, DictMixin):
    __tablename__ = "tenant_llms"

    tenant_id: Mapped[str] = mapped_column(StringUUID, primary_key=True, index=True, nullable=False)
    llm_factory: Mapped[str] = mapped_column(String(128), primary_key=True, index=True, nullable=False,
                                             comment="LLM factory name")
    model_type: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True,
                                                      comment="LLM, Text Embedding, Image2Text, ASR")
    llm_name: Mapped[Optional[str]] = mapped_column(String(128), primary_key=True, index=True, nullable=False,
                                                    default="", comment="LLM name")
    api_key: Mapped[Optional[str]] = mapped_column(String(1024), index=True, nullable=True, comment="API KEY")
    api_base: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment="API Base")
    max_tokens: Mapped[int] = mapped_column(default=8192, index=True)
    used_tokens: Mapped[int] = mapped_column(default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )

    def __str__(self):
        return self.llm_name
