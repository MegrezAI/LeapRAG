from datetime import datetime, UTC
from sqlalchemy import select, update, delete
from models import transactional, get_current_session


class CommonService:
    model = None

    @classmethod
    async def query(cls, **filters):
        session = get_current_session()
        stmt = select(cls.model).filter_by(**filters)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @classmethod
    async def find_all(cls, order_by=None, reverse=None):
        session = get_current_session()
        stmt = select(cls.model)

        if order_by and hasattr(cls.model, order_by):
            order_col = getattr(cls.model, order_by)
        else:
            order_col = getattr(cls.model, 'created_at')

        if reverse:
            stmt = stmt.order_by(order_col.desc())
        else:
            stmt = stmt.order_by(order_col.asc())

        result = await session.execute(stmt)
        return list(result.scalars().all())

    @classmethod
    async def get(cls, **filters):
        session = get_current_session()
        stmt = select(cls.model).filter_by(**filters)
        result = await session.execute(stmt)
        return result.scalar_one()

    @classmethod
    async def get_or_none(cls, **filters):
        session = get_current_session()
        stmt = select(cls.model).filter_by(**filters)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @classmethod
    @transactional
    async def save(cls, **kwargs):
        session = get_current_session()
        obj = cls.model(**kwargs)
        obj.updated_at = datetime.now(UTC).replace(tzinfo=None)
        session.add(obj)
        return obj

    @classmethod
    @transactional
    async def save_or_update_entity(cls, obj):
        if not isinstance(obj, cls.model):
            raise ValueError(f"Object is not an instance of {cls.model.__name__}")
        session = get_current_session()
        if obj.created_at is None:
            obj.created_at = datetime.now(UTC).replace(tzinfo=None)
        obj.updated_at = datetime.now(UTC).replace(tzinfo=None)
        await session.merge(obj)
        return obj

    @classmethod
    @transactional
    async def insert(cls, **kwargs):
        session = get_current_session()
        obj = cls.model(**kwargs)
        now = datetime.now(UTC).replace(tzinfo=None)
        obj.created_at = now
        obj.updated_at = now
        session.add(obj)
        return obj

    @classmethod
    @transactional
    async def insert_many(cls, data_list):
        session = get_current_session()
        now = datetime.now(UTC).replace(tzinfo=None)
        for data in data_list:
            obj = cls.model(**data)
            obj.created_at = now
            obj.updated_at = now
            session.add(obj)

    @classmethod
    @transactional
    async def update_many_by_id(cls, data_list):
        session = get_current_session()
        now = datetime.now(UTC).replace(tzinfo=None)
        for data in data_list:
            data["updated_at"] = now
            stmt = update(cls.model).where(cls.model.id == data["id"]).values(**data)
            await session.execute(stmt)

    @classmethod
    @transactional
    async def update_by_id(cls, obj_id: str, data):
        session = get_current_session()
        data["updated_at"] = datetime.now(UTC).replace(tzinfo=None)
        stmt = update(cls.model).where(cls.model.id == obj_id).values(**data)
        result = await session.execute(stmt)
        return result.rowcount

    @classmethod
    async def get_by_id(cls, obj_id):
        session = get_current_session()
        stmt = select(cls.model).filter_by(id=obj_id)
        result = await session.execute(stmt)
        obj = result.scalar_one_or_none()
        return obj

    @classmethod
    async def find_by_ids(cls, ids):
        session = get_current_session()
        stmt = select(cls.model).where(cls.model.id.in_(ids))
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @classmethod
    @transactional
    async def delete_by_id(cls, id):
        session = get_current_session()
        stmt = delete(cls.model).where(cls.model.id == id)
        result = await session.execute(stmt)
        return result.rowcount

    @classmethod
    @transactional
    async def filter_delete(cls, filters):
        session = get_current_session()
        stmt = delete(cls.model).filter(*filters)
        result = await session.execute(stmt)
        return result.rowcount

    @classmethod
    @transactional
    async def filter_update(cls, filters, update_data):
        session = get_current_session()
        update_data["updated_at"] = datetime.now(UTC).replace(tzinfo=None)
        stmt = update(cls.model).filter(*filters).values(update_data)
        result = await session.execute(stmt)
        return result.rowcount

    @staticmethod
    def cut_list(tar_list, n):
        length = len(tar_list)
        arr = range(length)
        result = [tuple(tar_list[x:(x + n)]) for x in arr[::n]]
        return result

    @classmethod
    async def filter_scope_list(cls, in_key, in_filters_list, filters=None):
        in_filters_tuple_list = cls.cut_list(in_filters_list, 20)
        if not filters:
            filters = []

        results = []
        for chunk in in_filters_tuple_list:
            session = get_current_session()
            stmt = select(cls.model).where(
                getattr(cls.model, in_key).in_(chunk),
                *filters
            )
            result = await session.execute(stmt)
            chunk_results = result.scalars().all()
            results.extend(chunk_results)

        return results
