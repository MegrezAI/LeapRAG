import enum
import json
from datetime import datetime
from typing import Optional
from sqlalchemy import String, func, text, UniqueConstraint, Index, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base
from .model import DictMixin
from .types import StringUUID


class TenantAccountJoinRole(enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    NORMAL = "normal"
    DATASET_OPERATOR = "dataset_operator"


class AccountStatus(enum.StrEnum):
    PENDING = "pending"
    UNINITIALIZED = "uninitialized"
    ACTIVE = "active"
    BANNED = "banned"
    CLOSED = "closed"


class Account(Base, DictMixin):
    __tablename__ = "accounts"
    _current_tenant = None

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    password_salt: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    status: Mapped[AccountStatus] = mapped_column(
        String(16),
        nullable=False,
        default=AccountStatus.ACTIVE
    )

    # 可选字段
    avatar: Mapped[Optional[str]] = mapped_column(String)
    interface_language: Mapped[Optional[str]] = mapped_column(String(255))
    interface_theme: Mapped[Optional[str]] = mapped_column(String(255))
    timezone: Mapped[Optional[str]] = mapped_column(String(255))

    # 时间相关字段
    last_login_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    last_login_ip: Mapped[Optional[str]] = mapped_column(String(255))
    last_active_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    initialized_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    @property
    def is_password_set(self) -> bool:
        return self.password is not None

    @property
    def current_tenant(self):
        return self._current_tenant  # type: ignore

    @current_tenant.setter
    def current_tenant(self, tenant):
        if tenant:
            value = tenant.to_dict()
            self._current_tenant = Tenant(**value)
        else:
            self._current_tenant = None

    @property
    def current_tenant_id(self) -> str | None:
        return self._current_tenant.id if self._current_tenant else None

    @property
    def current_role(self):
        return self._current_tenant.current_role

    def get_status(self) -> AccountStatus:
        return self.status

    # check current_user.current_tenant.current_role in ['admin', 'owner']
    @property
    def is_admin_or_owner(self):
        return TenantAccountRole.is_privileged_role(self._current_tenant.current_role)

    @property
    def is_admin(self):
        return TenantAccountRole.is_admin_role(self._current_tenant.current_role)

    @property
    def is_editor(self):
        return TenantAccountRole.is_editing_role(self._current_tenant.current_role)

    @property
    def is_dataset_editor(self):
        return TenantAccountRole.is_dataset_edit_role(self._current_tenant.current_role)

    @property
    def is_dataset_operator(self):
        return self._current_tenant.current_role == TenantAccountRole.DATASET_OPERATOR


class TenantStatus(enum.StrEnum):
    NORMAL = "normal"
    ARCHIVE = "archive"


class TenantAccountRole(enum.StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    NORMAL = "normal"
    DATASET_OPERATOR = "dataset_operator"

    @staticmethod
    def is_valid_role(role: str) -> bool:
        if not role:
            return False
        return role in {
            TenantAccountRole.OWNER,
            TenantAccountRole.ADMIN,
            TenantAccountRole.EDITOR,
            TenantAccountRole.NORMAL,
            TenantAccountRole.DATASET_OPERATOR,
        }

    @staticmethod
    def is_privileged_role(role: str) -> bool:
        if not role:
            return False
        return role in {TenantAccountRole.OWNER, TenantAccountRole.ADMIN}

    @staticmethod
    def is_admin_role(role: str) -> bool:
        if not role:
            return False
        return role == TenantAccountRole.ADMIN

    @staticmethod
    def is_non_owner_role(role: str) -> bool:
        if not role:
            return False
        return role in {
            TenantAccountRole.ADMIN,
            TenantAccountRole.EDITOR,
            TenantAccountRole.NORMAL,
            TenantAccountRole.DATASET_OPERATOR,
        }

    @staticmethod
    def is_editing_role(role: str) -> bool:
        if not role:
            return False
        return role in {TenantAccountRole.OWNER, TenantAccountRole.ADMIN, TenantAccountRole.EDITOR}

    @staticmethod
    def is_dataset_edit_role(role: str) -> bool:
        if not role:
            return False
        return role in {
            TenantAccountRole.OWNER,
            TenantAccountRole.ADMIN,
            TenantAccountRole.EDITOR,
            TenantAccountRole.DATASET_OPERATOR,
        }


class Tenant(Base, DictMixin):
    __tablename__ = "tenants"
    current_role = TenantAccountJoinRole.ADMIN

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypt_public_key: Mapped[Optional[str]] = mapped_column(String)
    encrypt_private_key: Mapped[Optional[str]] = mapped_column(String)
    plan: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        server_default=text("'basic'::character varying")
    )
    status: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        server_default=text("'normal'::character varying")
    )
    custom_config: Mapped[Optional[str]] = mapped_column(String)
    llm_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False, comment="default llm ID")
    embd_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False, comment="default embedding model ID")
    asr_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False, comment="default ASR model ID")
    img2txt_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False,
                                            comment="default image to text model ID")
    rerank_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False, comment="default rerank model ID")
    tts_id: Mapped[Optional[str]] = mapped_column(String(256), index=True, nullable=True,
                                                  comment="default tts model ID")
    parser_ids: Mapped[str] = mapped_column(String(256), index=True, nullable=False, comment="document processors")
    credit: Mapped[int] = mapped_column(default=512, index=True)
    # 定义反向关系
    apps: Mapped[list["Agent"]] = relationship(
        "Agent",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )

    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )

    @property
    def custom_config_dict(self) -> dict:
        return json.loads(self.custom_config) if self.custom_config else {}

    @custom_config_dict.setter
    def custom_config_dict(self, value: dict):
        self.custom_config = json.dumps(value)


class TenantAccountJoin(Base):
    __tablename__ = "tenant_account_joins"
    __table_args__ = (
        Index("tenant_account_join_account_id_idx", "account_id"),
        Index("tenant_account_join_tenant_id_idx", "tenant_id"),
        UniqueConstraint("tenant_id", "account_id", name="unique_tenant_account_join"),
    )

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    tenant_id: Mapped[str] = mapped_column(StringUUID, ForeignKey('tenants.id'), nullable=False)
    account_id: Mapped[str] = mapped_column(StringUUID, ForeignKey('accounts.id'), nullable=False)
    current: Mapped[bool] = mapped_column(nullable=False, server_default=text("false"))
    role: Mapped[str] = mapped_column(String(16), nullable=False, server_default="normal")
    invited_by: Mapped[Optional[str]] = mapped_column(StringUUID, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )

    tenant: Mapped["Tenant"] = relationship("Tenant", backref="tenant_account_joins", lazy="selectin")
    account: Mapped["Account"] = relationship("Account", backref="tenant_account_joins", lazy="selectin")


class AccountIntegrate(Base):
    __tablename__ = "account_integrates"
    __table_args__ = (
        UniqueConstraint("account_id", "provider", name="unique_account_provider"),
        UniqueConstraint("provider", "open_id", name="unique_provider_open_id"),
    )

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    account_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    provider: Mapped[str] = mapped_column(String(16), nullable=False)
    open_id: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_token: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp()
    )


class InvitationCode(Base):
    __tablename__ = "invitation_codes"
    __table_args__ = (
        Index("invitation_codes_batch_idx", "batch"),
        Index("invitation_codes_code_idx", "code", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, nullable=False)
    batch: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'unused'::character varying")
    )
    used_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    used_by_tenant_id: Mapped[Optional[str]] = mapped_column(StringUUID, nullable=True)
    used_by_account_id: Mapped[Optional[str]] = mapped_column(StringUUID, nullable=True)
    deprecated_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP(0)")
    )


class TenantPluginPermission(Base):
    class InstallPermission(enum.StrEnum):
        EVERYONE = "everyone"
        ADMINS = "admins"
        NOBODY = "noone"

    class DebugPermission(enum.StrEnum):
        EVERYONE = "everyone"
        ADMINS = "admins"
        NOBODY = "noone"

    __tablename__ = "account_plugin_permissions"
    __table_args__ = (
        UniqueConstraint("tenant_id", name="unique_tenant_plugin"),
    )

    id: Mapped[str] = mapped_column(StringUUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    install_permission: Mapped[InstallPermission] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'everyone'::character varying")
    )
    debug_permission: Mapped[DebugPermission] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'noone'::character varying")
    )
