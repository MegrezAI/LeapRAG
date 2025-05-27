from datetime import datetime, UTC
from sqlalchemy import update
from models import get_current_session, API4Conversation, APIToken, transactional
from services.common_service import CommonService


class APIKeyService(CommonService):
    model = APIToken

    @classmethod
    @transactional
    async def used(cls, token):
        session = get_current_session()
        stmt = update(cls.model).values(
            updated_at=datetime.now(UTC).replace(tzinfo=None)
        ).where(cls.model.token == token)
        await session.execute(stmt)


class API4ConversationService(CommonService):
    model = API4Conversation

    @classmethod
    @transactional
    async def append_message(cls, cid, conversation):
        session = get_current_session()
        conversation.round = conversation.round + 1
        stmt = update(cls.model).values(
            **conversation.to_dict()
        ).where(
            cls.model.id == cid
        )
        await session.execute(stmt)
