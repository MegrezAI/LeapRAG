from datetime import UTC, datetime, timedelta
from sqlalchemy import select

from models import get_current_session, APIToken
from libs.base_error import BusinessError
from services.service_error_code import ServiceErrorCode
from models import transactional
from models.account import (
    Account,
    AccountStatus,
    TenantAccountJoin,
    TenantAccountJoinRole,
)


class AccountLoader:
    @staticmethod
    @transactional
    async def load_user_mem(user_id: str) -> None | Account:
        session = get_current_session()
        result = await session.execute(select(Account).filter_by(id=user_id))
        account = result.scalars().first()
        if not account:
            return None

        if account.status == AccountStatus.BANNED.value:
            raise BusinessError(error_code=ServiceErrorCode.ACCOUNT_BANNED)
        value = account.to_dict()
        account = Account(**value)

        result = await session.execute(select(TenantAccountJoin).filter_by(account_id=account.id, current=True))
        current_tenant_join = result.scalars().first()
        if current_tenant_join:
            account.current_tenant = current_tenant_join.tenant
        else:
            result = await session.execute(
                select(TenantAccountJoin).filter_by(account_id=account.id).order_by(TenantAccountJoin.id.asc())
            )
            available_ta = result.scalars().first()
            if not available_ta:
                return None

            account.current_tenant = available_ta.tenant
            available_ta.current = True

        if datetime.now(UTC).replace(tzinfo=None) - account.last_active_at > timedelta(minutes=10):
            account.last_active_at = datetime.now(UTC).replace(tzinfo=None)

        return account

    @staticmethod
    @transactional
    async def load_api_token(apikey: str) -> None | APIToken:
        session = get_current_session()
        result = await session.execute(select(APIToken).filter_by(apikey=apikey))
        token = result.scalars().first()
        if not token:
            return None

        value = token.to_dict()
        token = APIToken(**value)
        return token

    @staticmethod
    @transactional
    async def load_user_id(tenant_id: str) -> None | str:
        session = get_current_session()
        result = await session.execute(
            select(TenantAccountJoin).filter_by(tenant_id=tenant_id, role=TenantAccountJoinRole.OWNER.value))
        value = result.scalars().first()
        if not value:
            return None

        return value.account_id
