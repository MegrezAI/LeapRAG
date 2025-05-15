from sqlalchemy import func, desc, asc, select

from services.common_service import CommonService
from models import Agent, AgentLog, AgentTask, get_current_session


class AgentService(CommonService):
    model = Agent

    @classmethod
    async def list_agents(cls, tenant_id: str) -> list[Agent]:
        session = get_current_session()
        result = await session.execute(select(cls.model).filter_by(tenant_id=tenant_id))
        return list(result.scalars().all())

    @classmethod
    async def get_agent(cls, agent_id: str) -> Agent:
        session = get_current_session()
        result = await session.execute(select(cls.model).filter_by(id=agent_id))
        return result.scalars().first()


class AgentTaskService(CommonService):
    model = AgentTask

    @classmethod
    async def find_by_agent_id(cls, agent_id, page_number, items_per_page, orderby, desc_order):
        session = get_current_session()
        query = select(cls.model).filter(cls.model.agent_id == agent_id)

        if desc_order:
            query = query.order_by(desc(getattr(cls.model, orderby)))
        else:
            query = query.order_by(asc(getattr(cls.model, orderby)))

        count_result = await session.execute(select(func.count()).select_from(query.subquery()))
        count = count_result.scalar()

        query = query.offset((page_number - 1) * items_per_page).limit(items_per_page)
        result = await session.execute(query)
        logs = result.scalars().all()
        return [log.to_dict() for log in logs], count


class AgentLogService(CommonService):
    model = AgentLog

    @classmethod
    async def find_by_agent_id(cls, agent_id, page_number, items_per_page, orderby, desc_order, keywords):
        session = get_current_session()
        query = select(cls.model).filter(cls.model.agent_id == agent_id)
        if keywords:
            query = query.filter(func.lower(cls.model.url).contains(keywords.lower()))

        if desc_order:
            query = query.order_by(desc(getattr(cls.model, orderby)))
        else:
            query = query.order_by(asc(getattr(cls.model, orderby)))

        count_result = await session.execute(select(func.count()).select_from(query.subquery()))
        count = count_result.scalar()

        query = query.offset((page_number - 1) * items_per_page).limit(items_per_page)
        result = await session.execute(query)
        logs = result.scalars().all()
        return [log.to_dict() for log in logs], count
