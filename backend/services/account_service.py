import base64
import json
import logging
import random
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any, Optional, cast
from sqlalchemy import select, update, delete

from fastapi_login.exceptions import InvalidCredentialsException
from pydantic import BaseModel
from sqlalchemy import func

from extensions.ext_login import login_manager
from services import settings
from configs import app_config
from libs.languages import language_timezone_mapping, languages
from extensions.ext_redis import redis_client
from libs.helper import RateLimiter, TokenManager
from libs.password import compare_password, hash_password
from libs.rsa import generate_key_pair
from libs.base_error import BusinessError
from services.common_service import CommonService
from services.service_error_code import ServiceErrorCode
from models import transactional
from models.account import (
    Account,
    AccountIntegrate,
    AccountStatus,
    Tenant,
    TenantAccountJoin,
    TenantAccountJoinRole,
    TenantAccountRole,
    TenantStatus,
)
from models import get_current_session
from services.billing_service import BillingService
from services.utils import get_uuid


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str


REFRESH_TOKEN_PREFIX = "refresh_token:"
ACCOUNT_REFRESH_TOKEN_PREFIX = "account_refresh_token:"
REFRESH_TOKEN_EXPIRY = timedelta(days=app_config.REFRESH_TOKEN_EXPIRE_DAYS)


class AccountService(CommonService):
    model = Account

    reset_password_rate_limiter = RateLimiter(prefix="reset_password_rate_limit", max_attempts=1, time_window=60 * 1)
    email_code_login_rate_limiter = RateLimiter(
        prefix="email_code_login_rate_limit", max_attempts=1, time_window=60 * 1
    )
    email_code_account_deletion_rate_limiter = RateLimiter(
        prefix="email_code_account_deletion_rate_limit", max_attempts=1, time_window=60 * 1
    )
    LOGIN_MAX_ERROR_LIMITS = 5
    FORGOT_PASSWORD_MAX_ERROR_LIMITS = 5

    @staticmethod
    def _get_refresh_token_key(refresh_token: str) -> str:
        return f"{REFRESH_TOKEN_PREFIX}{refresh_token}"

    @staticmethod
    def _get_account_refresh_token_key(account_id: str) -> str:
        return f"{ACCOUNT_REFRESH_TOKEN_PREFIX}{account_id}"

    @staticmethod
    def _store_refresh_token(refresh_token: str, account_id: str) -> None:
        redis_client.setex(AccountService._get_refresh_token_key(refresh_token), REFRESH_TOKEN_EXPIRY, account_id)
        redis_client.setex(
            AccountService._get_account_refresh_token_key(account_id), REFRESH_TOKEN_EXPIRY, refresh_token
        )

    @staticmethod
    def _delete_refresh_token(refresh_token: str, account_id: str) -> None:
        redis_client.delete(AccountService._get_refresh_token_key(refresh_token))
        redis_client.delete(AccountService._get_account_refresh_token_key(account_id))

    @staticmethod
    @transactional
    async def authenticate(email: str, password: str, invite_token: Optional[str] = None) -> Account:
        """authenticate account with email and password"""
        session = get_current_session()
        result = await session.execute(select(Account).filter_by(email=email))
        account = result.scalars().first()
        if not account:
            raise BusinessError(error_code=ServiceErrorCode.ACCOUNT_NOT_FOUND, description=f"email={email}")

        if account.status == AccountStatus.BANNED.value:
            raise BusinessError(error_code=ServiceErrorCode.ACCOUNT_BANNED)

        if password and invite_token and account.password is None:
            # if invite_token is valid, set password and password_salt
            salt = secrets.token_bytes(16)
            base64_salt = base64.b64encode(salt).decode()
            password_hashed = hash_password(password, salt)
            base64_password_hashed = base64.b64encode(password_hashed).decode()
            account.password = base64_password_hashed
            account.password_salt = base64_salt

        if account.password is None or not compare_password(password, account.password, account.password_salt):
            raise InvalidCredentialsException

        if account.status == AccountStatus.PENDING.value:
            account.status = AccountStatus.ACTIVE.value
            account.initialized_at = datetime.now(UTC).replace(tzinfo=None)

        return account

    @staticmethod
    @transactional
    async def update_account_password(account, password, new_password):
        """update account password"""
        if account.password and not compare_password(password, account.password, account.password_salt):
            raise BusinessError(error_code=ServiceErrorCode.CURRENT_PASSWORD_INCORRECT)

        # generate password salt
        salt = secrets.token_bytes(16)
        base64_salt = base64.b64encode(salt).decode()

        # encrypt password with salt
        password_hashed = hash_password(new_password, salt)
        base64_password_hashed = base64.b64encode(password_hashed).decode()
        account.password = base64_password_hashed
        account.password_salt = base64_salt

        return account

    @staticmethod
    @transactional
    async def create_account(
            email: str,
            name: str,
            interface_language: str,
            password: Optional[str] = None,
            interface_theme: str = "light",
            is_setup: Optional[bool] = False
    ) -> Account:

        account = Account()
        account.id = get_uuid()
        account.email = email
        account.username = name

        if password:
            # generate password salt
            salt = secrets.token_bytes(16)
            base64_salt = base64.b64encode(salt).decode()

            # encrypt password with salt
            password_hashed = hash_password(password, salt)
            base64_password_hashed = base64.b64encode(password_hashed).decode()

            account.password = base64_password_hashed
            account.password_salt = base64_salt

        account.interface_language = interface_language
        account.interface_theme = interface_theme

        # Set timezone based on language
        account.timezone = language_timezone_mapping.get(interface_language, "UTC")

        session = get_current_session()
        session.add(account)

        return account

    @staticmethod
    @transactional
    async def create_account_and_tenant(
            email: str, name: str, interface_language: str, password: Optional[str] = None
    ) -> Account:
        """create account"""
        account = await AccountService.create_account(
            email=email, name=name, interface_language=interface_language, password=password
        )

        await TenantService.create_owner_tenant_if_not_exist(account=account)

        return account

    @staticmethod
    @transactional
    def generate_account_deletion_verification_code(account: Account) -> tuple[str, str]:
        code = "".join([str(random.randint(0, 9)) for _ in range(6)])
        token = TokenManager.generate_token(
            account=account, token_type="account_deletion", additional_data={"code": code}
        )
        return token, code

    @classmethod
    @transactional
    def send_account_deletion_verification_email(cls, account: Account, code: str):
        email = account.email
        if cls.email_code_account_deletion_rate_limiter.is_rate_limited(email):
            raise BusinessError(error_code=ServiceErrorCode.EMAIL_CODE_ACCOUNT_DELETION_RATE_LIMIT_EXCEEDED)

        # send_account_deletion_verification_code.delay(to=email, code=code)

        cls.email_code_account_deletion_rate_limiter.increment_rate_limit(email)

    @staticmethod
    def verify_account_deletion_code(token: str, code: str) -> bool:
        token_data = TokenManager.get_token_data(token, "account_deletion")
        if token_data is None:
            return False

        if token_data["code"] != code:
            return False

        return True

    @staticmethod
    async def delete_account(account: Account) -> None:
        pass
        # delete_account_task.delay(account.id)

    @staticmethod
    async def get_account_integrate(account_id: str) -> list[AccountIntegrate]:
        """Get account integrate"""
        session = get_current_session()
        result = await session.execute(select(AccountIntegrate).filter(AccountIntegrate.account_id == account_id))
        return list(result.scalars().all())

    @staticmethod
    @transactional
    async def link_account_integrate(provider: str, open_id: str, account: Account) -> None:
        """Link account integrate"""
        try:
            session = get_current_session()
            # Query whether there is an existing binding record for the same provider
            result = await session.execute(
                select(AccountIntegrate).filter_by(account_id=account.id, provider=provider)
            )
            account_integrate: Optional[AccountIntegrate] = result.scalars().first()

            if account_integrate:
                # If it exists, update the record
                account_integrate.open_id = open_id
                account_integrate.encrypted_token = ""  # todo
                account_integrate.updated_at = datetime.now(UTC).replace(tzinfo=None)
            else:
                # If it does not exist, create a new record
                account_integrate = AccountIntegrate(
                    account_id=account.id, provider=provider, open_id=open_id, encrypted_token=""
                )
                session.add(account_integrate)

            logging.info(f"Account {account.id} linked {provider} account {open_id}.")
        except Exception as e:
            logging.exception(f"Failed to link {provider} account {open_id} to Account {account.id}")
            raise BusinessError(error_code=ServiceErrorCode.LINK_ACCOUNT_INTEGRATE_ERROR)

    @staticmethod
    @transactional
    async def update_login_info(account: Account, *, ip_address: str) -> None:
        """Update last login time and ip"""
        account.last_login_at = datetime.now(UTC).replace(tzinfo=None)
        account.last_login_ip = ip_address
        session = get_current_session()
        session.add(account)

    @staticmethod
    @transactional
    async def login(account: Account, *, ip_address: Optional[str] = None) -> TokenPair:
        if ip_address:
            await AccountService.update_login_info(account=account, ip_address=ip_address)

        if account.status == AccountStatus.PENDING.value:
            account.status = AccountStatus.ACTIVE.value

        access_token = login_manager.create_access_token(data=dict(sub=account.id), expires=timedelta(minutes=10))
        refresh_token = _generate_refresh_token()

        AccountService._store_refresh_token(refresh_token, account.id)

        return TokenPair(access_token=access_token, refresh_token=refresh_token)

    @staticmethod
    async def logout(account: Account) -> None:
        key = AccountService._get_account_refresh_token_key(account.id)
        refresh_token = redis_client.get(key)
        if refresh_token:
            AccountService._delete_refresh_token(refresh_token.decode("utf-8"), account.id)

    @staticmethod
    @transactional
    async def refresh_token(refresh_token: str) -> TokenPair:
        # Verify the refresh token
        account_id = redis_client.get(AccountService._get_refresh_token_key(refresh_token))
        if not account_id:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Invalid refresh token")

        account = await AccountService.get_by_id(account_id.decode("utf-8"))
        if not account:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Invalid account")

        # Generate new access token and refresh token
        new_access_token = login_manager.create_access_token(data=dict(sub=account.id), expires=timedelta(hours=1))
        new_refresh_token = _generate_refresh_token()

        AccountService._delete_refresh_token(refresh_token, account.id)
        AccountService._store_refresh_token(new_refresh_token, account.id)

        return TokenPair(access_token=new_access_token, refresh_token=new_refresh_token)

    @classmethod
    @transactional
    def send_reset_password_email(
            cls,
            account: Optional[Account] = None,
            email: Optional[str] = None,
            language: Optional[str] = "en-US",
    ):
        account_email = account.email if account else email
        if account_email is None:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Email must be provided.")

        if cls.reset_password_rate_limiter.is_rate_limited(account_email):
            raise BusinessError(error_code=ServiceErrorCode.PASSWORD_RESET_RATE_LIMIT_EXCEEDED)

        code = "".join([str(random.randint(0, 9)) for _ in range(6)])
        token = TokenManager.generate_token(
            account=account, email=email, token_type="reset_password", additional_data={"code": code}
        )
        # send_reset_password_mail_task.delay(
        #     language=language,
        #     to=account_email,
        #     code=code,
        # )
        cls.reset_password_rate_limiter.increment_rate_limit(account_email)
        return token

    @classmethod
    def revoke_reset_password_token(cls, token: str):
        TokenManager.revoke_token(token, "reset_password")

    @classmethod
    def get_reset_password_data(cls, token: str) -> Optional[dict[str, Any]]:
        return TokenManager.get_token_data(token, "reset_password")

    @classmethod
    @transactional
    def send_email_code_login_email(
            cls, account: Optional[Account] = None, email: Optional[str] = None, language: Optional[str] = "en-US"
    ):
        email = account.email if account else email
        if email is None:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Email must be provided.")
        if cls.email_code_login_rate_limiter.is_rate_limited(email):
            raise BusinessError(error_code=ServiceErrorCode.EMAIL_CODE_LOGIN_RATE_LIMIT_EXCEEDED)

        code = "".join([str(random.randint(0, 9)) for _ in range(6)])
        token = TokenManager.generate_token(
            account=account, email=email, token_type="email_code_login", additional_data={"code": code}
        )
        # send_email_code_login_mail_task.delay(
        #     language=language,
        #     to=account.email if account else email,
        #     code=code,
        # )
        cls.email_code_login_rate_limiter.increment_rate_limit(email)
        return token

    @classmethod
    def get_email_code_login_data(cls, token: str) -> Optional[dict[str, Any]]:
        return TokenManager.get_token_data(token, "email_code_login")

    @classmethod
    def revoke_email_code_login_token(cls, token: str):
        TokenManager.revoke_token(token, "email_code_login")

    @classmethod
    async def get_user_through_email(cls, email: str):
        if app_config.BILLING_ENABLED and BillingService.is_email_in_freeze(email):
            raise BusinessError(error_code=ServiceErrorCode.ACCOUNT_IN_FREEZE)

        session = get_current_session()
        result = await session.execute(select(Account).filter(Account.email == email))
        account = result.scalars().first()
        if not account:
            return None

        if account.status == AccountStatus.BANNED.value:
            raise BusinessError(error_code=ServiceErrorCode.ACCOUNT_BANNED)

        return account

    @staticmethod
    def add_login_error_rate_limit(email: str) -> None:
        key = f"login_error_rate_limit:{email}"
        count = redis_client.get(key)
        if count is None:
            count = 0
        count = int(count) + 1
        redis_client.setex(key, app_config.LOGIN_LOCKOUT_DURATION, count)

    @staticmethod
    def is_login_error_rate_limit(email: str) -> bool:
        key = f"login_error_rate_limit:{email}"
        count = redis_client.get(key)
        if count is None:
            return False

        count = int(count)
        if count > AccountService.LOGIN_MAX_ERROR_LIMITS:
            return True
        return False

    @staticmethod
    def reset_login_error_rate_limit(email: str):
        key = f"login_error_rate_limit:{email}"
        redis_client.delete(key)

    @staticmethod
    def add_forgot_password_error_rate_limit(email: str) -> None:
        key = f"forgot_password_error_rate_limit:{email}"
        count = redis_client.get(key)
        if count is None:
            count = 0
        count = int(count) + 1
        redis_client.setex(key, app_config.FORGOT_PASSWORD_LOCKOUT_DURATION, count)

    @staticmethod
    def is_forgot_password_error_rate_limit(email: str) -> bool:
        key = f"forgot_password_error_rate_limit:{email}"
        count = redis_client.get(key)
        if count is None:
            return False

        count = int(count)
        if count > AccountService.FORGOT_PASSWORD_MAX_ERROR_LIMITS:
            return True
        return False

    @staticmethod
    def reset_forgot_password_error_rate_limit(email: str):
        key = f"forgot_password_error_rate_limit:{email}"
        redis_client.delete(key)

    @staticmethod
    def is_email_send_ip_limit(ip_address: str):
        minute_key = f"email_send_ip_limit_minute:{ip_address}"
        freeze_key = f"email_send_ip_limit_freeze:{ip_address}"
        hour_limit_key = f"email_send_ip_limit_hour:{ip_address}"

        # check ip is frozen
        if redis_client.get(freeze_key):
            return True

        # check current minute count
        current_minute_count = redis_client.get(minute_key)
        if current_minute_count is None:
            current_minute_count = 0
        current_minute_count = int(current_minute_count)

        # check current hour count
        if current_minute_count > app_config.EMAIL_SEND_IP_LIMIT_PER_MINUTE:
            hour_limit_count = redis_client.get(hour_limit_key)
            if hour_limit_count is None:
                hour_limit_count = 0
            hour_limit_count = int(hour_limit_count)

            if hour_limit_count >= 1:
                redis_client.setex(freeze_key, 60 * 60, 1)
                return True
            else:
                redis_client.setex(hour_limit_key, 60 * 10, hour_limit_count + 1)  # first time limit 10 minutes

            # add hour limit count
            redis_client.incr(hour_limit_key)
            redis_client.expire(hour_limit_key, 60 * 60)

            return True

        redis_client.setex(minute_key, 60, current_minute_count + 1)
        redis_client.expire(minute_key, 60)

        return False


def _get_login_cache_key(*, account_id: str, token: str):
    return f"account_login:{account_id}:{token}"


class TenantService(CommonService):
    model = Tenant

    @staticmethod
    @transactional
    async def create_tenant(name: str,
                            llm_id: Optional[str] = settings.CHAT_MDL,
                            embd_id: Optional[str] = settings.EMBEDDING_MDL,
                            asr_id: Optional[str] = settings.ASR_MDL,
                            parser_ids: Optional[str] = settings.PARSERS,
                            img2txt_id: Optional[str] = settings.IMAGE2TEXT_MDL,
                            rerank_id: Optional[str] = settings.RERANK_MDL) -> Tenant:
        """Create tenant"""
        tenant = Tenant(id=get_uuid(),
                        name=name,
                        llm_id=llm_id,
                        embd_id=embd_id,
                        asr_id=asr_id,
                        parser_ids=parser_ids,
                        img2txt_id=img2txt_id,
                        rerank_id=rerank_id)

        session = get_current_session()
        session.add(tenant)

        keypair = generate_key_pair(tenant.id)
        tenant.encrypt_public_key = keypair[0]
        tenant.encrypt_private_key = keypair[1]

        return tenant

    @staticmethod
    @transactional
    async def create_owner_tenant_if_not_exist(
            account: Account, name: Optional[str] = None, is_setup: Optional[bool] = False
    ):
        """Check if user have a workspace or not"""
        session = get_current_session()
        available_ta = (
            await session.execute(
                select(TenantAccountJoin).filter_by(account_id=account.id).order_by(TenantAccountJoin.id.asc()))
        ).scalars().first()

        if available_ta:
            return

        if name:
            tenant = await TenantService.create_tenant(name=name, is_setup=is_setup)
        else:
            tenant = await TenantService.create_tenant(name=f"{account.username}'s Workspace", is_setup=is_setup)
        await TenantService.create_tenant_member(tenant, account, role="owner")
        account.current_tenant = tenant

    @staticmethod
    @transactional
    async def create_tenant_member(tenant: Tenant, account: Account, role: str = "normal") -> TenantAccountJoin:
        """Create tenant member"""
        if role == TenantAccountJoinRole.OWNER.value:
            if await TenantService.has_roles(tenant, [TenantAccountJoinRole.OWNER]):
                logging.error(f"Tenant {tenant.id} has already an owner.")
                raise Exception("Tenant already has an owner.")

        session = get_current_session()
        ta = (
            await session.execute(select(TenantAccountJoin).filter_by(tenant_id=tenant.id, account_id=account.id))
        ).scalars().first()
        if ta:
            ta.role = role
        else:
            ta = TenantAccountJoin(id=get_uuid(), tenant_id=tenant.id, account_id=account.id, role=role)
            session.add(ta)

        return ta

    @staticmethod
    async def get_join_tenants(account: Account) -> list[Tenant]:
        """Get account join tenants"""
        session = get_current_session()
        result = await session.execute(
            select(Tenant).join(TenantAccountJoin, Tenant.id == TenantAccountJoin.tenant_id).filter(
                TenantAccountJoin.account_id == account.id, Tenant.status == TenantStatus.NORMAL
            )
        )
        return list(result.scalars().all())

    @staticmethod
    @transactional
    async def get_current_tenant_by_account(account: Account):
        """Get tenant by account and add the role"""
        tenant = account.current_tenant
        if not tenant:
            raise BusinessError(error_code=ServiceErrorCode.TENANT_NOT_FOUND,
                                description=f"Tenant not found for account.id={account.id}")

        session = get_current_session()
        ta = (
            await session.execute(select(TenantAccountJoin).filter_by(tenant_id=tenant.id, account_id=account.id))
        ).scalars().first()
        if ta:
            tenant.role = ta.role
        else:
            raise BusinessError(error_code=ServiceErrorCode.TENANT_NOT_FOUND,
                                description=f"Tenant not found for tenant.id={tenant.id}")
        return tenant

    @staticmethod
    @transactional
    async def switch_tenant(account: Account, tenant_id: Optional[str] = None) -> None:
        """Switch the current workspace for the account"""

        # Ensure tenant_id is provided
        if tenant_id is None:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Tenant ID must be provided.")

        session = get_current_session()
        tenant_account_join = (
            await session.execute(
                select(TenantAccountJoin).join(Tenant, TenantAccountJoin.tenant_id == Tenant.id).filter(
                    TenantAccountJoin.account_id == account.id,
                    TenantAccountJoin.tenant_id == tenant_id,
                    Tenant.status == TenantStatus.NORMAL,
                )
            )
        ).scalars().first()

        if not tenant_account_join:
            raise BusinessError(error_code=ServiceErrorCode.ACCOUNT_NOT_LINK_TENANT)
        else:
            await session.execute(
                update(TenantAccountJoin).filter(
                    TenantAccountJoin.account_id == account.id, TenantAccountJoin.tenant_id != tenant_id
                ).values(current=False)
            )
            tenant_account_join.current = True

            account.current_tenant = tenant_account_join

    @staticmethod
    async def get_tenant_members(tenant: Tenant) -> list[Account]:
        """Get tenant members"""
        session = get_current_session()
        query = (
            select(Account, TenantAccountJoin.role).select_from(Account).join(TenantAccountJoin,
                                                                              Account.id == TenantAccountJoin.account_id).filter(
                TenantAccountJoin.tenant_id == tenant.id
            )
        )
        result = await session.execute(query)

        # Initialize an empty list to store the updated accounts
        updated_accounts = []

        for account, role in result:
            account.role = role
            updated_accounts.append(account)

        return updated_accounts

    @staticmethod
    async def get_dataset_operator_members(tenant: Tenant) -> list[Account]:
        """Get dataset admin members"""
        session = get_current_session()
        query = (
            select(Account, TenantAccountJoin.role).select_from(Account).join(TenantAccountJoin,
                                                                              Account.id == TenantAccountJoin.account_id).filter(
                TenantAccountJoin.tenant_id == tenant.id
            ).filter(TenantAccountJoin.role == "dataset_operator")
        )
        result = await session.execute(query)

        # Initialize an empty list to store the updated accounts
        updated_accounts = []

        for account, role in result:
            account.role = role
            updated_accounts.append(account)

        return updated_accounts

    @staticmethod
    async def has_roles(tenant: Tenant, roles: list[TenantAccountJoinRole]) -> bool:
        """Check if user has any of the given roles for a tenant"""
        if not all(isinstance(role, TenantAccountJoinRole) for role in roles):
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "all roles must be TenantAccountJoinRole")

        session = get_current_session()
        result = await session.execute(
            select(TenantAccountJoin).filter(
                TenantAccountJoin.tenant_id == tenant.id, TenantAccountJoin.role.in_([role.value for role in roles])
            )
        )
        return result.scalars().first() is not None

    @staticmethod
    async def get_user_role(account: Account, tenant: Tenant) -> Optional[TenantAccountJoinRole]:
        """Get the role of the current account for a given tenant"""
        session = get_current_session()
        join = (
            await session.execute(select(TenantAccountJoin).filter(TenantAccountJoin.tenant_id == tenant.id,
                                                                   TenantAccountJoin.account_id == account.id))
        ).scalars().first()
        return join.role if join else None

    @staticmethod
    async def get_tenant_count() -> int:
        """Get tenant count"""
        session = get_current_session()
        result = await session.execute(select(func.count(Tenant.id)))
        return cast(int, result.scalar())

    @staticmethod
    async def check_member_permission(tenant: Tenant, operator: Account, member: Account | None, action: str) -> None:
        """Check member permission"""
        perms = {
            "add": [TenantAccountRole.OWNER, TenantAccountRole.ADMIN],
            "remove": [TenantAccountRole.OWNER],
            "update": [TenantAccountRole.OWNER],
        }
        if action not in {"add", "remove", "update"}:
            raise BusinessError(error_code=ServiceErrorCode.INVALID_ACTION)

        if member:
            if operator.id == member.id:
                raise BusinessError(error_code=ServiceErrorCode.CANNOT_OPERATE_SELF)

        session = get_current_session()
        ta_operator = (
            await session.execute(select(TenantAccountJoin).filter_by(tenant_id=tenant.id, account_id=operator.id))
        ).scalars().first()

        if not ta_operator or ta_operator.role not in perms[action]:
            raise BusinessError(error_code=ServiceErrorCode.NO_PERMISSION)

    @staticmethod
    @transactional
    async def remove_member_from_tenant(tenant: Tenant, account: Account, operator: Account) -> None:
        """Remove member from tenant"""
        if operator.id == account.id and await TenantService.check_member_permission(tenant, operator, account,
                                                                                     "remove"):
            raise BusinessError(error_code=ServiceErrorCode.CANNOT_OPERATE_SELF)

        session = get_current_session()
        ta = (
            await session.execute(select(TenantAccountJoin).filter_by(tenant_id=tenant.id, account_id=account.id))
        ).scalars().first()
        if not ta:
            raise BusinessError(error_code=ServiceErrorCode.MEMBER_NOT_IN_TENANT)

        await session.delete(ta)

    @staticmethod
    @transactional
    async def update_member_role(tenant: Tenant, member: Account, new_role: str, operator: Account) -> None:
        """Update member role"""
        await TenantService.check_member_permission(tenant, operator, member, "update")

        session = get_current_session()
        target_member_join = (
            await session.execute(select(TenantAccountJoin).filter_by(tenant_id=tenant.id, account_id=member.id))
        ).scalars().first()

        if target_member_join.role == new_role:
            raise BusinessError(error_code=ServiceErrorCode.ROLE_ALREADY_ASSIGNED)

        if new_role == "owner":
            # Find the current owner and change their role to 'admin'
            current_owner_join = (
                await session.execute(select(TenantAccountJoin).filter_by(tenant_id=tenant.id, role="owner"))
            ).scalars().first()
            current_owner_join.role = "admin"

        # Update the role of the target member
        target_member_join.role = new_role

    @staticmethod
    @transactional
    async def dissolve_tenant(tenant: Tenant, operator: Account) -> None:
        """Dissolve tenant"""
        if not await TenantService.check_member_permission(tenant, operator, operator, "remove"):
            raise BusinessError(error_code=ServiceErrorCode.NO_PERMISSION)
        session = get_current_session()
        await session.execute(delete(TenantAccountJoin).filter_by(tenant_id=tenant.id))
        await session.delete(tenant)

    @staticmethod
    async def get_custom_config(tenant_id: str) -> dict:
        session = get_current_session()
        tenant = (await session.execute(select(Tenant).filter(Tenant.id == tenant_id))).scalars().one()

        return cast(dict, tenant.custom_config_dict)


class RegisterService:
    @classmethod
    def _get_invitation_token_key(cls, token: str) -> str:
        return f"member_invite:token:{token}"

    @classmethod
    @transactional
    async def register(
            cls,
            email,
            name,
            password: Optional[str] = None,
            ip_address: Optional[str] = None,
            open_id: Optional[str] = None,
            provider: Optional[str] = None,
            language: Optional[str] = None,
            status: Optional[AccountStatus] = None,
            is_setup: Optional[bool] = False
    ) -> Account:

        """Register account"""
        account = await AccountService.create_account(
            email=email,
            name=name,
            interface_language=language or languages[0],
            password=password,
            is_setup=is_setup,
        )
        account.status = AccountStatus.ACTIVE.value if not status else status.value
        account.initialized_at = datetime.now(UTC).replace(tzinfo=None)
        account.last_login_ip = ip_address

        if open_id is not None and provider is not None:
            await AccountService.link_account_integrate(provider, open_id, account)

        tenant = await TenantService.create_tenant(f"{account.username}'s Workspace")
        await TenantService.create_tenant_member(tenant, account, role="owner")
        account.current_tenant = tenant
        return account

    @classmethod
    @transactional
    async def invite_new_member(
            cls, tenant: Tenant, email: str, language: str, role: str = "normal", inviter: Account | None = None
    ) -> str:
        if not inviter:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Inviter is required")

        """Invite new member"""
        session = get_current_session()
        account = (await session.execute(select(Account).filter_by(email=email))).scalars().first()

        if not account:
            await TenantService.check_member_permission(tenant, inviter, None, "add")
            name = email.split("@")[0]

            account = await cls.register(
                email=email, name=name, language=language, status=AccountStatus.PENDING, is_setup=True
            )
            # Create new tenant member for invited tenant
            await TenantService.create_tenant_member(tenant, account, role)
            await TenantService.switch_tenant(account, tenant.id)
        else:
            await TenantService.check_member_permission(tenant, inviter, account, "add")
            ta = (
                await session.execute(select(TenantAccountJoin).filter_by(tenant_id=tenant.id, account_id=account.id))
            ).scalars().first()

            if not ta:
                await TenantService.create_tenant_member(tenant, account, role)

            # Support resend invitation email when the account is pending status
            if account.status != AccountStatus.PENDING.value:
                raise BusinessError(error_code=ServiceErrorCode.ACCOUNT_ALREADY_IN_TENANT)

        token = cls.generate_invite_token(tenant, account)

        # send email
        # send_invite_member_mail_task.delay(
        #     language=account.interface_language,
        #     to=email,
        #     token=token,
        #     inviter_name=inviter.name if inviter else "Leap",
        #     workspace_name=tenant.name,
        # )

        return token

    @classmethod
    def generate_invite_token(cls, tenant: Tenant, account: Account) -> str:
        token = str(uuid.uuid4())
        invitation_data = {
            "account_id": account.id,
            "email": account.email,
            "workspace_id": tenant.id,
        }
        expiry_hours = app_config.INVITE_EXPIRY_HOURS
        redis_client.setex(cls._get_invitation_token_key(token), expiry_hours * 60 * 60, json.dumps(invitation_data))
        return token

    @classmethod
    def is_valid_invite_token(cls, token: str) -> bool:
        data = redis_client.get(cls._get_invitation_token_key(token))
        return data is not None

    @classmethod
    def revoke_token(cls, workspace_id: str, email: str, token: str):
        if workspace_id and email:
            email_hash = sha256(email.encode()).hexdigest()
            cache_key = "member_invite_token:{}, {}:{}".format(workspace_id, email_hash, token)
            redis_client.delete(cache_key)
        else:
            redis_client.delete(cls._get_invitation_token_key(token))

    @classmethod
    async def get_invitation_if_token_valid(
            cls, workspace_id: Optional[str], email: str, token: str
    ) -> Optional[dict[str, Any]]:
        invitation_data = await cls._get_invitation_by_token(token, workspace_id, email)
        if not invitation_data:
            return None

        session = get_current_session()
        tenant = (
            await session.execute(
                select(Tenant).filter(Tenant.id == invitation_data["workspace_id"], Tenant.status == "normal"))
        ).scalars().first()

        if not tenant:
            return None

        tenant_account = (
            await session.execute(
                select(Account, TenantAccountJoin.role).join(TenantAccountJoin,
                                                             Account.id == TenantAccountJoin.account_id).filter(
                    Account.email == invitation_data["email"], TenantAccountJoin.tenant_id == tenant.id
                )
            )
        ).first()

        if not tenant_account:
            return None

        account = tenant_account[0]
        if not account:
            return None

        if invitation_data["account_id"] != str(account.id):
            return None

        return {
            "account": account,
            "data": invitation_data,
            "tenant": tenant,
        }

    @classmethod
    async def _get_invitation_by_token(
            cls, token: str, workspace_id: Optional[str] = None, email: Optional[str] = None
    ) -> Optional[dict[str, str]]:
        if workspace_id is not None and email is not None:
            email_hash = sha256(email.encode()).hexdigest()
            cache_key = f"member_invite_token:{workspace_id}, {email_hash}:{token}"
            account_id = redis_client.get(cache_key)

            if not account_id:
                return None

            return {
                "account_id": account_id.decode("utf-8"),
                "email": email,
                "workspace_id": workspace_id,
            }
        else:
            data = redis_client.get(cls._get_invitation_token_key(token))
            if not data:
                return None

            invitation: dict = json.loads(data)
            return invitation


def _generate_refresh_token(length: int = 64):
    token = secrets.token_hex(length)
    return token
