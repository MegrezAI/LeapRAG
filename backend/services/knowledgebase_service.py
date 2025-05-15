from sqlalchemy import select, func, and_, or_
from models import get_current_session,  transactional
from models import Knowledgebase, Document, Tenant, Account, TenantAccountJoin
from models import StatusEnum, TenantPermission

from services.common_service import CommonService
from services.utils import get_uuid


class KnowledgebaseService(CommonService):
    model = Knowledgebase

    @classmethod
    @transactional
    async def create(cls, name, account_id, tenant_id, embd_id, language, parser_config):
        kb = Knowledgebase()
        kb.id = get_uuid()
        kb.name = name
        kb.created_by = account_id
        kb.tenant_id = tenant_id
        kb.embd_id = embd_id
        kb.language = language
        kb.parser_config = parser_config
        session = get_current_session()
        session.add(kb)
        return kb

    @classmethod
    async def list_documents_by_ids(cls, kb_ids):
        query = select(Document.id.label("document_id")).join(
            cls.model, cls.model.id == Document.kb_id
        ).where(cls.model.id.in_(kb_ids))
        session = get_current_session()
        result = await session.execute(query)
        doc_ids = [doc["document_id"] for doc in result.mappings().all()]
        return doc_ids

    @classmethod
    async def find_by_tenant_ids(cls, tenant_ids, account_id,
                                 page_number, items_per_page,
                                 orderby, desc, keywords,
                                 parser_id=None):
        query = select(
            cls.model.id,
            cls.model.avatar,
            cls.model.name,
            cls.model.language,
            cls.model.description,
            cls.model.permission,
            cls.model.doc_num,
            cls.model.token_num,
            cls.model.chunk_num,
            cls.model.parser_id,
            cls.model.embd_id,
            Account.username,
            Account.avatar.label('tenant_avatar'),
            cls.model.updated_at
        ).join(Account, cls.model.created_by == Account.id)

        conditions = [
            or_(
                and_(
                    cls.model.tenant_id.in_(tenant_ids),
                    cls.model.permission == TenantPermission.TEAM.value
                ),
                cls.model.created_by == account_id
            ),
            cls.model.status == StatusEnum.VALID.value
        ]

        if keywords:
            conditions.append(func.lower(cls.model.name).contains(keywords.lower()))

        query = query.where(and_(*conditions))

        if parser_id:
            query = query.where(cls.model.parser_id == parser_id)

        order_col = getattr(cls.model, orderby)
        if desc:
            query = query.order_by(order_col.desc())
        else:
            query = query.order_by(order_col.asc())

        session = get_current_session()
        count = await session.execute(
            select(func.count()).select_from(query.subquery())
        )
        count = count.scalar()

        query = query.offset((page_number - 1) * items_per_page).limit(items_per_page)
        result = await session.execute(query)
        result = result.mappings().all()

        return list(result), count

    @classmethod
    async def find_kb_ids(cls, tenant_id):
        query = select(cls.model.id).where(cls.model.tenant_id == tenant_id)
        session = get_current_session()
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_detail(cls, kb_id):
        query = select(
            cls.model.id,
            cls.model.embd_id,
            cls.model.avatar,
            cls.model.name,
            cls.model.language,
            cls.model.description,
            cls.model.permission,
            cls.model.doc_num,
            cls.model.token_num,
            cls.model.chunk_num,
            cls.model.parser_id,
            cls.model.parser_config,
            cls.model.pagerank
        ).join(
            Tenant,
            and_(
                Tenant.id == cls.model.tenant_id,
                Tenant.status == StatusEnum.VALID.value
            )
        ).where(
            cls.model.id == kb_id,
            cls.model.status == StatusEnum.VALID.value
        )
        session = get_current_session()
        result = await session.execute(query)
        result = result.mappings().first()
        if not result:
            return None
        return dict(result)

    @classmethod
    @transactional
    async def update_parser_config(cls, id, config):
        session = get_current_session()
        kb = (await session.execute(select(cls.model).where(cls.model.id == id))).scalars().first()
        if not kb:
            raise LookupError(f"knowledgebase({id}) not found.")

        def dfs_update(old, new):
            for k, v in new.items():
                if k not in old:
                    old[k] = v
                    continue
                if isinstance(v, dict):
                    assert isinstance(old[k], dict)
                    dfs_update(old[k], v)
                elif isinstance(v, list):
                    assert isinstance(old[k], list)
                    old[k] = list(set(old[k] + v))
                else:
                    old[k] = v

        dfs_update(kb.parser_config, config)
        kb.parser_config = kb.parser_config

    @classmethod
    async def get_field_map(cls, ids):
        session = get_current_session()
        kbs = (await session.execute(select(cls.model).where(cls.model.id.in_(ids)))).scalars().all()
        conf = {}
        for kb in kbs:
            if kb.parser_config and "field_map" in kb.parser_config:
                conf.update(kb.parser_config["field_map"])
        return conf

    @classmethod
    async def get_by_name(cls, kb_name, tenant_id):
        session = get_current_session()
        kb = (await session.execute(select(cls.model).filter(
            cls.model.name == kb_name,
            cls.model.tenant_id == tenant_id,
            cls.model.status == StatusEnum.VALID.value
        ))).scalars().first()
        return bool(kb), kb

    @classmethod
    async def get_all_ids(cls):
        session = get_current_session()
        ids = (await session.execute(select(cls.model.id))).all()
        return [id[0] for id in ids]

    @classmethod
    async def find_list(cls, joined_tenant_ids, account_id,
                       page_number, items_per_page, orderby, desc, id, name):
        query = select(cls.model)

        if id:
            query = query.where(cls.model.id == id)
        if name:
            query = query.where(cls.model.name == name)

        query = query.where(
            or_(
                and_(
                    cls.model.tenant_id.in_(joined_tenant_ids),
                    cls.model.permission == TenantPermission.TEAM.value
                ),
                cls.model.tenant_id == account_id
            ),
            cls.model.status == StatusEnum.VALID.value
        )

        order_col = getattr(cls.model, orderby)
        if desc:
            query = query.order_by(order_col.desc())
        else:
            query = query.order_by(order_col.asc())

        query = query.offset((page_number - 1) * items_per_page).limit(items_per_page)
        session = get_current_session()
        result = await session.execute(query)
        return list(result.mappings().all())

    @classmethod
    async def accessible(cls, kb_id, account_id):
        query = select(cls.model.id).join(
            TenantAccountJoin,
            TenantAccountJoin.tenant_id == cls.model.tenant_id
        ).where(
            cls.model.id == kb_id,
            TenantAccountJoin.account_id == account_id
        ).limit(1)
        session = get_current_session()
        result = await session.execute(query)
        return bool(result.first())

    @classmethod
    async def get_kb_by_id(cls, kb_id, account_id):
        stmt = select(cls.model).join(
            TenantAccountJoin,
            TenantAccountJoin.tenant_id == cls.model.tenant_id
        ).where(
            cls.model.id == kb_id,
            TenantAccountJoin.account_id == account_id
        ).limit(1)
        session = get_current_session()
        result = await session.execute(stmt)
        return result.scalars().first()

    @classmethod
    async def get_kb_by_name(cls, kb_name, account_id):
        query = select(cls.model).join(
            TenantAccountJoin,
            TenantAccountJoin.tenant_id == cls.model.tenant_id
        ).where(
            cls.model.name == kb_name,
            TenantAccountJoin.account_id == account_id
        ).limit(1)
        session = get_current_session()
        result = await session.execute(query)
        return list(result.mappings().all())

    @classmethod
    async def accessible4deletion(cls, kb_id, account_id):
        query = select(cls.model.id).where(
            cls.model.id == kb_id,
            cls.model.created_by == account_id
        ).limit(1)
        session = get_current_session()
        result = await session.execute(query)
        return bool(result.first())

    @classmethod
    async def get_kb_names(cls, kb_ids):
        ids, nms = [], []
        kbs = await cls.find_by_ids(kb_ids)
        for kb in kbs:
            if kb.status != StatusEnum.VALID.value:
                continue
            ids.append(kb.id)
            nms.append(kb.name)
        return ids, nms