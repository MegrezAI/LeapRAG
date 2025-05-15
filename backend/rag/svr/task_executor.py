import random
import sys

from leapai_prompts.agent_runner import AgentRunner
from models import TaskStatus, LLMType, transactional, get_current_session
from models.knowledgebase import ParserType
from services.account_service import TenantService
from services.dialog_service import keyword_extraction, question_proposal, content_tagging
from services.document_service import DocumentService
from services.document_service import File2DocumentService
from services.llm_service import LLMBundle
from services.task_service import TaskService
from services.utils.log_utils import initRootLogger, get_project_base_directory
from libs.utils import get_llm_cache, set_llm_cache, get_tags_from_cache, set_tags_to_cache

CONSUMER_NO = "0" if len(sys.argv) < 2 else sys.argv[1]
CONSUMER_NAME = "rag_server_" + CONSUMER_NO
initRootLogger(CONSUMER_NAME)

import logging
import os
from datetime import datetime, UTC
import json
import xxhash
import copy
import re
import time
import threading
from functools import partial
from io import BytesIO
from multiprocessing.context import TimeoutError
from timeit import default_timer as timer
import tracemalloc
import numpy as np
from services import settings
from rag.app import laws, paper, manual, qa, table, book, picture, naive, one, audio, email, tag
from rag.nlp import search, rag_tokenizer
from rag.raptor import RecursiveAbstractiveProcessing4TreeOrganizedRetrieval as Raptor
from rag.settings import DOC_MAXIMUM_SIZE, SVR_QUEUE_NAME, TAG_FLD, PAGERANK_FLD
from rag.utils import num_tokens_from_string
from rag.utils.redis_conn import REDIS_CONN, Payload
from extensions.ext_storage import storage as STORAGE_IMPL

BATCH_SIZE = 64

FACTORY = {
    "general": naive,
    ParserType.NAIVE.value: naive,
    ParserType.PAPER.value: paper,
    ParserType.BOOK.value: book,
    ParserType.MANUAL.value: manual,
    ParserType.LAWS.value: laws,
    ParserType.QA.value: qa,
    ParserType.TABLE.value: table,
    ParserType.PICTURE.value: picture,
    ParserType.ONE.value: one,
    ParserType.AUDIO.value: audio,
    ParserType.EMAIL.value: email,
    ParserType.KG.value: naive,
    ParserType.TAG.value: tag
}

CONSUMER_NAME = "task_consumer_" + CONSUMER_NO
PAYLOAD: Payload | None = None
BOOT_AT = datetime.now()
PENDING_TASKS = 0
LAG_TASKS = 0

mt_lock = threading.Lock()
DONE_TASKS = 0
FAILED_TASKS = 0
CURRENT_TASK = None

tracemalloc_started = False


# SIGUSR1 handler: start tracemalloc and take snapshot
def start_tracemalloc_and_snapshot(signum, frame):
    global tracemalloc_started
    if not tracemalloc_started:
        logging.info("got SIGUSR1, start tracemalloc")
        tracemalloc.start()
        tracemalloc_started = True
    else:
        logging.info("got SIGUSR1, tracemalloc is already running")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot_file = os.path.abspath(
        os.path.join(get_project_base_directory(), "logs", f"{os.getpid()}_snapshot_{timestamp}.trace"))

    snapshot = tracemalloc.take_snapshot()
    snapshot.dump(snapshot_file)
    logging.info(f"taken snapshot {snapshot_file}")


# SIGUSR2 handler: stop tracemalloc
def stop_tracemalloc(signum, frame):
    global tracemalloc_started
    if tracemalloc_started:
        logging.info("go SIGUSR2, stop tracemalloc")
        tracemalloc.stop()
        tracemalloc_started = False
    else:
        logging.info("got SIGUSR2, tracemalloc not running")


class TaskCanceledException(Exception):
    def __init__(self, msg):
        self.msg = msg


@transactional
async def set_progress(task_id, from_page=0, to_page=-1, prog=None, msg="Processing..."):
    global PAYLOAD
    if prog is not None and prog < 0:
        msg = "[ERROR]" + msg
    try:
        cancel = await TaskService.check_cancel(task_id)
    except Exception as ex:
        logging.error("set_progress exception", exc_info=ex)
        if PAYLOAD:
            PAYLOAD.ack()
            PAYLOAD = None
        return

    if cancel:
        msg += " [Canceled]"
        prog = -1

    if to_page > 0:
        if msg:
            if from_page < to_page:
                msg = f"Page({from_page + 1}~{to_page + 1}): " + msg
    if msg:
        msg = datetime.now().strftime("%H:%M:%S") + " " + msg
    d = {"progress_msg": msg}
    if prog is not None:
        d["progress"] = prog

    logging.info(f"set_progress({task_id}), progress: {prog}, progress_msg: {msg}")
    try:
        await TaskService.update_progress(task_id, d)
        session = get_current_session()
        await session.commit()

    except Exception as ex:
        logging.error("update_progress exception", exc_info=ex)
        if PAYLOAD:
            PAYLOAD.ack()
            PAYLOAD = None
        return

    if cancel and PAYLOAD:
        PAYLOAD.ack()
        PAYLOAD = None
        raise TaskCanceledException(msg)


@transactional
async def collect():
    global CONSUMER_NAME, PAYLOAD, DONE_TASKS, FAILED_TASKS
    try:
        PAYLOAD = REDIS_CONN.get_unacked_for(CONSUMER_NAME, SVR_QUEUE_NAME, "leap_rag_svr_task_broker")
        if not PAYLOAD:
            PAYLOAD = REDIS_CONN.queue_consumer(SVR_QUEUE_NAME, "leap_rag_svr_task_broker", CONSUMER_NAME)
        if not PAYLOAD:
            time.sleep(1)
            return None
    except Exception as ex:
        logging.error("Get task event from queue exception", exc_info=ex)
        return None

    msg = PAYLOAD.get_message()
    if not msg:
        return None

    canceled = False
    task = await TaskService.get_pending_task_dict(msg["id"])
    if task:
        doc = await DocumentService.get_by_id(task["doc_id"])
        canceled = doc.run == TaskStatus.CANCEL.value or doc.progress < 0

    if not task or canceled:
        state = "task not found" if not task else "has been cancelled"
        with mt_lock:
            DONE_TASKS += 1
        logging.info(f"cancel task {msg['id']}, reason: {state}")
        return None

    task["task_type"] = msg.get("task_type", "")
    return task


def get_storage_binary(bucket, name):
    return STORAGE_IMPL.load(bucket + "/" + name)


async def build_chunks(task, progress_callback):
    task_document_name = task["name"]
    task_parser_id = task['parser_id']
    if task["size"] > DOC_MAXIMUM_SIZE:
        set_progress(task["id"], prog=-1, msg="File size exceeds( <= %dMb )" %
                                              (int(DOC_MAXIMUM_SIZE / 1024 / 1024)))
        return []

    chunker = FACTORY[task_parser_id.lower()]
    logging.info(f"build_chunks parser_id {task_parser_id} start with {chunker}")

    try:
        st = timer()
        bucket, name = await File2DocumentService.get_storage_address(doc_id=task["doc_id"])
        binary = get_storage_binary(bucket, name)
        logging.info(
            "get_storage_binary ({}) {}/{} size={}".format(timer() - st, task["language"], task_document_name,
                                                           len(binary)))
    except TimeoutError:
        await progress_callback(-1, "Internal server error: Fetch file timeout. Could you try it again.")
        logging.exception("get_storage_binary {}/{} got timeout.".format(task["language"], task_document_name))
        raise
    except Exception as ex:
        if re.search("(No such file|not found)", str(ex)):
            await progress_callback(-1,
                                    "Can not find file <%s> from storage. Could you try it again?" % task_document_name)
        else:
            await progress_callback(-1, "Get file from storage: %s" % str(ex).replace("'", ""))
        logging.error("Chunking {}/{} got exception".format(task["language"], task_document_name), exc_info=ex)
        raise

    try:
        cks = await chunker.chunk(task_document_name, binary=binary, from_page=task["from_page"],
                                  to_page=task["to_page"], lang=task["language"], callback=progress_callback,
                                  kb_id=task["kb_id"], parser_config=task["parser_config"], tenant_id=task["tenant_id"])
        logging.info("Chunking({}) {}/{} done".format(timer() - st, task["language"], task_document_name))
    except TaskCanceledException:
        raise
    except Exception as ex:
        await progress_callback(-1, "Internal server error while chunking: %s" % str(ex).replace("'", ""))
        logging.error("Chunking {}/{} got exception".format(task["language"], task_document_name), exc_info=ex)
        raise

    chunks = []
    chunk = {
        "doc_id": task["doc_id"],
        "kb_id": str(task["kb_id"])
    }
    if task["pagerank"]:
        chunk[PAGERANK_FLD] = int(task["pagerank"])
    el = 0
    task_from_page = task["from_page"]
    idx = task_from_page * 1000
    for ck in cks:
        c = copy.deepcopy(chunk)
        c.update(ck)
        idx = idx + 1
        c["idx"] = idx
        c["id"] = xxhash.xxh64((ck["content_with_weight"] + str(c["doc_id"])).encode("utf-8")).hexdigest()
        c["created_at"] = str(datetime.now()).replace("T", " ")[:19]
        c["create_timestamp_flt"] = datetime.now().timestamp()
        if not c.get("image"):
            _ = c.pop("image", None)
            c["img_id"] = ""
            chunks.append(c)
            continue

        try:
            output_buffer = BytesIO()
            if isinstance(c["image"], bytes):
                output_buffer = BytesIO(c["image"])
            else:
                c["image"].save(output_buffer, format='JPEG')

            st = timer()
            STORAGE_IMPL.save(task["kb_id"] + "/" + c["id"], output_buffer.getvalue())
            el += timer() - st
        except Exception as ex:
            logging.error(
                "Saving image of chunk {}/{}/{} got exception".format(task["location"], task_document_name, c["id"]),
                exc_info=ex)
            raise

        c["img_id"] = "{}-{}".format(task["kb_id"], c["id"])
        del c["image"]
        chunks.append(c)

    if task["parser_config"].get("auto_keywords", 0):
        st = timer()
        await progress_callback(msg="Start to generate keywords for every chunk ...")
        chat_mdl = await LLMBundle.create(task["tenant_id"], LLMType.CHAT, llm_name=task["llm_id"],
                                          lang=task["language"])
        for c in chunks:
            cached = get_llm_cache(chat_mdl.llm_name, c["content_with_weight"], "keywords",
                                   {"topn": task["parser_config"]["auto_keywords"]})
            if not cached:
                cached = keyword_extraction(chat_mdl, c["content_with_weight"],
                                            task["parser_config"]["auto_keywords"])
                if cached:
                    set_llm_cache(chat_mdl.llm_name, c["content_with_weight"], cached, "keywords",
                                  {"topn": task["parser_config"]["auto_keywords"]})

            c["important_kwd"] = cached.split(",")
            c["important_tks"] = rag_tokenizer.tokenize(" ".join(c["important_kwd"]))
        await progress_callback(msg="Keywords generation completed in {:.2f}s".format(timer() - st))

    if task["parser_config"].get("auto_questions", 0):
        st = timer()
        await progress_callback(msg="Start to generate questions for every chunk ...")
        chat_mdl = await LLMBundle.create(task["tenant_id"], LLMType.CHAT, llm_name=task["llm_id"],
                                          lang=task["language"])
        for c in chunks:
            cached = get_llm_cache(chat_mdl.llm_name, c["content_with_weight"], "question",
                                   {"topn": task["parser_config"]["auto_questions"]})
            if not cached:
                cached = question_proposal(chat_mdl, c["content_with_weight"], task["parser_config"]["auto_questions"])
                if cached:
                    set_llm_cache(chat_mdl.llm_name, c["content_with_weight"], cached, "question",
                                  {"topn": task["parser_config"]["auto_questions"]})

            c["question_kwd"] = cached.split("\n")
            c["question_tks"] = rag_tokenizer.tokenize("\n".join(c["question_kwd"]))
        await progress_callback(msg="Question generation completed in {:.2f}s".format(timer() - st))

    if task["kb_parser_config"].get("tag_kb_ids", []):
        await progress_callback(msg="Start to tag for every chunk ...")
        kb_ids = task["kb_parser_config"]["tag_kb_ids"]
        tenant_id = task["tenant_id"]
        topn_tags = task["kb_parser_config"].get("topn_tags", 3)
        S = 1000
        st = timer()
        examples = []
        all_tags = get_tags_from_cache(kb_ids)
        if not all_tags:
            all_tags = settings.retrievaler.all_tags_in_portion(tenant_id, kb_ids, S)
            set_tags_to_cache(kb_ids, all_tags)
        else:
            all_tags = json.loads(all_tags)

        chat_mdl = await LLMBundle.create(task["tenant_id"], LLMType.CHAT, llm_name=task["llm_id"],
                                          lang=task["language"])
        for c in chunks:
            if settings.retrievaler.tag_content(tenant_id, kb_ids, c, all_tags, topn_tags=topn_tags, S=S):
                examples.append({"content": c["content_with_weight"], TAG_FLD: c[TAG_FLD]})
                continue
            cached = get_llm_cache(chat_mdl.llm_name, c["content_with_weight"], all_tags, {"topn": topn_tags})
            if not cached:
                cached = await content_tagging(chat_mdl, c["content_with_weight"], all_tags,
                                               random.choices(examples, k=2) if len(examples) > 2 else examples,
                                               topn=topn_tags)
                if cached:
                    cached = json.dumps(cached)
            if cached:
                set_llm_cache(chat_mdl.llm_name, c["content_with_weight"], cached, all_tags, {"topn": topn_tags})
                c[TAG_FLD] = json.loads(cached)

        await progress_callback(msg="Tagging completed in {:.2f}s".format(timer() - st))

    return chunks


def init_kb(row, vector_size: int):
    idxnm = search.index_name(row["tenant_id"])
    return settings.docStoreConn.createIdx(idxnm, row.get("kb_id", ""), vector_size)


async def embedding(docs, mdl, parser_config=None, callback=None):
    if parser_config is None:
        parser_config = {}
    batch_size = 16
    tts, cnts = [], []
    for d in docs:
        tts.append(d.get("docnm_kwd", "Title"))
        c = "\n".join(d.get("question_kwd", []))
        if not c:
            c = d["content_with_weight"]
        c = re.sub(r"</?(table|td|caption|tr|th)( [^<>]{0,12})?>", " ", c)
        if not c:
            c = "None"
        cnts.append(c)

    tk_count = 0
    if len(tts) == len(cnts):
        vts, c = await mdl.encode(tts[0: 1])
        tts = np.concatenate([vts for _ in range(len(tts))], axis=0)
        tk_count += c

    cnts_ = np.array([])
    for i in range(0, len(cnts), batch_size):
        vts, c = await mdl.encode(cnts[i: i + batch_size])
        if len(cnts_) == 0:
            cnts_ = vts
        else:
            cnts_ = np.concatenate((cnts_, vts), axis=0)
        tk_count += c
        await callback(prog=0.7 + 0.2 * (i + 1) / len(cnts), msg="")
    cnts = cnts_

    title_w = float(parser_config.get("filename_embd_weight", 0.1))
    vects = (title_w * tts + (1 - title_w) *
             cnts) if len(tts) == len(cnts) else cnts

    assert len(vects) == len(docs)
    vector_size = 0
    for i, d in enumerate(docs):
        v = vects[i].tolist()
        vector_size = len(v)
        d["q_%d_vec" % len(v)] = v
    return tk_count, vector_size


async def run_raptor(task, chat_mdl, embd_mdl, vector_size, callback=None):
    chunks = []
    idx_id_map = {}
    vctr_nm = "q_%d_vec" % vector_size
    for c in settings.retrievaler.chunk_list(task["doc_id"], task["tenant_id"], [str(task["kb_id"])],
                                             fields=["content_with_weight", vctr_nm, "idx", "id"]):
        idx = int(c.get("idx", 0))
        cid = c.get("id")
        idx_id_map[idx] = cid
        # content, embedding, mixed
        chunks.append((c["content_with_weight"], np.array(c[vctr_nm]), [idx]))
    raptor = Raptor(
        task["parser_config"]["raptor"].get("max_cluster", 64),
        chat_mdl,
        embd_mdl,
        task["parser_config"]["raptor"]["prompt"],
        task["parser_config"]["raptor"]["max_token"],
        task["parser_config"]["raptor"]["threshold"]
    )
    original_length = len(chunks)
    chunks = await raptor(chunks, task["parser_config"]["raptor"]["random_seed"], callback)
    doc = {
        "doc_id": task["doc_id"],
        "kb_id": [str(task["kb_id"])],
        "docnm_kwd": task["name"],
        "title_tks": rag_tokenizer.tokenize(task["name"])
    }
    if task["pagerank"]:
        doc[PAGERANK_FLD] = int(task["pagerank"])
    res = []
    tk_count = 0
    idx = 100000000
    for content, vctr, mixed in chunks[original_length:]:
        if len(mixed) == 1:
            logging.info(f"skip content of mixed: {mixed}")
            continue
        idx = idx + 1
        c = copy.deepcopy(doc)
        c["idx"] = idx
        doc_content = content + str(c["doc_id"])
        c["id"] = xxhash.xxh64(doc_content.encode("utf-8")).hexdigest()
        c["mixed"] = [{"idx": idx, "id": idx_id_map.get(idx, "")} for idx in mixed]
        c["created_at"] = str(datetime.now()).replace("T", " ")[:19]
        c["create_timestamp_flt"] = datetime.now().timestamp()
        c[vctr_nm] = vctr.tolist()
        c["content_with_weight"] = content
        c["content_ltks"] = rag_tokenizer.tokenize(content)
        c["content_sm_ltks"] = rag_tokenizer.fine_grained_tokenize(c["content_ltks"])
        res.append(c)
        tk_count += num_tokens_from_string(content)
    return res, tk_count


async def extract_doc_metadata(doc_id, name, tenant_id, language, chunks):
    tenant = await TenantService.get_by_id(tenant_id)
    content = ""
    count = 0
    for ck in chunks:
        content += ck["content_with_weight"] + "\n"
        count += 1
        if count >= 5:
            break
    try:
        llm_model = await LLMBundle.create(tenant.id, LLMType.CHAT, llm_name=tenant.llm_id, lang=language)
        runner = AgentRunner(llm_model=llm_model, system_prompt_file="metadata_analysis.json")
        result = await runner(file_name=name, file_content=content)
        logging.info(f"extract_doc_metadata metadata_analysis result {result}")
        # 尝试提取json内容，如果有```json标记的话
        json_content = re.search(r'```json\n(.*?)\n```', result, re.DOTALL)
        if json_content:
            json_str = json_content.group(1)
        else:
            json_str = result
        json_data = json.loads(json_str)
        chapter_regex = json_data.get("chapter_regex", None)
        metadata = json_data["metadata"]
        if chapter_regex is None:
            return metadata
    except Exception as ex:
        logging.error("extract_doc_metadata {} got exception".format(doc_id), exc_info=ex)
        return None

    pattern = chapter_regex["pattern"]
    chapters = []
    for ck in chunks:
        text = ck["content_with_weight"]
        for line in text.split('\n'):
            line = line.strip()
            if line and re.match(pattern, line):
                chapters.append(line)

    try:
        runner = AgentRunner(llm_model=llm_model, system_prompt_file="metadata_verifier.json")
        result = await runner(matched_chapters=chapters)
        # 尝试提取json内容，如果有```json标记的话
        json_content = re.search(r'```json\n(.*?)\n```', result, re.DOTALL)
        if json_content:
            json_str = json_content.group(1)
        else:
            json_str = result
        logging.info(f"extract_doc_metadata metadata_verifier result {result}")
        json_data = json.loads(json_str)
        cleaned_chapters = json_data.get("cleaned_chapters", "")
        metadata["总章节"] = cleaned_chapters
        return metadata
    except Exception as ex:
        logging.error("extract_doc_metadata {} got exception".format(doc_id), exc_info=ex)
        return metadata


async def do_handle_task(task):
    task_id = task["id"]
    task_from_page = task["from_page"]
    task_to_page = task["to_page"]
    task_tenant_id = task["tenant_id"]
    task_embedding_id = task["embd_id"]
    task_language = task["language"]
    task_llm_id = task["llm_id"]
    task_dataset_id = task["kb_id"]
    task_doc_id = task["doc_id"]
    task_document_name = task["name"]
    task_parser_config = task["parser_config"]
    task_parser_id = task['parser_id']
    # prepare the progress callback function
    progress_callback = partial(set_progress, task_id, task_from_page, task_to_page)

    logging.info(f"do_handle_task {task_document_name}: parser_id={task_parser_id}")
    lower_case_doc_engine = settings.DOC_ENGINE.lower()
    if lower_case_doc_engine == 'infinity' and task_parser_id.lower() == 'table':
        error_message = "Table parsing method is not supported by Infinity, please use other parsing methods or use Elasticsearch as the document engine."
        await progress_callback(-1, msg=error_message)
        raise Exception(error_message)

    try:
        task_canceled = await TaskService.check_cancel(task_id)
    except Exception as ex:
        logging.error(f"do_cancel {task_id} error", exc_info=ex)
        return
    if task_canceled:
        await progress_callback(-1, msg="Task has been canceled.")
        return

    try:
        # bind embedding model
        embedding_model = await LLMBundle.create(task_tenant_id, LLMType.EMBEDDING, llm_name=task_embedding_id,
                                                 lang=task_language)
    except Exception as ex:
        error_message = f'Fail to bind embedding model: {str(ex)}'
        await progress_callback(-1, msg=error_message)
        logging.error(error_message, exc_info=ex)
        raise

    vts, _ = await embedding_model.encode(["ok"])
    vector_size = len(vts[0])
    init_kb(task, vector_size)

    # Either using RAPTOR or Standard chunking methods
    if task.get("task_type", "") == "raptor":
        try:
            # bind LLM for raptor
            chat_model = await LLMBundle.create(task_tenant_id, LLMType.CHAT, llm_name=task_llm_id, lang=task_language)
            # run RAPTOR
            chunks, token_count = await run_raptor(task, chat_model, embedding_model, vector_size, progress_callback)
            logging.info(f"run_raptor chunks count={len(chunks)}, token_count={token_count}")
        except TaskCanceledException:
            raise
        except Exception as ex:
            error_message = f'Fail to bind LLM used by RAPTOR: {str(ex)}'
            await progress_callback(-1, msg=error_message)
            logging.error(error_message, exc_info=ex)
            return
    else:
        # Standard chunking methods
        start_ts = timer()
        chunks = await build_chunks(task, progress_callback)
        logging.info(
            "Build document {}: {:.2f}s chunks count:{}".format(task_document_name, timer() - start_ts, len(chunks)))
        if not chunks:
            await progress_callback(1., msg=f"No chunk built from {task_document_name}")
            return

        meta = await extract_doc_metadata(task_doc_id, task_document_name, task_tenant_id, task_language, chunks)
        if meta is not None:
            await DocumentService.update_meta_fields(task_doc_id, meta)

        await progress_callback(msg="Generate {} chunks".format(len(chunks)))
        start_ts = timer()
        try:
            token_count, vector_size = await embedding(chunks, embedding_model, task_parser_config, progress_callback)
        except Exception as ex:
            error_message = "Generate embedding error:{}".format(str(ex))
            await progress_callback(-1, error_message)
            logging.exception(error_message, exc_info=ex)
            raise
        progress_message = "Embedding chunks ({:.2f}s)".format(timer() - start_ts)
        logging.info(progress_message)
        await progress_callback(msg=progress_message)

    chunk_count = len(set([chunk["id"] for chunk in chunks]))
    start_ts = timer()
    doc_store_result = ""
    es_bulk_size = 4
    for b in range(0, len(chunks), es_bulk_size):
        doc_store_result = settings.docStoreConn.insert(chunks[b:b + es_bulk_size], search.index_name(task_tenant_id),
                                                        task_dataset_id)
        if b % 128 == 0:
            await progress_callback(prog=0.8 + 0.1 * (b + 1) / len(chunks), msg="")
        if doc_store_result:
            error_message = f"Insert chunk error: {doc_store_result}, please check log file and Elasticsearch/Infinity status!"
            await progress_callback(-1, msg=error_message)
            raise Exception(error_message)
        chunk_ids = [chunk["id"] for chunk in chunks[:b + es_bulk_size]]
        chunk_ids_str = " ".join(chunk_ids)
        try:
            await TaskService.update_chunk_ids(task["id"], chunk_ids_str)
        except Exception as ex:
            logging.error(f"do_handle_task update_chunk_ids failed since task {task['id']} is unknown.", exc_info=ex)
            settings.docStoreConn.delete({"id": chunk_ids}, search.index_name(task_tenant_id),
                                         task_dataset_id)
            return

    await DocumentService.increment_chunk_num(task_doc_id, task_dataset_id, token_count, chunk_count, 0)
    time_cost = timer() - start_ts
    await progress_callback(prog=1.0, msg="Done ({:.2f}s)".format(time_cost))


async def handle_task():
    global PAYLOAD, mt_lock, DONE_TASKS, FAILED_TASKS, CURRENT_TASK
    task = await collect()
    if task:
        try:
            with mt_lock:
                CURRENT_TASK = task["id"]

            await TaskService.update_by_id(task["id"], {'begin_at': datetime.now(UTC).replace(tzinfo=None)})
            session = get_current_session()
            await session.commit()

            await do_handle_task(task)

            with mt_lock:
                DONE_TASKS += 1
                CURRENT_TASK = None
        except TaskCanceledException:
            logging.info(f"handle_task=cancel")
            with mt_lock:
                DONE_TASKS += 1
                CURRENT_TASK = None

            await set_progress(task["id"], prog=-1, msg="handle_task got TaskCanceledException")
        except Exception as e:
            logging.error("handle_task set_progress error", exc_info=e)
            with mt_lock:
                FAILED_TASKS += 1
                CURRENT_TASK = None

            await set_progress(task["id"], prog=-1, msg=f"[Exception]: {e}")

    if PAYLOAD:
        PAYLOAD.ack()
        PAYLOAD = None


def report_status():
    global CONSUMER_NAME, BOOT_AT, PENDING_TASKS, LAG_TASKS, mt_lock, DONE_TASKS, FAILED_TASKS, CURRENT_TASK
    REDIS_CONN.sadd("TASKEXE", CONSUMER_NAME)
    while True:
        try:
            now = datetime.now()
            group_info = REDIS_CONN.queue_info(SVR_QUEUE_NAME, "leap_rag_svr_task_broker")
            if group_info is not None:
                PENDING_TASKS = int(group_info.get("pending", 0))
                LAG_TASKS = int(group_info.get("lag", 0))

            with mt_lock:
                heartbeat = json.dumps({
                    "name": CONSUMER_NAME,
                    "now": now.astimezone().isoformat(timespec="milliseconds"),
                    "boot_at": BOOT_AT.astimezone().isoformat(timespec="milliseconds"),
                    "pending": PENDING_TASKS,
                    "lag": LAG_TASKS,
                    "done": DONE_TASKS,
                    "failed": FAILED_TASKS,
                    "current": CURRENT_TASK,
                })
            REDIS_CONN.zadd(CONSUMER_NAME, heartbeat, now.timestamp())
            logging.info(f"{CONSUMER_NAME} reported heartbeat: {heartbeat}")

            expired = REDIS_CONN.zcount(CONSUMER_NAME, 0, now.timestamp() - 60 * 30)
            if expired > 0:
                REDIS_CONN.zpopmin(CONSUMER_NAME, expired)
        except Exception as ex:
            logging.error("report_status got exception", exc_info=ex)
        time.sleep(30)


def analyze_heap(snapshot1: tracemalloc.Snapshot, snapshot2: tracemalloc.Snapshot, snapshot_id: int, dump_full: bool):
    msg = ""
    if dump_full:
        stats2 = snapshot2.statistics('lineno')
        msg += f"{CONSUMER_NAME} memory usage of snapshot {snapshot_id}:\n"
        for stat in stats2[:10]:
            msg += f"{stat}\n"
    stats1_vs_2 = snapshot2.compare_to(snapshot1, 'lineno')
    msg += f"{CONSUMER_NAME} memory usage increase from snapshot {snapshot_id - 1} to snapshot {snapshot_id}:\n"
    for stat in stats1_vs_2[:10]:
        msg += f"{stat}\n"
    msg += f"{CONSUMER_NAME} detailed traceback for the top memory consumers:\n"
    for stat in stats1_vs_2[:3]:
        msg += '\n'.join(stat.traceback.format())
    logging.info(msg)
