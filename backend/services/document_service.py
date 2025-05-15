import logging
import xxhash
import json
import random
import re
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from io import BytesIO
from sqlalchemy import func, desc, asc, update
from sqlalchemy.dialects.postgresql import insert

from leapai_prompts.agent_runner import AgentRunner
from models.knowledgebase import ParserType
from rag.app import naive
from services import settings
from services.llm_service import LLMBundle
from services.utils import current_timestamp, get_format_time, get_uuid
from rag.settings import SVR_QUEUE_NAME
from extensions.ext_storage import storage as STORAGE_IMPL
from rag.nlp import search, rag_tokenizer
from datetime import datetime, UTC
from sqlalchemy import select
from services.common_service import CommonService
from models import FileSource, File2Document, File, FileType, TaskStatus, LLMType, StatusEnum, transactional, \
    TenantAccountJoin, Knowledgebase, Tenant, Task, Document, get_current_session
from rag.utils.redis_conn import REDIS_CONN
from services.utils.time_out import Timer


class File2DocumentService(CommonService):
    model = File2Document

    @classmethod
    async def find_by_file_id(cls, file_id):
        session = get_current_session()
        objs = await session.execute(
            select(cls.model).where(cls.model.file_id == file_id)
        )
        return objs.scalars().all()

    @classmethod
    async def find_by_document_id(cls, document_id):
        session = get_current_session()
        objs = await session.execute(
            select(cls.model).where(cls.model.document_id == document_id)
        )
        return objs.scalars().all()

    @classmethod
    @transactional
    async def delete_by_file_id(cls, file_id):
        return await cls.filter_delete([File2Document.file_id == file_id])

    @classmethod
    @transactional
    async def delete_by_document_id(cls, doc_id):
        return await cls.filter_delete([File2Document.document_id == doc_id])

    @classmethod
    async def get_storage_address(cls, doc_id=None, file_id=None):
        session = get_current_session()
        if doc_id:
            f2d = await cls.find_by_document_id(doc_id)
        else:
            f2d = await cls.find_by_file_id(file_id)

        if f2d:
            file = await session.get(File, f2d[0].file_id)
            if not file.source_type or file.source_type == FileSource.LOCAL.value:
                return file.parent_id, file.location
            doc_id = f2d[0].document_id

        assert doc_id, "please specify doc_id"
        doc = await session.get(DocumentService.model, doc_id)
        return doc.kb_id, doc.location


class DocumentService(CommonService):
    model = Document

    @classmethod
    async def find_list(cls, kb_id, page_number, items_per_page,
                        orderby, desc_order, keywords, id, name):
        session = get_current_session()
        query = select(cls.model).filter(cls.model.kb_id == kb_id)
        if id:
            query = query.filter(cls.model.id == id)
        if name:
            query = query.filter(cls.model.name == name)
        if keywords:
            query = query.filter(func.lower(cls.model.name).contains(keywords.lower()))

        if desc_order:
            query = query.order_by(desc(getattr(cls.model, orderby)))
        else:
            query = query.order_by(asc(getattr(cls.model, orderby)))

        result_count = await session.execute(select(func.count()).select_from(query.subquery()))
        count = result_count.scalar()
        result_docs = await session.execute(query.offset((page_number - 1) * items_per_page).limit(items_per_page))
        docs = result_docs.scalars().all()
        return [doc.to_dict() for doc in docs], count

    @classmethod
    async def find_by_kb_id(cls, kb_id, created_by, page_number, items_per_page,
                            orderby, desc_order, keywords, doc_ids):
        session = get_current_session()
        query = select(cls.model).filter(cls.model.kb_id == kb_id, cls.model.created_by == created_by)
        if keywords:
            query = query.filter(func.lower(cls.model.name).contains(keywords.lower()))

        if len(doc_ids) > 0 and doc_ids[0] != '':
            query = query.filter(cls.model.id.in_(doc_ids))

        if desc_order:
            query = query.order_by(desc(getattr(cls.model, orderby)))
        else:
            query = query.order_by(asc(getattr(cls.model, orderby)))

        result_count = await session.execute(select(func.count()).select_from(query.subquery()))
        count = result_count.scalar()
        result_docs = await session.execute(query.offset((page_number - 1) * items_per_page).limit(items_per_page))
        docs = result_docs.scalars().all()
        return [doc.to_dict() for doc in docs], count

    @classmethod
    @transactional
    async def insert_document(cls, kb_id, doc):
        session = get_current_session()

        update_stmt = update(Knowledgebase).where(Knowledgebase.id == kb_id).values(doc_num=Knowledgebase.doc_num + 1)
        await session.execute(update_stmt)

        new_doc = Document(**doc)
        new_doc.created_at = datetime.now(UTC).replace(tzinfo=None)
        new_doc.updated_at = datetime.now(UTC).replace(tzinfo=None)
        return await cls.save_or_update_entity(new_doc)

    @classmethod
    @transactional
    async def remove_document(cls, doc, tenant_id):
        await cls.decrease_chunk_num_doc_num(doc.id)
        try:
            settings.docStoreConn.delete({"doc_id": doc.id}, search.index_name(tenant_id), doc.kb_id)
            settings.docStoreConn.update(
                {"kb_id": doc.kb_id, "knowledge_graph_kwd": ["entity", "relation", "graph", "community_report"],
                 "source_id": doc.id},
                {"remove": {"source_id": doc.id}},
                search.index_name(tenant_id), doc.kb_id)
            settings.docStoreConn.update({"kb_id": doc.kb_id, "knowledge_graph_kwd": ["graph"]},
                                         {"removed_kwd": "Y"},
                                         search.index_name(tenant_id), doc.kb_id)
            settings.docStoreConn.delete(
                {"kb_id": doc.kb_id, "knowledge_graph_kwd": ["entity", "relation", "graph", "community_report"],
                 "must_not": {"exists": "source_id"}},
                search.index_name(tenant_id), doc.kb_id)
        except Exception as ex:
            logging.error("remove document error", exc_info=ex)

        return await cls.delete_by_id(doc.id)

    @classmethod
    async def find_newly_uploaded(cls):
        session = get_current_session()
        query = select(
            cls.model.id,
            cls.model.kb_id,
            cls.model.parser_id,
            cls.model.parser_config,
            cls.model.name,
            cls.model.type,
            cls.model.location,
            cls.model.size,
            Knowledgebase.tenant_id,
            Tenant.embd_id,
            Tenant.img2txt_id,
            Tenant.asr_id,
            cls.model.updated_at
        ).join(
            Knowledgebase, cls.model.kb_id == Knowledgebase.id
        ).join(
            Tenant, Knowledgebase.tenant_id == Tenant.id
        ).filter(
            cls.model.status == StatusEnum.VALID.value,
            cls.model.type != FileType.VIRTUAL.value,
            cls.model.progress == 0,
            cls.model.updated_at >= current_timestamp() - 1000 * 600,
            cls.model.run == TaskStatus.RUNNING.value
        ).order_by(asc(cls.model.updated_at))

        results = await session.execute(query)
        return [dict(zip(result._fields, result)) for result in results.all()]

    @classmethod
    async def find_unfinished_docs(cls):
        session = get_current_session()
        query = select(
            cls.model.id,
            cls.model.process_begin_at,
            cls.model.parser_config,
            cls.model.progress_msg,
            cls.model.run,
            cls.model.parser_id
        ).filter(
            cls.model.status == StatusEnum.VALID.value,
            cls.model.type != FileType.VIRTUAL.value,
            cls.model.progress < 1,
            cls.model.progress > 0
        )

        results = await session.execute(query)
        return [dict(zip(result._fields, result)) for result in results.all()]

    @classmethod
    @transactional
    async def increment_chunk_num(cls, doc_id, kb_id, token_num, chunk_num, duration):
        session = get_current_session()
        doc = await session.execute(select(cls.model).filter(cls.model.id == doc_id))
        doc = doc.scalar_one_or_none()
        if not doc:
            raise LookupError("Document not found which is supposed to be there")

        doc.token_num += token_num
        doc.chunk_num += chunk_num
        doc.process_duration += duration

        kb = await session.execute(select(Knowledgebase).filter(Knowledgebase.id == kb_id))
        kb = kb.scalar_one_or_none()
        if kb:
            kb.token_num += token_num
            kb.chunk_num += chunk_num

        return 1

    @classmethod
    @transactional
    async def decrement_chunk_num(cls, doc_id, kb_id, token_num, chunk_num, duration):
        session = get_current_session()
        doc = await session.execute(select(cls.model).filter(cls.model.id == doc_id))
        doc = doc.scalar_one_or_none()
        if not doc:
            raise LookupError("Document not found which is supposed to be there")

        doc.token_num -= token_num
        doc.chunk_num -= chunk_num
        doc.process_duration += duration

        kb = await session.execute(select(Knowledgebase).filter(Knowledgebase.id == kb_id))
        kb = kb.scalar_one_or_none()
        if kb:
            kb.token_num -= token_num
            kb.chunk_num -= chunk_num

        return 1

    @classmethod
    @transactional
    async def decrease_chunk_num_doc_num(cls, doc_id):
        session = get_current_session()
        doc = await session.execute(select(cls.model).filter(cls.model.id == doc_id))
        doc = doc.scalar_one_or_none()
        if not doc:
            raise AssertionError("Can't find document in database.")

        kb = await session.execute(select(Knowledgebase).filter(Knowledgebase.id == doc.kb_id))
        kb = kb.scalar_one_or_none()
        if kb:
            kb.token_num -= doc.token_num
            kb.chunk_num -= doc.chunk_num
            kb.doc_num -= 1
            return 1
        return 0

    @classmethod
    async def get_tenant_id(cls, doc_id):
        session = get_current_session()
        result = await session.execute(
            select(
                Knowledgebase.tenant_id
            ).join(
                cls.model, Knowledgebase.id == cls.model.kb_id
            ).filter(
                cls.model.id == doc_id,
                Knowledgebase.status == StatusEnum.VALID.value
            )
        )
        result = result.scalar_one_or_none()
        return result

    @classmethod
    async def get_knowledgebase_id(cls, doc_id):
        session = get_current_session()
        result = await session.execute(select(cls.model.kb_id).filter(cls.model.id == doc_id))
        result = result.scalar_one_or_none()
        return result

    @classmethod
    async def accessible(cls, doc_id, account_id):
        session = get_current_session()
        result = await session.execute(
            select(cls.model.id).join(
                Knowledgebase, Knowledgebase.id == cls.model.kb_id
            ).join(
                TenantAccountJoin, TenantAccountJoin.tenant_id == Knowledgebase.tenant_id
            ).filter(
                cls.model.id == doc_id,
                TenantAccountJoin.account_id == account_id
            ).limit(1)
        )
        result = result.scalar_one_or_none()
        return result is not None

    @classmethod
    async def accessible4deletion(cls, doc_id, account_id):
        session = get_current_session()
        result = await session.execute(
            select(cls.model.id).join(
                Knowledgebase, Knowledgebase.id == cls.model.kb_id
            ).filter(
                cls.model.id == doc_id,
                Knowledgebase.created_by == account_id
            ).limit(1)
        )
        result = result.scalar_one_or_none()
        return result is not None

    @classmethod
    async def get_embd_id(cls, doc_id):
        session = get_current_session()
        result = await session.execute(
            select(
                Knowledgebase.embd_id
            ).join(
                cls.model, Knowledgebase.id == cls.model.kb_id
            ).filter(
                cls.model.id == doc_id,
                Knowledgebase.status == StatusEnum.VALID.value
            )
        )
        result = result.scalar_one_or_none()
        return result

    @classmethod
    async def get_chunking_config(cls, doc_id):
        session = get_current_session()
        result = await session.execute(
            select(
                cls.model.id,
                cls.model.kb_id,
                cls.model.parser_id,
                cls.model.parser_config,
                Knowledgebase.language,
                Knowledgebase.embd_id,
                Tenant.id.label("tenant_id"),
                Tenant.img2txt_id,
                Tenant.asr_id,
                Tenant.llm_id
            ).join(
                Knowledgebase, cls.model.kb_id == Knowledgebase.id
            ).join(
                Tenant, Knowledgebase.tenant_id == Tenant.id
            ).filter(
                cls.model.id == doc_id
            )
        )
        result = result.first()
        if not result:
            return None

        return dict(zip(result._fields, result))

    @classmethod
    async def get_doc_id_by_doc_name(cls, doc_name):
        session = get_current_session()
        result = await session.execute(select(cls.model.id).filter(cls.model.name == doc_name))
        result = result.scalar_one_or_none()
        return result

    @classmethod
    async def get_thumbnails(cls, docids):
        session = get_current_session()
        results = await session.execute(
            select(
                cls.model.id,
                cls.model.kb_id,
                cls.model.thumbnail
            ).filter(
                cls.model.id.in_(docids)
            )
        )
        return [dict(zip(result._fields, result)) for result in results.all()]

    @classmethod
    @transactional
    async def update_parser_config(cls, id, config):
        session = get_current_session()
        doc = await session.execute(select(cls.model).filter(cls.model.id == id))
        doc = doc.scalar_one_or_none()
        if not doc:
            raise LookupError(f"Document({id}) not found.")

        def dfs_update(old, new):
            for k, v in new.items():
                if k not in old:
                    old[k] = v
                    continue
                if isinstance(v, dict):
                    assert isinstance(old[k], dict)
                    dfs_update(old[k], v)
                else:
                    old[k] = v

        dfs_update(doc.parser_config, config)
        if not config.get("raptor") and doc.parser_config.get("raptor"):
            del doc.parser_config["raptor"]

        doc.parser_config = doc.parser_config

    @classmethod
    async def get_doc_count(cls, tenant_id):
        session = get_current_session()
        count = await session.execute(
            select(func.count()).select_from(
                select(cls.model.id).join(
                    Knowledgebase, Knowledgebase.id == cls.model.kb_id
                ).filter(
                    Knowledgebase.tenant_id == tenant_id
                ).subquery()
            )
        )
        return count.scalar()

    @classmethod
    @transactional
    async def begin2parse(cls, docid):
        session = get_current_session()
        doc = await session.execute(select(cls.model).filter(cls.model.id == docid))
        doc = doc.scalar_one_or_none()
        if doc:
            doc.progress = random.random() * 1 / 100.
            doc.progress_msg = "Task is queued..."
            doc.process_begin_at = datetime.now(UTC).replace(tzinfo=None)

    @classmethod
    @transactional
    async def update_meta_fields(cls, doc_id, meta_fields):
        session = get_current_session()
        doc = await session.execute(select(cls.model).filter(cls.model.id == doc_id))
        doc = doc.scalar_one_or_none()
        if doc:
            doc.meta_fields = meta_fields
            return True
        return False

    @classmethod
    @transactional
    async def update_progress(cls):
        MSG = {
            "raptor": "Start RAPTOR (Recursive Abstractive Processing for Tree-Organized Retrieval).",
            "graphrag": "Entities extraction progress",
            "graph_resolution": "Start Graph Resolution",
            "graph_community": "Start Graph Community Reports Generation"
        }
        session = get_current_session()
        docs = await cls.find_unfinished_docs()
        for d in docs:
            doc_id = d["id"]
            tasks = await session.execute(select(Task).filter(Task.doc_id == doc_id).order_by(Task.created_at))
            tasks = tasks.scalars().all()
            if not tasks:
                continue

            msg = []
            prg = 0
            finished = True
            bad = 0
            has_raptor = False
            has_graphrag = False

            doc = await DocumentService.get_by_id(doc_id)
            status = doc.run  # TaskStatus.RUNNING.value
            for t in tasks:
                if 0 <= t.progress < 1:
                    finished = False
                prg += t.progress if t.progress >= 0 else 0
                msg.append(t.progress_msg)
                if t.task_type == "raptor":
                    has_raptor = True
                elif t.task_type == "graphrag":
                    has_graphrag = True
                if t.progress == -1:
                    bad += 1

            prg /= len(tasks)
            if finished and bad:
                prg = -1
                status = TaskStatus.FAIL.value
            elif finished:
                parser_config = doc.parser_config
                if parser_config.get("raptor", {}).get("use_raptor") and not has_raptor:
                    await queue_raptor_o_graphrag_tasks(d, "raptor", MSG["raptor"])
                    prg = 0.98 * len(tasks) / (len(tasks) + 1)
                elif parser_config.get("graphrag", {}).get("use_graphrag") and not has_graphrag:
                    await queue_raptor_o_graphrag_tasks(d, "graphrag", MSG["graphrag"])
                    prg = 0.98 * len(tasks) / (len(tasks) + 1)
                else:
                    status = TaskStatus.DONE.value

            msg = "\n".join(sorted(msg))

            process_duration = datetime.timestamp(datetime.now(UTC).replace(tzinfo=None)) - d[
                "process_begin_at"].timestamp()
            doc.process_duration = process_duration
            doc.run = status

            if prg != 0:
                doc.progress = prg
            if msg:
                doc.progress_msg = msg

            logging.info(
                f"update_progress doc={doc.id} process_duration={process_duration} staus={status} prog={prg}")
            await cls.save_or_update_entity(doc)

    @classmethod
    async def get_kb_doc_count(cls, kb_id):
        session = get_current_session()
        count = await session.execute(
            select(func.count()).select_from(select(cls.model.id).filter(cls.model.kb_id == kb_id).subquery()))
        return count.scalar()

    @classmethod
    async def run_document_classifier(cls, doc, kb, tenant):
        bucket, name = await File2DocumentService.get_storage_address(doc_id=doc.id)
        binary = get_storage_binary(bucket, name)
        try:
            cks = await naive.chunk(doc.name, binary=binary, from_page=0, to_page=10, lang=kb.language,
                                    callback=simple_progress_callback,
                                    kb_id=kb.id, parser_config=doc.parser_config, tenant_id=tenant.id)
        except Exception as ex:
            logging.error("run_document_classifier chunking {}/{} got exception".format(doc.id, name), exc_info=ex)
            return ""

        content = ""
        count = 0
        for ck in cks:
            content += ck["content_with_weight"] + "\n"
            count += 1
            if count >= 5:
                break

        try:
            llm_model = await LLMBundle.create(tenant.id, LLMType.CHAT, llm_name=tenant.llm_id, lang=kb.language)
            runner = AgentRunner(llm_model=llm_model, system_prompt_file="document_classifier.json")
            result = await runner(file_name=name, file_content=content)
            logging.info(f"run document_classifier result {result}")

            runner = AgentRunner(llm_model=llm_model, system_prompt_file="document_verifier.json")
            result = await runner(file_name=name, file_content=content, parser_id=result)
            # 尝试提取json内容，如果有```json标记的话
            json_content = re.search(r'```json\n(.*?)\n```', result, re.DOTALL)
            if json_content:
                json_str = json_content.group(1)
            else:
                json_str = result
            logging.info(f"run document_verifier result {result}")
            json_data = json.loads(json_str)
            parse_id = json_data.get("suggested_alternative", "")
            return parse_id
        except Exception as ex:
            logging.error("run_document_classifier {}/{} got exception".format(doc.id, name), exc_info=ex)
            return ""


@transactional
async def queue_raptor_o_graphrag_tasks(doc, ty, msg):
    session = get_current_session()
    doc_id = doc["id"]
    tasks = await session.execute(select(Task).filter(Task.doc_id == doc_id, Task.task_type == ty))
    tasks = tasks.scalars().all()
    if len(tasks) > 0:
        logging.info(f"queue_raptor_o_graphrag_tasks skip {ty} for doc:{doc_id}, len={len(tasks)}")
        return

    chunking_config = await DocumentService.get_chunking_config(doc_id)
    hasher = xxhash.xxh64()
    for field in sorted(chunking_config.keys()):
        hasher.update(str(chunking_config[field]).encode("utf-8"))

    task = {
        "id": get_uuid(),
        "doc_id": doc_id,
        "from_page": 100000000,
        "to_page": 100000000,
        "task_type": ty,
        "progress_msg": datetime.now(UTC).replace(tzinfo=None).strftime("%H:%M:%S") + " " + msg
    }
    for field in ["doc_id", "from_page", "to_page"]:
        hasher.update(str(task.get(field, "")).encode("utf-8"))
    hasher.update(ty.encode("utf-8"))
    task["digest"] = hasher.hexdigest()

    logging.info(f"queue_raptor_o_graphrag_tasks {ty} for doc:{doc_id}")
    stmt = insert(Task).values(**task).on_conflict_do_nothing()
    await session.execute(stmt)
    t = Timer()
    t.set_timeout(queue_product, 1000, task)


def queue_product(task):
    assert REDIS_CONN.queue_product(SVR_QUEUE_NAME, message=task), "Can't access Redis. Please check the Redis' status."


def get_storage_binary(bucket, name):
    return STORAGE_IMPL.load(bucket + "/" + name)


async def simple_progress_callback(prog=0, msg=""):
    logging.info(f"simple_progress_callback {prog} {msg}")

