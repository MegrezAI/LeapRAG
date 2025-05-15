import os
from datetime import datetime
from typing import Optional
from sqlalchemy import String, func, text, Integer, Float, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .model import DictMixin
from .types import StringUUID


class Dialog(Base, DictMixin):
    __tablename__ = "dialogs"

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False, index=True)
    agent_id: Mapped[str] = mapped_column(StringUUID, nullable=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True,
                                                comment="dialog application name")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="Dialog description")
    icon: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="icon base64 string")
    language: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True,
                                                    default="Chinese" if "zh_CN" in os.getenv("LANG",
                                                                                              "") else "English",
                                                    comment="English|Chinese")
    llm_id: Mapped[str] = mapped_column(String(128), nullable=False, comment="default llm ID")
    llm_setting: Mapped[dict] = mapped_column(JSON, nullable=False,
                                              default={"temperature": 0.1, "top_p": 0.3, "frequency_penalty": 0.7,
                                                       "presence_penalty": 0.4, "max_tokens": 512})
    prompt_type: Mapped[str] = mapped_column(String(16), nullable=False, default="simple", index=True,
                                             comment="simple|advanced")
    prompt_config: Mapped[dict] = mapped_column(JSON, nullable=False,
                                                default={"system": "",
                                                         "prologue": "Hi! I'm your assistant, what can I do for you?",
                                                         "parameters": [],
                                                         "empty_response": "Sorry! No relevant content was found in the knowledge base!"})
    similarity_threshold: Mapped[float] = mapped_column(Float, default=0.2)
    vector_similarity_weight: Mapped[float] = mapped_column(Float, default=0.3)
    top_n: Mapped[int] = mapped_column(Integer, default=6)
    top_k: Mapped[int] = mapped_column(Integer, default=1024)
    do_refer: Mapped[str] = mapped_column(String(1), nullable=False, default="1",
                                          comment="it needs to insert reference index into answer or not")
    rerank_id: Mapped[str] = mapped_column(String(128), nullable=False,
                                           comment="default rerank model ID")
    kb_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=[])
    status: Mapped[Optional[str]] = mapped_column(String(1), nullable=True, default="1", index=True,
                                                  comment="is it validate(0: wasted, 1: validate)")
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )


class Conversation(Base, DictMixin):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    dialog_id: Mapped[str] = mapped_column(StringUUID, nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True, comment="conversation name")
    messages: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    reference: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=[])
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
