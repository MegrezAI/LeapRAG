from fastapi import APIRouter
from fastapi_utils.cbv import cbv

from services import settings
from services.llm_service import LLMFactoryService
from services.versions import get_leaprag_version
import logging
from datetime import datetime
import json
from timeit import default_timer as timer
from rag.utils.redis_conn import REDIS_CONN
from configs import app_config

sys_rt = APIRouter(prefix="/rag")


@cbv(sys_rt)
class SysRoute:
    @sys_rt.get('/sys/version')
    async def version(self):
        return get_leaprag_version()

    @sys_rt.get('/sys/status')
    async def status(self):
        res = {}
        st = timer()
        try:
            res["doc_engine"] = settings.docStoreConn.health()
            res["doc_engine"]["elapsed"] = "{:.1f}".format((timer() - st) * 1000.0)
        except Exception as e:
            res["doc_engine"] = {
                "type": "unknown",
                "status": "red",
                "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
                "error": str(e),
            }

        st = timer()
        try:
            res["storage"] = {
                "storage": app_config.STORAGE_TYPE.lower(),
                "status": "green",
                "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
            }
        except Exception as e:
            res["storage"] = {
                "storage": app_config.STORAGE_TYPE.lower(),
                "status": "red",
                "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
                "error": str(e),
            }

        st = timer()
        try:
            await LLMFactoryService.find_all()
            res["database"] = {
                "database": settings.DATABASE_TYPE.lower(),
                "status": "green",
                "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
            }
        except Exception as e:
            res["database"] = {
                "database": settings.DATABASE_TYPE.lower(),
                "status": "red",
                "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
                "error": str(e),
            }

        st = timer()
        try:
            if not REDIS_CONN.health():
                raise Exception("Lost connection!")
            res["redis"] = {
                "status": "green",
                "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
            }
        except Exception as e:
            res["redis"] = {
                "status": "red",
                "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
                "error": str(e),
            }

        task_executor_heartbeats = {}
        try:
            task_executors = REDIS_CONN.smembers("TASKEXE")
            now = datetime.now().timestamp()
            for task_executor_id in task_executors:
                heartbeats = REDIS_CONN.zrangebyscore(task_executor_id, now - 60 * 30, now)
                heartbeats = [json.loads(heartbeat) for heartbeat in heartbeats]
                task_executor_heartbeats[task_executor_id] = heartbeats
        except Exception:
            logging.exception("get task executor heartbeats failed!")
        res["task_executor_heartbeats"] = task_executor_heartbeats

        return res
