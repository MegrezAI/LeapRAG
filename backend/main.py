import asyncio
import logging
import sys
import threading
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from starlette import status
from starlette.responses import JSONResponse
from app_factory import create_app
import uvicorn
from rag.svr.task_executor import report_status
from configs import app_config
from libs.base_error import BusinessError
from models.database import set_db_session_context, AsyncScopedSession, with_async_session
from rag.svr.task_executor import handle_task
from services.document_service import DocumentService
from services.llm_service import LLMFactoryService
from services.utils import get_uuid
from rag.settings import print_rag_settings
from services import settings
from fastapi import Request, Response, FastAPI
from typing import Callable, Awaitable

settings.init_settings()
print_rag_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if app_config.DEBUG:
        logging.warning(f"starting tasks in DEBUG mode")
        asyncio.create_task(asyncio_periodic_progress())
        asyncio.create_task(asyncio_periodic_task())
    yield


@with_async_session
async def update_doc_progress():
    await DocumentService.update_progress()


@with_async_session
async def handle_doc_tasks():
    await handle_task()


async def asyncio_periodic_task():
    while True:
        await handle_doc_tasks()
        await asyncio.sleep(1)


async def asyncio_periodic_progress():
    while True:
        await update_doc_progress()
        await asyncio.sleep(3)


app = create_app(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def db_session_middleware_function(request: Request,
                                         call_next: Callable[[Request], Awaitable[Response]]) -> Response | None:
    try:
        set_db_session_context(session_id=get_uuid())
        response = await call_next(request)
    finally:
        await AsyncScopedSession.remove()  # this includes closing the session as well
        set_db_session_context(session_id=None)

    return response


@app.exception_handler(BusinessError)
async def business_exception_handler(request: Request, e: BusinessError):
    content = {'error_code': e.error_code, 'message': e.description}
    if e.data:
        content['data'] = e.data
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        content=content)


async def init_llm_factory():
    set_db_session_context(session_id=get_uuid())
    await LLMFactoryService.init_llm_factory()
    await AsyncScopedSession.remove()  # this includes closing the session as well
    set_db_session_context(session_id=None)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        param = sys.argv[1]
        if param == 'task':
            asyncio.run(asyncio_periodic_task())
            exit(0)
        elif param == 'progress':
            asyncio.run(asyncio_periodic_progress())
            exit(0)

    asyncio.run(init_llm_factory())

    background_thread = threading.Thread(target=report_status)
    background_thread.daemon = True
    background_thread.start()

    uvicorn.run(app='main:app', host="0.0.0.0", port=app_config.SERVICE_HTTP_PORT, reload=True)
