import logging
import random
import xxhash
from datetime import datetime
from sqlalchemy import select, func, update, delete
from sqlalchemy.dialects.postgresql import insert
from models import get_current_session, transactional
from models import File2Document, File
from models import StatusEnum, FileType, TaskStatus
from models import Task, Document, Knowledgebase, Tenant
from services.common_service import CommonService
from services.document_service import DocumentService
from services.utils import current_timestamp, get_uuid
from deepdoc.parser import PdfParser
from deepdoc.parser.excel_parser import RAGFlowExcelParser
from rag.settings import SVR_QUEUE_NAME
from extensions.ext_storage import storage as STORAGE_IMPL
from rag.utils.redis_conn import REDIS_CONN
from services import settings
from rag.nlp import search
from services.utils.time_out import Timer


def trim_header_by_lines(text: str, max_length) -> str:
    len_text = len(text)
    if len_text <= max_length:
        return text
    for i in range(len_text):
        if text[i] == '\n' and len_text - i <= max_length:
            return text[i + 1:]
    return text


class TaskService(CommonService):
    model = Task

    @classmethod
    @transactional
    async def get_pending_task_dict(cls, task_id):
        session = get_current_session()
        query = select(
            cls.model.id,
            cls.model.doc_id,
            cls.model.from_page,
            cls.model.to_page,
            cls.model.retry_count,
            Document.kb_id,
            Document.parser_id,
            Document.parser_config,
            Document.name,
            Document.type,
            Document.location,
            Document.size,
            Knowledgebase.tenant_id,
            Knowledgebase.language,
            Knowledgebase.embd_id,
            Knowledgebase.pagerank,
            Knowledgebase.parser_config.label('kb_parser_config'),
            Tenant.img2txt_id,
            Tenant.asr_id,
            Tenant.llm_id,
            cls.model.updated_at
        ).join(Document, cls.model.doc_id == Document.id) \
            .join(Knowledgebase, Document.kb_id == Knowledgebase.id) \
            .join(Tenant, Knowledgebase.tenant_id == Tenant.id) \
            .where(cls.model.id == task_id,
                   cls.model.begin_at.is_(None))

        result = (await session.execute(query)).mappings().first()
        if not result:
            return None

        msg = f"\n{datetime.now().strftime('%H:%M:%S')} Task has been received."
        prog = random.random() / 10.0
        if result["retry_count"] >= 3:
            msg = "\nERROR: Task is abandoned after 3 times attempts."
            prog = -1

        await session.execute(
            update(cls.model).where(cls.model.id == result["id"]).values(
                progress_msg=cls.model.progress_msg + msg,
                progress=prog,
                retry_count=result["retry_count"] + 1
            )
        )

        if result["retry_count"] >= 3:
            return None

        return dict(result)

    @classmethod
    async def get_tasks(cls, doc_id: str):
        session = get_current_session()
        query = select(
            cls.model.id,
            cls.model.from_page,
            cls.model.progress,
            cls.model.digest,
            cls.model.chunk_ids
        ).where(cls.model.doc_id == doc_id) \
            .order_by(cls.model.from_page.asc(), cls.model.created_at.desc())

        results = (await session.execute(query)).mappings().all()
        if not results:
            return None
        return [dict(r) for r in results]

    @classmethod
    @transactional
    async def update_chunk_ids(cls, id: str, chunk_ids: str):
        session = get_current_session()
        await session.execute(
            update(cls.model).where(cls.model.id == id).values(chunk_ids=chunk_ids)
        )

    @classmethod
    async def get_ongoing_doc_name(cls):
        session = get_current_session()
        query = select(
            Document.id,
            Document.kb_id,
            Document.location,
            File.parent_id
        ).join(Document, cls.model.doc_id == Document.id) \
            .outerjoin(File2Document, File2Document.document_id == Document.id) \
            .outerjoin(File, File2Document.file_id == File.id) \
            .where(
            Document.status == StatusEnum.VALID.value,
            Document.run == TaskStatus.RUNNING.value,
            Document.type != FileType.VIRTUAL.value,
            cls.model.progress < 1,
            cls.model.created_at >= current_timestamp() - 1000 * 600
        )

        results = (await session.execute(query)).mappings().all()
        if not results:
            return []

        return list(set([
            (d["parent_id"] if d["parent_id"] else d["kb_id"], d["location"])
            for d in results
        ]))

    @classmethod
    async def check_cancel(cls, task_id):
        session = get_current_session()
        task = (await session.execute(select(cls.model).where(cls.model.id == task_id))).scalars().first()
        if task is None:
            return True
        doc = (await session.execute(select(Document).where(Document.id == task.doc_id))).scalars().first()
        return doc.run == TaskStatus.CANCEL.value or doc.progress < 0

    @classmethod
    @transactional
    async def update_progress(cls, id, info):
        session = get_current_session()
        if info["progress_msg"]:
            task = (await session.execute(select(cls.model).where(cls.model.id == id))).scalars().first()
            if task is not None:
                progress_msg = trim_header_by_lines(task.progress_msg + "\n" + info["progress_msg"], 3000)
                await session.execute(
                    update(cls.model).where(cls.model.id == id).values(progress_msg=progress_msg)
                )

        if "progress" in info:
            await session.execute(
                update(cls.model).where(cls.model.id == id).values(progress=info["progress"])
            )


@transactional
async def queue_tasks(doc: dict, bucket: str, name: str):
    session = get_current_session()

    def new_task():
        return {"id": get_uuid(), "doc_id": doc["id"], "progress": 0.0, "from_page": 0, "to_page": 100000000}

    parse_task_array = []
    parser_id = doc["parser_id"]
    if doc["type"] == FileType.PDF.value:
        file_bin = STORAGE_IMPL.load(bucket + "/" + name)
        do_layout = doc["parser_config"].get("layout_recognize", "DeepDOC")
        pages = PdfParser.total_page_number(doc["name"], file_bin)
        page_size = doc["parser_config"].get("task_page_size", 12)
        if parser_id == "paper":
            page_size = doc["parser_config"].get("task_page_size", 22)
        if parser_id in ["one", "knowledge_graph"] or do_layout != "DeepDOC":
            page_size = 10 ** 9
        page_ranges = doc["parser_config"].get("pages") or [(1, 10 ** 5)]
        for s, e in page_ranges:
            s -= 1
            s = max(0, s)
            e = min(e - 1, pages)
            for p in range(s, e, page_size):
                task = new_task()
                task["from_page"] = p
                task["to_page"] = min(p + page_size, e)
                parse_task_array.append(task)

    elif parser_id == "table":
        file_bin = STORAGE_IMPL.load(bucket + "/" + name)
        rn = RAGFlowExcelParser.row_number(doc["name"], file_bin)
        for i in range(0, rn, 3000):
            task = new_task()
            task["from_page"] = i
            task["to_page"] = min(i + 3000, rn)
            parse_task_array.append(task)
    else:
        parse_task_array.append(new_task())

    logging.info(f"queue_tasks {name}: parser_id={parser_id}")
    chunking_config = await DocumentService.get_chunking_config(doc["id"])
    for task in parse_task_array:
        hasher = xxhash.xxh64()
        for field in sorted(chunking_config.keys()):
            if field == "parser_config":
                for k in ["raptor", "graphrag"]:
                    if k in chunking_config[field]:
                        del chunking_config[field][k]
            hasher.update(str(chunking_config[field]).encode("utf-8"))
        for field in ["doc_id", "from_page", "to_page"]:
            hasher.update(str(task.get(field, "")).encode("utf-8"))
        task_digest = hasher.hexdigest()
        task["digest"] = task_digest
        task["progress"] = 0.0

    prev_tasks = await TaskService.get_tasks(doc["id"])
    ck_num = 0
    if prev_tasks:
        for task in parse_task_array:
            ck_num += reuse_prev_task_chunks(task, prev_tasks, chunking_config)
        await session.execute(delete(Task).where(Task.doc_id == doc["id"]))

        chunk_ids = []
        for task in prev_tasks:
            if task["chunk_ids"]:
                chunk_ids.extend(task["chunk_ids"].split())
        if chunk_ids:
            settings.docStoreConn.delete({"id": chunk_ids}, search.index_name(chunking_config["tenant_id"]),
                                         chunking_config["kb_id"])
    await DocumentService.update_by_id(doc["id"], {"chunk_num": ck_num})

    for task in parse_task_array:
        stmt = insert(Task).values(**task).on_conflict_do_nothing()
        await session.execute(stmt)

    await DocumentService.begin2parse(doc["id"])

    unfinished_task_array = [task for task in parse_task_array if task["progress"] < 1.0]
    t = Timer()
    t.set_timeout(queue_products, 1000, unfinished_task_array)


def queue_products(task_array):
    for t in task_array:
        logging.info(f"now queue_product {t}")
        assert REDIS_CONN.queue_product(SVR_QUEUE_NAME,
                                        message=t), "Can't access Redis. Please check the Redis' status."


def reuse_prev_task_chunks(task: dict, prev_tasks: list[dict], chunking_config: dict):
    idx = 0
    while idx < len(prev_tasks):
        prev_task = prev_tasks[idx]
        if prev_task.get("from_page", 0) == task.get("from_page", 0) \
                and prev_task.get("digest", 0) == task.get("digest", ""):
            break
        idx += 1

    if idx >= len(prev_tasks):
        return 0
    prev_task = prev_tasks[idx]
    if prev_task["progress"] < 1.0 or not prev_task["chunk_ids"]:
        return 0
    task["chunk_ids"] = prev_task["chunk_ids"]
    task["progress"] = 1.0
    if "from_page" in task and "to_page" in task and int(task['to_page']) - int(task['from_page']) >= 10 ** 6:
        task["progress_msg"] = f"Page({task['from_page']}~{task['to_page']}): "
    else:
        task["progress_msg"] = ""
    task["progress_msg"] = " ".join(
        [datetime.now().strftime("%H:%M:%S"), task["progress_msg"], "Reused previous task's chunks."])
    prev_task["chunk_ids"] = ""

    return len(task["chunk_ids"].split())
