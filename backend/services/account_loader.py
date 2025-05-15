from datetime import UTC, datetime, timedelta
from typing import Any, Optional, cast
from sqlalchemy import select

from models import get_current_session
from libs.base_error import BusinessError
from services.service_error_code import ServiceErrorCode
from models import transactional
from models.account import (
    Account,
    AccountStatus,
    TenantAccountJoin, Tenant,
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
