import os
from datetime import datetime
from typing import Optional
from sqlalchemy import String, func, text, Integer, Float, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .model import DictMixin
from .types import StringUUID
from strenum import StrEnum
from sqlalchemy import Index


class Task(Base, DictMixin):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    doc_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    from_page: Mapped[int] = mapped_column(Integer, default=0)
    to_page: Mapped[int] = mapped_column(Integer, default=100000000)
    begin_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)
    process_duration: Mapped[float] = mapped_column(Float, default=0)
    progress: Mapped[float] = mapped_column(Float, default=0, index=True)
    progress_msg: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="", comment="process message")
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    task_type: Mapped[str] = mapped_column(String(32), default="")
    digest: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="", comment="task digest")
    chunk_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="", comment="chunk ids")
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )

    __table_args__ = (
        Index('idx_doc_id_task_type_unique', 'doc_id', 'task_type', 'from_page', unique=True),
    )


class ParserType(StrEnum):
    LAWS = "laws"
    MANUAL = "manual"
    PAPER = "paper"
    BOOK = "book"
    QA = "qa"
    TABLE = "table"
    NAIVE = "naive"
    PICTURE = "picture"
    ONE = "one"
    AUDIO = "audio"
    EMAIL = "email"
    KG = "knowledge_graph"
    TAG = "tag"


class Knowledgebase(Base, DictMixin):
    __tablename__ = "knowledgebases"

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    avatar: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tenant_id: Mapped[str] = mapped_column(StringUUID, index=True)
    name: Mapped[str] = mapped_column(String(128), index=True)
    language: Mapped[Optional[str]] = mapped_column(String(32), nullable=True,
                                                    default="Chinese" if "zh_CN" in os.getenv("LANG",
                                                                                              "") else "English",
                                                    index=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    embd_id: Mapped[str] = mapped_column(String(128), index=True)
    permission: Mapped[str] = mapped_column(String(16), default="me", index=True)
    created_by: Mapped[str] = mapped_column(StringUUID, index=True)
    doc_num: Mapped[int] = mapped_column(default=0, index=True)
    token_num: Mapped[int] = mapped_column(default=0, index=True)
    chunk_num: Mapped[int] = mapped_column(default=0, index=True)
    similarity_threshold: Mapped[float] = mapped_column(default=0.2, index=True)
    vector_similarity_weight: Mapped[float] = mapped_column(default=0.3, index=True)
    parser_id: Mapped[str] = mapped_column(String(32), default=ParserType.NAIVE.value, index=True)
    parser_config: Mapped[dict] = mapped_column(JSON,
                                                default={"raptor": {"use_raptor": True}, "pages": [[1, 1000000]]})
    pagerank: Mapped[int] = mapped_column(default=0)
    status: Mapped[Optional[str]] = mapped_column(String(1), default="1", nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )

    def __str__(self) -> str:
        return self.name


class Document(Base, DictMixin):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    thumbnail: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    kb_id: Mapped[str] = mapped_column(StringUUID, index=True)
    parser_id: Mapped[str] = mapped_column(String(32), index=True)
    parser_config: Mapped[dict] = mapped_column(JSON, default={"pages": [[1, 1000000]]})
    source_type: Mapped[str] = mapped_column(String(128), default="local", index=True)
    type: Mapped[str] = mapped_column(String(32), index=True)
    created_by: Mapped[str] = mapped_column(StringUUID, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    size: Mapped[int] = mapped_column(default=0, index=True)
    token_num: Mapped[int] = mapped_column(default=0, index=True)
    chunk_num: Mapped[int] = mapped_column(default=0, index=True)
    progress: Mapped[float] = mapped_column(default=0, index=True)
    progress_msg: Mapped[Optional[str]] = mapped_column(String, default="", nullable=True)
    process_begin_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)
    process_duration: Mapped[float] = mapped_column(default=0)
    meta_fields: Mapped[Optional[dict]] = mapped_column(JSON, default={}, nullable=True)
    run: Mapped[Optional[str]] = mapped_column(String(1), default="0", nullable=True, index=True)
    status: Mapped[Optional[str]] = mapped_column(String(1), default="1", nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )


class File(Base, DictMixin):
    __tablename__ = "files"

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    parent_id: Mapped[str] = mapped_column(StringUUID, index=True)
    tenant_id: Mapped[str] = mapped_column(StringUUID, index=True)
    created_by: Mapped[str] = mapped_column(StringUUID, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    size: Mapped[int] = mapped_column(default=0, index=True)
    type: Mapped[str] = mapped_column(String(32), index=True)
    source_type: Mapped[str] = mapped_column(String(128), default="", index=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )


class File2Document(Base, DictMixin):
    __tablename__ = "file2documents"

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    file_id: Mapped[Optional[str]] = mapped_column(StringUUID, nullable=True, index=True)
    document_id: Mapped[Optional[str]] = mapped_column(StringUUID, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
