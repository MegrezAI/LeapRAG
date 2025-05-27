import logging
import uuid
from typing import Optional, Any, Coroutine
from contextvars import ContextVar

from configs import app_config
from sqlalchemy import MetaData, NullPool
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_scoped_session,
    async_sessionmaker,
    AsyncSession, AsyncAttrs,
)
from typing import Callable, Awaitable, Any
import functools

POSTGRES_INDEXES_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}


class Base(AsyncAttrs, DeclarativeBase):
    metadata = MetaData(naming_convention=POSTGRES_INDEXES_NAMING_CONVENTION)


# some hints from: https://github.com/teamhide/fastapi-boilerplate/blob/master/core/db/session.py
db_session_context: ContextVar[Optional[str]] = ContextVar(
    "db_session_context", default=None
)

async_engine = create_async_engine(url=app_config.SQLALCHEMY_DATABASE_URI,
                                   poolclass=NullPool)


def get_db_session_context() -> str:
    session_id = db_session_context.get()
    if not session_id:
        raise ValueError("Currently no session is available")

    return session_id


def set_db_session_context(*, session_id: str | None) -> None:
    db_session_context.set(session_id)


AsyncScopedSession = async_scoped_session(
    session_factory=async_sessionmaker(bind=async_engine, autoflush=True, autocommit=False, expire_on_commit=False),
    scopefunc=get_db_session_context,
)


def get_current_session() -> AsyncSession:
    return AsyncScopedSession()


AsyncCallable = Callable[..., Coroutine]


def with_async_session(func: AsyncCallable) -> AsyncCallable:
    @functools.wraps(func)
    async def _wrapper(*args, **kwargs) -> Coroutine:
        session_id = str(uuid.uuid4())
        set_db_session_context(session_id=session_id)
        try:
            result = await func(*args, **kwargs)
        except Exception as error:
            logging.error("with_db_session error", exc_info=error)
            raise
        finally:
            await AsyncScopedSession.remove()  # this includes closing the session as well
            set_db_session_context(session_id=None)

        return result

    return _wrapper


def transactional(func: AsyncCallable) -> AsyncCallable:
    @functools.wraps(func)
    async def _wrapper(*args, **kwargs) -> Coroutine:
        try:
            db_session = get_current_session()
            if db_session.in_transaction():
                return await func(*args, **kwargs)

            async with db_session.begin():
                # automatically committed / rolled back thanks to the context manager
                return_value = await func(*args, **kwargs)

            return return_value
        except Exception as error:
            logging.error("transactional error", exc_info=error)
            raise

    return _wrapper
