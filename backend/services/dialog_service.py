import logging
import binascii
import os
import json
import time

import json_repair
import re
from collections import defaultdict
from copy import deepcopy
from timeit import default_timer as timer
import datetime
from datetime import timedelta

from models import LLMType, StatusEnum, transactional, get_current_session
from models import Dialog
from services.common_service import CommonService
from services.document_service import DocumentService
from services.knowledgebase_service import KnowledgebaseService
from services.llm_service import TenantLLMService, LLMBundle
from services import settings
from libs.utils import get_tags_from_cache, set_tags_to_cache
from rag.nlp import extract_between
from rag.nlp.search import index_name
from rag.settings import TAG_FLD
from rag.utils import rmSpace, num_tokens_from_string, encoder
from services.utils.file_utils import get_project_base_directory
from rag.utils.tavily_conn import Tavily
from sqlalchemy import select, and_
from sqlalchemy import delete


class DialogService(CommonService):
    model = Dialog

    @classmethod
    @transactional
    async def rename(cls, old_name, new_name):
        for it in await cls.find_by_name(old_name):
            it.name = new_name
            await cls.save_or_update_entity(it)

    @classmethod
    @transactional
    async def delete_by_name(cls, name):
        session = get_current_session()
        await session.execute(delete(cls.model).where(cls.model.name == name))

    @classmethod
    async def find_by_name(cls, name):
        return await cls.query(name=name)

    @classmethod
    def make_dialog(cls, req, tenant):
        name = req.get("name", "New Dialog")
        description = req.get("description", "A helpful dialog")
        language = req.get("language", "English")
        icon = req.get("icon", "")
        top_n = req.get("top_n", 6)
        top_k = req.get("top_k", 1024)
        rerank_id = req.get("rerank_id", "")
        similarity_threshold = req.get("similarity_threshold", 0.1)
        vector_similarity_weight = req.get("vector_similarity_weight", 0.3)
        llm_setting = req.get("llm_setting", {
            "temperature": 0.7,
            "top_p": 1,
            "presence_penalty": 0,
            "frequency_penalty": 0,
            "max_tokens": 8192
        })
        default_prompt = {
            "system": """你是一个智能知识库助手，请基于提供的知识库内容总结并回答用户的问题，要求列举知识库中的相关数据或信息进行详细解答。回答时需结合聊天历史上下文来作答。如果知识库中包含图片链接，请务必使用Markdown格式向用户展示图片。如果知识库中的内容无法回答用户的问题，必须明确回复："知识库中未找到您要的答案！"
                以下是知识库：
                {knowledge}
                以上是知识库。""",
            "prologue": "你好！有什么可以帮到你的吗？",
            "parameters": [
                {"key": "knowledge", "optional": False}
            ],
            "empty_response": ""
        }
        if language == "English":
            default_prompt["system"] = """You are an intelligent knowledge base assistant. Please summarize and answer user questions based on the provided knowledge base content, listing relevant data or information from the knowledge base for detailed answers. When answering, you need to incorporate the chat history context. If the knowledge base contains image links, please display them to the user using Markdown format. If the knowledge base content cannot answer the user's question, you must clearly reply: "No relevant information found in the knowledge base!"
                Here is the knowledge base:
                {knowledge}
                Above is the knowledge base."""
            default_prompt["prologue"] = "Hello! How can I help you today?"

        prompt_config = req.get("prompt_config", default_prompt)

        if not prompt_config["system"]:
            prompt_config["system"] = default_prompt["system"]

        for p in prompt_config["parameters"]:
            if p["optional"]:
                continue
            if prompt_config["system"].find("{%s}" % p["key"]) < 0:
                logging.error("Parameter '{}' is not used".format(p["key"]))

        llm_id = req.get("llm_id", tenant.llm_id)

        dialog = Dialog()
        dialog.tenant_id = tenant.id
        dialog.name = name
        dialog.language = language
        dialog.kb_ids = req.get("kb_ids", [])
        dialog.description = description
        dialog.llm_id = llm_id
        dialog.llm_setting = llm_setting
        dialog.prompt_config = prompt_config
        dialog.top_n = top_n
        dialog.top_k = top_k
        dialog.rerank_id = rerank_id
        dialog.similarity_threshold = similarity_threshold
        dialog.vector_similarity_weight = vector_similarity_weight
        dialog.icon = icon
        return dialog

    @classmethod
    async def find_list(cls, tenant_id,
                        page_number, items_per_page, orderby, desc, id, name):
        query = select(cls.model).where(
            and_(
                cls.model.tenant_id == tenant_id,
                cls.model.status == StatusEnum.VALID.value
            )
        )

        if id:
            query = query.where(cls.model.id == id)
        if name:
            query = query.where(cls.model.name == name)

        order_col = getattr(cls.model, orderby)
        if desc:
            query = query.order_by(order_col.desc())
        else:
            query = query.order_by(order_col.asc())

        # Add pagination
        query = query.offset((page_number - 1) * items_per_page).limit(items_per_page)
        session = get_current_session()
        result = await session.execute(query)
        return [row.to_dict() for row in result.scalars().all()]


def message_fit_in(msg, max_length=4000):
    def count():
        nonlocal msg
        tks_cnts = []
        for m in msg:
            tks_cnts.append(
                {"role": m["role"], "count": num_tokens_from_string(m["content"])})
        total = 0
        for m in tks_cnts:
            total += m["count"]
        return total

    c = count()
    if c < max_length:
        return c, msg

    msg_ = [m for m in msg[:-1] if m["role"] == "system"]
    if len(msg) > 1:
        msg_.append(msg[-1])
    msg = msg_
    c = count()
    if c < max_length:
        return c, msg

    ll = num_tokens_from_string(msg_[0]["content"])
    ll2 = num_tokens_from_string(msg_[-1]["content"])
    if ll / (ll + ll2) > 0.8:
        m = msg_[0]["content"]
        m = encoder.decode(encoder.encode(m)[:max_length - ll2])
        msg[0]["content"] = m
        return max_length, msg

    m = msg_[1]["content"]
    m = encoder.decode(encoder.encode(m)[:max_length - ll2])
    msg[1]["content"] = m
    return max_length, msg


def llm_id2llm_type(llm_id):
    llm_id, _ = TenantLLMService.split_model_name_and_factory(llm_id)
    fnm = os.path.join(get_project_base_directory(), "configs")
    llm_factories = json.load(open(os.path.join(fnm, "llm_factories.json"), "r"))
    for llm_factory in llm_factories["factory_llm_infos"]:
        for llm in llm_factory["llm"]:
            if llm_id == llm["llm_name"]:
                return llm["model_type"].strip(",")[-1]


async def kb_prompt(kbinfos, max_tokens):
    knowledges = [ck["content_with_weight"] for ck in kbinfos["chunks"]]
    used_token_count = 0
    chunks_num = 0
    for i, c in enumerate(knowledges):
        used_token_count += num_tokens_from_string(c)
        chunks_num += 1
        if max_tokens * 0.97 < used_token_count:
            knowledges = knowledges[:i]
            logging.info(f"Not all the retrieval into prompt: {i + 1}/{len(knowledges)}")
            break

    docs = await DocumentService.find_by_ids([ck["doc_id"] for ck in kbinfos["chunks"][:chunks_num]])
    docs = {d.id: d.meta_fields for d in docs}

    doc2chunks = defaultdict(lambda: {"chunks": [], "meta": []})
    for ck in kbinfos["chunks"][:chunks_num]:
        doc2chunks[ck["docnm_kwd"]]["chunks"].append(
            (f"URL: {ck['url']}\n" if "url" in ck else "") + ck["content_with_weight"])
        doc2chunks[ck["docnm_kwd"]]["meta"] = docs.get(ck["doc_id"], {})

    knowledges = []
    for nm, cks_meta in doc2chunks.items():
        txt = f"Document: {nm} \n"
        for k, v in cks_meta["meta"].items():
            txt += f"{k}: {v}\n"
        txt += "Relevant fragments as following:\n"
        for i, chunk in enumerate(cks_meta["chunks"], 1):
            txt += f"{i}. {chunk}\n"
        knowledges.append(txt)
    return knowledges


async def label_question(question, kbs):
    tags = None
    tag_kb_ids = []
    for kb in kbs:
        if kb.parser_config.get("tag_kb_ids"):
            tag_kb_ids.extend(kb.parser_config["tag_kb_ids"])
    if tag_kb_ids:
        all_tags = get_tags_from_cache(tag_kb_ids)
        if not all_tags:
            all_tags = settings.retrievaler.all_tags_in_portion(kb.tenant_id, tag_kb_ids)
            set_tags_to_cache(all_tags, tag_kb_ids)
        else:
            all_tags = json.loads(all_tags)
        tag_kbs = await KnowledgebaseService.find_by_ids(tag_kb_ids)
        tags = settings.retrievaler.tag_query(question,
                                              list(set([kb.tenant_id for kb in tag_kbs])),
                                              tag_kb_ids,
                                              all_tags,
                                              kb.parser_config.get("topn_tags", 3)
                                              )
    return tags


async def chat_solo(dialog, messages, stream=True):
    if llm_id2llm_type(dialog.llm_id) == "image2text":
        chat_mdl = await LLMBundle.create(dialog.tenant_id, LLMType.IMAGE2TEXT, dialog.llm_id)
    else:
        chat_mdl = await LLMBundle.create(dialog.tenant_id, LLMType.CHAT, dialog.llm_id)

    prompt_config = dialog.prompt_config
    tts_mdl = None
    if prompt_config.get("tts"):
        tts_mdl = await LLMBundle.create(dialog.tenant_id, LLMType.TTS)
    msg = [{"role": m["role"], "content": re.sub(r"##\d+\$\$", "", m["content"])}
           for m in messages if m["role"] != "system"]
    if stream:
        last_ans = ""
        async for ans in chat_mdl.chat_streamly(prompt_config.get("system", ""), msg, dialog.llm_setting):
            answer = ans
            delta_ans = ans[len(last_ans):]
            if num_tokens_from_string(delta_ans) < 16:
                continue
            last_ans = answer
            yield {"answer": answer, "reference": {}, "audio_binary": await tts(tts_mdl, delta_ans), "prompt": "",
                   "created_at": time.time()}
    else:
        answer = await chat_mdl.chat(prompt_config.get("system", ""), msg, dialog.llm_setting)
        user_content = msg[-1].get("content", "[content not available]")
        logging.debug("User: {}|Assistant: {}".format(user_content, answer))
        yield {"answer": answer, "reference": {}, "audio_binary": await tts(tts_mdl, answer), "prompt": "",
               "created_at": time.time()}


async def chat(dialog, messages, stream=True, **kwargs):
    assert messages[-1]["role"] == "user", "The last content of this conversation is not from user."
    if not dialog.kb_ids:
        async for ans in chat_solo(dialog, messages, stream):
            yield ans
        return

    chat_start_ts = timer()

    if llm_id2llm_type(dialog.llm_id) == "image2text":
        llm_model_config = await TenantLLMService.get_model_config(dialog.tenant_id, LLMType.IMAGE2TEXT, dialog.llm_id)
    else:
        llm_model_config = await TenantLLMService.get_model_config(dialog.tenant_id, LLMType.CHAT, dialog.llm_id)

    max_tokens = llm_model_config.get("max_tokens", 8192)

    check_llm_ts = timer()

    kbs = await KnowledgebaseService.find_by_ids(dialog.kb_ids)
    embedding_list = list(set([kb.embd_id for kb in kbs]))
    if len(embedding_list) != 1:
        yield {"answer": "**ERROR**: Knowledge bases use different embedding models.", "reference": []}
        return

    embedding_model_name = embedding_list[0]

    retriever = settings.retrievaler

    questions = [m["content"] for m in messages if m["role"] == "user"][-3:]
    attachments = kwargs["doc_ids"].split(",") if "doc_ids" in kwargs else None
    if "doc_ids" in messages[-1]:
        attachments = messages[-1]["doc_ids"]

    create_retriever_ts = timer()

    embd_mdl = await LLMBundle.create(dialog.tenant_id, LLMType.EMBEDDING, embedding_model_name)
    if not embd_mdl:
        raise LookupError("Embedding model(%s) not found" % embedding_model_name)

    bind_embedding_ts = timer()

    if llm_id2llm_type(dialog.llm_id) == "image2text":
        chat_mdl = await LLMBundle.create(dialog.tenant_id, LLMType.IMAGE2TEXT, dialog.llm_id)
    else:
        chat_mdl = await LLMBundle.create(dialog.tenant_id, LLMType.CHAT, dialog.llm_id)

    bind_llm_ts = timer()

    prompt_config = dialog.prompt_config
    field_map = await KnowledgebaseService.get_field_map(dialog.kb_ids)
    tts_mdl = None
    if prompt_config.get("tts"):
        tts_mdl = await LLMBundle.create(dialog.tenant_id, LLMType.TTS)
    # try to use sql if field mapping is good to go
    if field_map:
        logging.debug("Use SQL to retrieval:{}".format(questions[-1]))
        ans = await use_sql(questions[-1], field_map, dialog.tenant_id, chat_mdl, prompt_config.get("quote", True))
        if ans:
            yield ans
            return

    for p in prompt_config["parameters"]:
        if p["key"] == "knowledge":
            continue
        if p["key"] not in kwargs and not p["optional"]:
            raise KeyError("Miss parameter: " + p["key"])
        if p["key"] not in kwargs:
            prompt_config["system"] = prompt_config["system"].replace(
                "{%s}" % p["key"], " ")

    if len(questions) > 1 and prompt_config.get("refine_multiturn"):
        questions = [await full_question(dialog.tenant_id, dialog.llm_id, messages)]
    else:
        questions = questions[-1:]

    refine_question_ts = timer()

    rerank_mdl = None
    if dialog.rerank_id:
        rerank_mdl = await LLMBundle.create(dialog.tenant_id, LLMType.RERANK, dialog.rerank_id)

    bind_reranker_ts = timer()
    generate_keyword_ts = bind_reranker_ts
    thought = ""
    kbinfos = {"total": 0, "chunks": [], "doc_aggs": []}

    if "knowledge" not in [p["key"] for p in prompt_config["parameters"]]:
        knowledges = []
    else:
        if prompt_config.get("keyword", False):
            questions[-1] += keyword_extraction(chat_mdl, questions[-1])
            generate_keyword_ts = timer()

        tenant_ids = list(set([kb.tenant_id for kb in kbs]))

        knowledges = []
        if prompt_config.get("reasoning", False):
            async for think in reasoning(kbinfos, " ".join(questions), chat_mdl, embd_mdl, tenant_ids, dialog.kb_ids,
                                         prompt_config, MAX_SEARCH_LIMIT=3):
                if isinstance(think, str):
                    thought = think
                    knowledges = [t for t in think.split("\n") if t]
                else:
                    yield think
        else:
            kbinfos = await retriever.retrieval(" ".join(questions), embd_mdl, tenant_ids, dialog.kb_ids, 1,
                                                dialog.top_n,
                                                dialog.similarity_threshold,
                                                dialog.vector_similarity_weight,
                                                doc_ids=attachments,
                                                top=dialog.top_k, aggs=False, rerank_mdl=rerank_mdl,
                                                rank_feature=(await label_question(" ".join(questions), kbs))
                                                )
            if prompt_config.get("tavily_api_key"):
                tav = Tavily(prompt_config["tavily_api_key"])
                tav_res = tav.retrieve_chunks(" ".join(questions))
                kbinfos["chunks"].extend(tav_res["chunks"])
                kbinfos["doc_aggs"].extend(tav_res["doc_aggs"])

            knowledges = await kb_prompt(kbinfos, max_tokens)

    logging.debug(
        "{}->{}".format(" ".join(questions), "\n->".join(knowledges)))

    retrieval_ts = timer()
    if not knowledges and prompt_config.get("empty_response"):
        empty_res = prompt_config["empty_response"]
        yield {"answer": empty_res, "reference": kbinfos, "audio_binary": await tts(tts_mdl, empty_res)}
        return

    kwargs["knowledge"] = "\n------\n" + "\n\n------\n\n".join(knowledges)
    gen_conf = dialog.llm_setting

    msg = [{"role": "system", "content": prompt_config["system"].format(**kwargs)}]
    msg.extend([{"role": m["role"], "content": re.sub(r"##\d+\$\$", "", m["content"])}
                for m in messages if m["role"] != "system"])
    used_token_count, msg = message_fit_in(msg, int(max_tokens * 0.97))
    assert len(msg) >= 2, f"message_fit_in has bug: {msg}"
    prompt = msg[0]["content"]
    prompt += "\n\n### Query:\n%s" % " ".join(questions)

    if "max_tokens" in gen_conf:
        gen_conf["max_tokens"] = min(
            gen_conf["max_tokens"],
            max_tokens - used_token_count)

    async def decorate_answer(answer):
        nonlocal prompt_config, knowledges, kwargs, kbinfos, prompt, retrieval_ts

        refs = []
        ans = answer.split("</think>")
        think = ""
        if len(ans) == 2:
            think = ans[0] + "</think>"
            answer = ans[1]
        if knowledges and (prompt_config.get("quote", True) and kwargs.get("quote", True)):
            answer, idx = await retriever.insert_citations(answer,
                                                           [ck["content_ltks"]
                                                            for ck in kbinfos["chunks"]],
                                                           [ck["vector"]
                                                            for ck in kbinfos["chunks"]],
                                                           embd_mdl,
                                                           tkweight=1 - dialog.vector_similarity_weight,
                                                           vtweight=dialog.vector_similarity_weight)
            idx = set([kbinfos["chunks"][int(i)]["doc_id"] for i in idx])
            recall_docs = [
                d for d in kbinfos["doc_aggs"] if d["doc_id"] in idx]
            if not recall_docs:
                recall_docs = kbinfos["doc_aggs"]
            kbinfos["doc_aggs"] = recall_docs

            refs = deepcopy(kbinfos)
            for c in refs["chunks"]:
                if c.get("vector"):
                    del c["vector"]

        if answer.lower().find("invalid key") >= 0 or answer.lower().find("invalid api") >= 0:
            answer += " Please set LLM API-Key in 'User Setting -> Model providers -> API-Key'"
        finish_chat_ts = timer()

        total_time_cost = (finish_chat_ts - chat_start_ts) * 1000
        check_llm_time_cost = (check_llm_ts - chat_start_ts) * 1000
        create_retriever_time_cost = (create_retriever_ts - check_llm_ts) * 1000
        bind_embedding_time_cost = (bind_embedding_ts - create_retriever_ts) * 1000
        bind_llm_time_cost = (bind_llm_ts - bind_embedding_ts) * 1000
        refine_question_time_cost = (refine_question_ts - bind_llm_ts) * 1000
        bind_reranker_time_cost = (bind_reranker_ts - refine_question_ts) * 1000
        generate_keyword_time_cost = (generate_keyword_ts - bind_reranker_ts) * 1000
        retrieval_time_cost = (retrieval_ts - generate_keyword_ts) * 1000
        generate_result_time_cost = (finish_chat_ts - retrieval_ts) * 1000

        prompt = f"{prompt}\n\n - Total: {total_time_cost:.1f}ms\n  - Check LLM: {check_llm_time_cost:.1f}ms\n  - Create retriever: {create_retriever_time_cost:.1f}ms\n  - Bind embedding: {bind_embedding_time_cost:.1f}ms\n  - Bind LLM: {bind_llm_time_cost:.1f}ms\n  - Tune question: {refine_question_time_cost:.1f}ms\n  - Bind reranker: {bind_reranker_time_cost:.1f}ms\n  - Generate keyword: {generate_keyword_time_cost:.1f}ms\n  - Retrieval: {retrieval_time_cost:.1f}ms\n  - Generate answer: {generate_result_time_cost:.1f}ms"
        return {"answer": think + answer, "reference": refs, "prompt": re.sub(r"\n", "  \n", prompt),
                "created_at": time.time()}

    if stream:
        last_ans = ""
        answer = ""
        async for ans in chat_mdl.chat_streamly(prompt, msg[1:], gen_conf):
            if thought:
                ans = re.sub(r"<think>.*</think>", "", ans, flags=re.DOTALL)
            answer = ans
            delta_ans = ans[len(last_ans):]
            if num_tokens_from_string(delta_ans) < 16:
                continue
            last_ans = answer
            yield {"answer": thought + answer, "reference": {}, "audio_binary": await tts(tts_mdl, delta_ans)}
        delta_ans = answer[len(last_ans):]
        if delta_ans:
            yield {"answer": thought + answer, "reference": {}, "audio_binary": await tts(tts_mdl, delta_ans)}
        yield await decorate_answer(thought + answer)
        return
    else:
        answer = await chat_mdl.chat(prompt, msg[1:], gen_conf)
        user_content = msg[-1].get("content", "[content not available]")
        logging.debug("User: {}|Assistant: {}".format(user_content, answer))
        res = await decorate_answer(answer)
        res["audio_binary"] = await tts(tts_mdl, answer)
        yield res
        return


async def use_sql(question, field_map, tenant_id, chat_mdl, quota=True):
    sys_prompt = "You are a Database Administrator. You need to check the fields of the following tables based on the user's list of questions and write the SQL corresponding to the last question."
    user_prompt = """
Table name: {};
Table of database fields are as follows:
{}

Question are as follows:
{}
Please write the SQL, only SQL, without any other explanations or text.
""".format(
        index_name(tenant_id),
        "\n".join([f"{k}: {v}" for k, v in field_map.items()]),
        question
    )
    tried_times = 0

    async def get_table():
        nonlocal sys_prompt, user_prompt, question, tried_times
        sql = await chat_mdl.chat(sys_prompt, [{"role": "user", "content": user_prompt}], {
            "temperature": 0.06})
        logging.debug(f"{question} ==> {user_prompt} get SQL: {sql}")
        sql = re.sub(r"[\r\n]+", " ", sql.lower())
        sql = re.sub(r".*select ", "select ", sql.lower())
        sql = re.sub(r" +", " ", sql)
        sql = re.sub(r"([;；]|```).*", "", sql)
        if sql[:len("select ")] != "select ":
            return None, None
        if not re.search(r"((sum|avg|max|min)\(|group by )", sql.lower()):
            if sql[:len("select *")] != "select *":
                sql = "select doc_id,docnm_kwd," + sql[6:]
            else:
                flds = []
                for k in field_map.keys():
                    if len(flds) > 11:
                        break
                    flds.append(k)
                sql = "select doc_id,docnm_kwd," + ",".join(flds) + sql[8:]

        logging.debug(f"{question} get SQL(refined): {sql}")
        tried_times += 1
        return settings.retrievaler.sql_retrieval(sql, format="json"), sql

    tbl, sql = await get_table()
    if tbl is None:
        return None
    if tbl.get("error") and tried_times <= 2:
        user_prompt = """
        Table name: {};
        Table of database fields are as follows:
        {}
        
        Question are as follows:
        {}
        Please write the SQL, only SQL, without any other explanations or text.
        

        The SQL error you provided last time is as follows:
        {}

        Error issued by database as follows:
        {}

        Please correct the error and write SQL again, only SQL, without any other explanations or text.
        """.format(
            index_name(tenant_id),
            "\n".join([f"{k}: {v}" for k, v in field_map.items()]),
            question, sql, tbl["error"]
        )
        tbl, sql = await get_table()
        logging.debug("TRY it again: {}".format(sql))

    logging.debug("GET table: {}".format(tbl))
    if tbl.get("error") or len(tbl["rows"]) == 0:
        return None

    docid_idx = set([ii for ii, c in enumerate(
        tbl["columns"]) if c["name"] == "doc_id"])
    doc_name_idx = set([ii for ii, c in enumerate(
        tbl["columns"]) if c["name"] == "docnm_kwd"])
    column_idx = [ii for ii in range(
        len(tbl["columns"])) if ii not in (docid_idx | doc_name_idx)]

    # compose Markdown table
    columns = "|" + "|".join([re.sub(r"(/.*|（[^（）]+）)", "", field_map.get(tbl["columns"][i]["name"],
                                                                          tbl["columns"][i]["name"])) for i in
                              column_idx]) + ("|Source|" if docid_idx and docid_idx else "|")

    line = "|" + "|".join(["------" for _ in range(len(column_idx))]) + \
           ("|------|" if docid_idx and docid_idx else "")

    rows = ["|" +
            "|".join([rmSpace(str(r[i])) for i in column_idx]).replace("None", " ") +
            "|" for r in tbl["rows"]]
    rows = [r for r in rows if re.sub(r"[ |]+", "", r)]
    if quota:
        rows = "\n".join([r + f" ##{ii}$$ |" for ii, r in enumerate(rows)])
    else:
        rows = "\n".join([r + f" ##{ii}$$ |" for ii, r in enumerate(rows)])
    rows = re.sub(r"T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+Z)?\|", "|", rows)

    if not docid_idx or not doc_name_idx:
        logging.info("SQL missing field: " + sql)
        return {
            "answer": "\n".join([columns, line, rows]),
            "reference": {"chunks": [], "doc_aggs": []},
            "prompt": sys_prompt
        }

    docid_idx = list(docid_idx)[0]
    doc_name_idx = list(doc_name_idx)[0]
    doc_aggs = {}
    for r in tbl["rows"]:
        if r[docid_idx] not in doc_aggs:
            doc_aggs[r[docid_idx]] = {"doc_name": r[doc_name_idx], "count": 0}
        doc_aggs[r[docid_idx]]["count"] += 1
    return {
        "answer": "\n".join([columns, line, rows]),
        "reference": {"chunks": [{"doc_id": r[docid_idx], "docnm_kwd": r[doc_name_idx]} for r in tbl["rows"]],
                      "doc_aggs": [{"doc_id": did, "doc_name": d["doc_name"], "count": d["count"]} for did, d in
                                   doc_aggs.items()]},
        "prompt": sys_prompt
    }


async def relevant(tenant_id, llm_id, question, contents: list):
    if llm_id2llm_type(llm_id) == "image2text":
        chat_mdl = await LLMBundle.create(tenant_id, LLMType.IMAGE2TEXT, llm_id)
    else:
        chat_mdl = await LLMBundle.create(tenant_id, LLMType.CHAT, llm_id)
    prompt = """
        You are a grader assessing relevance of a retrieved document to a user question. 
        It does not need to be a stringent test. The goal is to filter out erroneous retrievals.
        If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant. 
        Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question.
        No other words needed except 'yes' or 'no'.
    """
    if not contents:
        return False
    contents = "Documents: \n" + "   - ".join(contents)
    contents = f"Question: {question}\n" + contents
    if num_tokens_from_string(contents) >= chat_mdl.max_length - 4:
        contents = encoder.decode(encoder.encode(contents)[:chat_mdl.max_length - 4])
    ans = await chat_mdl.chat(prompt, [{"role": "user", "content": contents}], {"temperature": 0.01})
    if ans.lower().find("yes") >= 0:
        return True
    return False


async def rewrite(tenant_id, llm_id, question):
    if llm_id2llm_type(llm_id) == "image2text":
        chat_mdl = await LLMBundle.create(tenant_id, LLMType.IMAGE2TEXT, llm_id)
    else:
        chat_mdl = await LLMBundle.create(tenant_id, LLMType.CHAT, llm_id)
    prompt = """
        You are an expert at query expansion to generate a paraphrasing of a question.
        I can't retrieval relevant information from the knowledge base by using user's question directly.     
        You need to expand or paraphrase user's question by multiple ways such as using synonyms words/phrase, 
        writing the abbreviation in its entirety, adding some extra descriptions or explanations, 
        changing the way of expression, translating the original question into another language (English/Chinese), etc. 
        And return 5 versions of question and one is from translation.
        Just list the question. No other words are needed.
    """
    ans = await chat_mdl.chat(prompt, [{"role": "user", "content": question}], {"temperature": 0.8})
    return ans


async def keyword_extraction(chat_mdl, content, topn=3):
    prompt = f"""
Role: You're a text analyzer. 
Task: extract the most important keywords/phrases of a given piece of text content.
Requirements: 
  - Summarize the text content, and give top {topn} important keywords/phrases.
  - The keywords MUST be in language of the given piece of text content.
  - The keywords are delimited by ENGLISH COMMA.
  - Keywords ONLY in output.

### Text Content 
{content}

"""
    msg = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "Output: "}
    ]
    _, msg = message_fit_in(msg, chat_mdl.max_length)
    kwd = await chat_mdl.chat(prompt, msg[1:], {"temperature": 0.2})
    if isinstance(kwd, tuple):
        kwd = kwd[0]
    kwd = re.sub(r"<think>.*</think>", "", kwd, flags=re.DOTALL)
    if kwd.find("**ERROR**") >= 0:
        return ""
    return kwd


async def question_proposal(chat_mdl, content, topn=3):
    prompt = f"""
Role: You're a text analyzer. 
Task:  propose {topn} questions about a given piece of text content.
Requirements: 
  - Understand and summarize the text content, and propose top {topn} important questions.
  - The questions SHOULD NOT have overlapping meanings.
  - The questions SHOULD cover the main content of the text as much as possible.
  - The questions MUST be in language of the given piece of text content.
  - One question per line.
  - Question ONLY in output.

### Text Content 
{content}

"""
    msg = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "Output: "}
    ]
    _, msg = message_fit_in(msg, chat_mdl.max_length)
    kwd = await chat_mdl.chat(prompt, msg[1:], {"temperature": 0.2})
    if isinstance(kwd, tuple):
        kwd = kwd[0]
    kwd = re.sub(r"<think>.*</think>", "", kwd, flags=re.DOTALL)
    if kwd.find("**ERROR**") >= 0:
        return ""
    return kwd


async def full_question(tenant_id, llm_id, messages):
    if llm_id2llm_type(llm_id) == "image2text":
        chat_mdl = await LLMBundle.create(tenant_id, LLMType.IMAGE2TEXT, llm_id)
    else:
        chat_mdl = await LLMBundle.create(tenant_id, LLMType.CHAT, llm_id)
    conv = []
    for m in messages:
        if m["role"] not in ["user", "assistant"]:
            continue
        conv.append("{}: {}".format(m["role"].upper(), m["content"]))
    conv = "\n".join(conv)
    today = datetime.date.today().isoformat()
    yesterday = (datetime.date.today() - timedelta(days=1)).isoformat()
    tomorrow = (datetime.date.today() + timedelta(days=1)).isoformat()
    prompt = f"""
Role: A helpful assistant

Task and steps: 
    1. Generate a full user question that would follow the conversation.
    2. If the user's question involves relative date, you need to convert it into absolute date based on the current date, which is {today}. For example: 'yesterday' would be converted to {yesterday}.
    
Requirements & Restrictions:
  - Text generated MUST be in the same language of the original user's question.
  - If the user's latest question is completely, don't do anything, just return the original question.
  - DON'T generate anything except a refined question.

######################
-Examples-
######################

# Example 1
## Conversation
USER: What is the name of Donald Trump's father?
ASSISTANT:  Fred Trump.
USER: And his mother?
###############
Output: What's the name of Donald Trump's mother?

------------
# Example 2
## Conversation
USER: What is the name of Donald Trump's father?
ASSISTANT:  Fred Trump.
USER: And his mother?
ASSISTANT:  Mary Trump.
User: What's her full name?
###############
Output: What's the full name of Donald Trump's mother Mary Trump?

------------
# Example 3
## Conversation
USER: What's the weather today in London?
ASSISTANT:  Cloudy.
USER: What's about tomorrow in Rochester?
###############
Output: What's the weather in Rochester on {tomorrow}?
######################

# Real Data
## Conversation
{conv}
###############
    """
    ans = await chat_mdl.chat(prompt, [{"role": "user", "content": "Output: "}], {"temperature": 0.2})
    ans = re.sub(r"<think>.*</think>", "", ans, flags=re.DOTALL)
    return ans if ans.find("**ERROR**") < 0 else messages[-1]["content"]


async def tts(tts_mdl, text):
    if not tts_mdl or not text:
        return None
    bin = b""
    async for chunk in tts_mdl.tts(text):
        bin += chunk
    return binascii.hexlify(bin).decode("utf-8")


async def ask(question, kb_ids, tenant_id):
    kbs = await KnowledgebaseService.find_by_ids(kb_ids)
    embedding_list = list(set([kb.embd_id for kb in kbs]))

    retriever = settings.retrievaler
    embd_mdl = await LLMBundle.create(tenant_id, LLMType.EMBEDDING, embedding_list[0])
    chat_mdl = await LLMBundle.create(tenant_id, LLMType.CHAT)
    max_tokens = chat_mdl.max_length
    tenant_ids = list(set([kb.tenant_id for kb in kbs]))
    kbinfos = await retriever.retrieval(question, embd_mdl, tenant_ids, kb_ids,
                                        1, 12, 0.1, 0.3, aggs=False,
                                        rank_feature=(await label_question(question, kbs))
                                        )
    knowledges = await kb_prompt(kbinfos, max_tokens)
    prompt = """
    Role: You're a smart assistant. Your name is Miss R.
    Task: Summarize the information from knowledge bases and answer user's question.
    Requirements and restriction:
      - DO NOT make things up, especially for numbers.
      - If the information from knowledge is irrelevant with user's question, JUST SAY: Sorry, no relevant information provided.
      - Answer with markdown format text.
      - Answer in language of user's question.
      - DO NOT make things up, especially for numbers.

    ### Information from knowledge bases
    %s

    The above is information from knowledge bases.

    """ % "\n".join(knowledges)
    msg = [{"role": "user", "content": question}]

    async def decorate_answer(answer):
        nonlocal knowledges, kbinfos, prompt
        answer, idx = await retriever.insert_citations(answer,
                                                       [ck["content_ltks"]
                                                        for ck in kbinfos["chunks"]],
                                                       [ck["vector"]
                                                        for ck in kbinfos["chunks"]],
                                                       embd_mdl,
                                                       tkweight=0.7,
                                                       vtweight=0.3)
        idx = set([kbinfos["chunks"][int(i)]["doc_id"] for i in idx])
        recall_docs = [
            d for d in kbinfos["doc_aggs"] if d["doc_id"] in idx]
        if not recall_docs:
            recall_docs = kbinfos["doc_aggs"]
        kbinfos["doc_aggs"] = recall_docs
        refs = deepcopy(kbinfos)
        for c in refs["chunks"]:
            if c.get("vector"):
                del c["vector"]

        if answer.lower().find("invalid key") >= 0 or answer.lower().find("invalid api") >= 0:
            answer += " Please set LLM API-Key in 'User Setting -> Model Providers -> API-Key'"
        return {"answer": answer, "reference": refs}

    answer = ""
    async for ans in chat_mdl.chat_streamly(prompt, msg, {"temperature": 0.1}):
        answer = ans
        yield {"answer": answer, "reference": {}}
    answer = await decorate_answer(answer)
    yield answer


async def content_tagging(chat_mdl, content, all_tags, examples, topn=3):
    prompt = f"""
Role: You're a text analyzer. 

Task: Tag (put on some labels) to a given piece of text content based on the examples and the entire tag set.

Steps:: 
  - Comprehend the tag/label set.
  - Comprehend examples which all consist of both text content and assigned tags with relevance score in format of JSON.
  - Summarize the text content, and tag it with top {topn} most relevant tags from the set of tag/label and the corresponding relevance score.

Requirements
  - The tags MUST be from the tag set.
  - The output MUST be in JSON format only, the key is tag and the value is its relevance score.
  - The relevance score must be range from 1 to 10.
  - Keywords ONLY in output.

# TAG SET
{", ".join(all_tags)}

"""
    for i, ex in enumerate(examples):
        prompt += """
# Examples {}
### Text Content
{}

Output:
{}

        """.format(i, ex["content"], json.dumps(ex[TAG_FLD], indent=2, ensure_ascii=False))

    prompt += f"""
# Real Data
### Text Content
{content}

"""
    msg = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "Output: "}
    ]
    _, msg = message_fit_in(msg, chat_mdl.max_length)
    kwd = await chat_mdl.chat(prompt, msg[1:], {"temperature": 0.5})
    if isinstance(kwd, tuple):
        kwd = kwd[0]
    kwd = re.sub(r"<think>.*</think>", "", kwd, flags=re.DOTALL)
    if kwd.find("**ERROR**") >= 0:
        raise Exception(kwd)

    try:
        return json_repair.loads(kwd)
    except json_repair.JSONDecodeError:
        try:
            result = kwd.replace(prompt[:-1], '').replace('user', '').replace('model', '').strip()
            result = '{' + result.split('{')[1].split('}')[0] + '}'
            return json_repair.loads(result)
        except Exception as e:
            logging.exception(f"JSON parsing error: {result} -> {e}")
            raise e


async def reasoning(chunk_info: dict, question: str, chat_mdl: LLMBundle, embd_mdl: LLMBundle,
                    tenant_ids: list[str], kb_ids: list[str], prompt_config, MAX_SEARCH_LIMIT: int = 6,
                    top_n: int = 5, similarity_threshold: float = 0.4, vector_similarity_weight: float = 0.3):
    BEGIN_SEARCH_QUERY = "<|begin_search_query|>"
    END_SEARCH_QUERY = "<|end_search_query|>"
    BEGIN_SEARCH_RESULT = "<|begin_search_result|>"
    END_SEARCH_RESULT = "<|end_search_result|>"

    def rm_query_tags(line):
        pattern = re.escape(BEGIN_SEARCH_QUERY) + r"(.*?)" + re.escape(END_SEARCH_QUERY)
        return re.sub(pattern, "", line)

    def rm_result_tags(line):
        pattern = re.escape(BEGIN_SEARCH_RESULT) + r"(.*?)" + re.escape(END_SEARCH_RESULT)
        return re.sub(pattern, "", line)

    reason_prompt = (
        "You are a reasoning assistant with the ability to perform dataset searches to help "
        "you answer the user's question accurately. You have special tools:\n\n"
        f"- To perform a search: write {BEGIN_SEARCH_QUERY} your query here {END_SEARCH_QUERY}.\n"
        f"Then, the system will search and analyze relevant content, then provide you with helpful information in the format {BEGIN_SEARCH_RESULT} ...search results... {END_SEARCH_RESULT}.\n\n"
        f"You can repeat the search process multiple times if necessary. The maximum number of search attempts is limited to {MAX_SEARCH_LIMIT}.\n\n"
        "Once you have all the information you need, continue your reasoning.\n\n"
        "-- Example 1 --\n"  ########################################
        "Question: \"Are both the directors of Jaws and Casino Royale from the same country?\"\n"
        "Assistant:\n"
        f"    {BEGIN_SEARCH_QUERY}Who is the director of Jaws?{END_SEARCH_QUERY}\n\n"
        "User:\n"
        f"    {BEGIN_SEARCH_RESULT}\nThe director of Jaws is Steven Spielberg...\n{END_SEARCH_RESULT}\n\n"
        "Continues reasoning with the new information.\n"
        "Assistant:\n"
        f"    {BEGIN_SEARCH_QUERY}Where is Steven Spielberg from?{END_SEARCH_QUERY}\n\n"
        "User:\n"
        f"    {BEGIN_SEARCH_RESULT}\nSteven Allan Spielberg is an American filmmaker...\n{END_SEARCH_RESULT}\n\n"
        "Continues reasoning with the new information...\n\n"
        "Assistant:\n"
        f"    {BEGIN_SEARCH_QUERY}Who is the director of Casino Royale?{END_SEARCH_QUERY}\n\n"
        "User:\n"
        f"    {BEGIN_SEARCH_RESULT}\nCasino Royale is a 2006 spy film directed by Martin Campbell...\n{END_SEARCH_RESULT}\n\n"
        "Continues reasoning with the new information...\n\n"
        "Assistant:\n"
        f"    {BEGIN_SEARCH_QUERY}Where is Martin Campbell from?{END_SEARCH_QUERY}\n\n"
        "User:\n"
        f"    {BEGIN_SEARCH_RESULT}\nMartin Campbell (born 24 October 1943) is a New Zealand film and television director...\n{END_SEARCH_RESULT}\n\n"
        "Continues reasoning with the new information...\n\n"
        "Assistant:\nIt's enough to answer the question\n"

        "-- Example 2 --\n"  #########################################
        "Question: \"When was the founder of craigslist born?\"\n"
        "Assistant:\n"
        f"    {BEGIN_SEARCH_QUERY}Who was the founder of craigslist?{END_SEARCH_QUERY}\n\n"
        "User:\n"
        f"    {BEGIN_SEARCH_RESULT}\nCraigslist was founded by Craig Newmark...\n{END_SEARCH_RESULT}\n\n"
        "Continues reasoning with the new information.\n"
        "Assistant:\n"
        f"    {BEGIN_SEARCH_QUERY} When was Craig Newmark born?{END_SEARCH_QUERY}\n\n"
        "User:\n"
        f"    {BEGIN_SEARCH_RESULT}\nCraig Newmark was born on December 6, 1952...\n{END_SEARCH_RESULT}\n\n"
        "Continues reasoning with the new information...\n\n"
        "Assistant:\nIt's enough to answer the question\n"
        "**Remember**:\n"
        f"- You have a dataset to search, so you just provide a proper search query.\n"
        f"- Use {BEGIN_SEARCH_QUERY} to request a dataset search and end with {END_SEARCH_QUERY}.\n"
        "- The language of query MUST be as the same as 'Question' or 'search result'.\n"
        "- When done searching, continue your reasoning.\n\n"
        'Please answer the following question. You should think step by step to solve it.\n\n'
    )

    relevant_extraction_prompt = """**Task Instruction:**

    You are tasked with reading and analyzing web pages based on the following inputs: **Previous Reasoning Steps**, **Current Search Query**, and **Searched Web Pages**. Your objective is to extract relevant and helpful information for **Current Search Query** from the **Searched Web Pages** and seamlessly integrate this information into the **Previous Reasoning Steps** to continue reasoning for the original question.

    **Guidelines:**

    1. **Analyze the Searched Web Pages:**
    - Carefully review the content of each searched web page.
    - Identify factual information that is relevant to the **Current Search Query** and can aid in the reasoning process for the original question.

    2. **Extract Relevant Information:**
    - Select the information from the Searched Web Pages that directly contributes to advancing the **Previous Reasoning Steps**.
    - Ensure that the extracted information is accurate and relevant.

    3. **Output Format:**
    - **If the web pages provide helpful information for current search query:** Present the information beginning with `**Final Information**` as shown below.
    - The language of query **MUST BE** as the same as 'Search Query' or 'Web Pages'.\n"
    **Final Information**

    [Helpful information]

    - **If the web pages do not provide any helpful information for current search query:** Output the following text.

    **Final Information**

    No helpful information found.

    **Inputs:**
    - **Previous Reasoning Steps:**  
    {prev_reasoning}

    - **Current Search Query:**  
    {search_query}

    - **Searched Web Pages:**  
    {document}

    """

    executed_search_queries = []
    msg_hisotry = [{"role": "user", "content": f'Question:\"{question}\"\n'}]
    all_reasoning_steps = []
    think = "<think>"
    for ii in range(MAX_SEARCH_LIMIT + 1):
        if ii == MAX_SEARCH_LIMIT - 1:
            summary_think = f"\n{BEGIN_SEARCH_RESULT}\nThe maximum search limit is exceeded. You are not allowed to search.\n{END_SEARCH_RESULT}\n"
            yield {"answer": think + summary_think + "</think>", "reference": {}, "audio_binary": None}
            all_reasoning_steps.append(summary_think)
            msg_hisotry.append({"role": "assistant", "content": summary_think})
            break

        query_think = ""
        if msg_hisotry[-1]["role"] != "user":
            msg_hisotry.append({"role": "user", "content": "Continues reasoning with the new information.\n"})
        else:
            msg_hisotry[-1]["content"] += "\n\nContinues reasoning with the new information.\n"
        async for ans in chat_mdl.chat_streamly(reason_prompt, msg_hisotry, {"temperature": 0.7}):
            ans = re.sub(r"<think>.*</think>", "", ans, flags=re.DOTALL)
            if not ans:
                continue
            query_think = ans
            yield {"answer": think + rm_query_tags(query_think) + "</think>", "reference": {}, "audio_binary": None}

        think += rm_query_tags(query_think)
        all_reasoning_steps.append(query_think)
        queries = extract_between(query_think, BEGIN_SEARCH_QUERY, END_SEARCH_QUERY)
        if not queries:
            if ii > 0:
                break
            queries = [question]

        for search_query in queries:
            logging.info(f"[THINK]Query: {ii}. {search_query}")
            msg_hisotry.append({"role": "assistant", "content": search_query})
            think += f"\n\n> {ii + 1}. {search_query}\n\n"
            yield {"answer": think + "</think>", "reference": {}, "audio_binary": None}

            summary_think = ""
            # The search query has been searched in previous steps.
            if search_query in executed_search_queries:
                summary_think = f"\n{BEGIN_SEARCH_RESULT}\nYou have searched this query. Please refer to previous results.\n{END_SEARCH_RESULT}\n"
                yield {"answer": think + summary_think + "</think>", "reference": {}, "audio_binary": None}
                all_reasoning_steps.append(summary_think)
                msg_hisotry.append({"role": "user", "content": summary_think})
                think += summary_think
                continue

            truncated_prev_reasoning = ""
            for i, step in enumerate(all_reasoning_steps):
                truncated_prev_reasoning += f"Step {i + 1}: {step}\n\n"

            prev_steps = truncated_prev_reasoning.split('\n\n')
            if len(prev_steps) <= 5:
                truncated_prev_reasoning = '\n\n'.join(prev_steps)
            else:
                truncated_prev_reasoning = ''
                for i, step in enumerate(prev_steps):
                    if i == 0 or i >= len(prev_steps) - 4 or BEGIN_SEARCH_QUERY in step or BEGIN_SEARCH_RESULT in step:
                        truncated_prev_reasoning += step + '\n\n'
                    else:
                        if truncated_prev_reasoning[-len('\n\n...\n\n'):] != '\n\n...\n\n':
                            truncated_prev_reasoning += '...\n\n'
            truncated_prev_reasoning = truncated_prev_reasoning.strip('\n')

            # Retrieval procedure:
            # 1. KB search
            # 2. Web search (optional)
            # 3. KG search (optional)
            kbinfos = await settings.retrievaler.retrieval(search_query, embd_mdl, tenant_ids, kb_ids, 1, top_n,
                                                           similarity_threshold,
                                                           vector_similarity_weight
                                                           )
            if prompt_config.get("tavily_api_key", "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"):
                tav = Tavily(prompt_config["tavily_api_key"])
                tav_res = tav.retrieve_chunks(" ".join(search_query))
                kbinfos["chunks"].extend(tav_res["chunks"])
                kbinfos["doc_aggs"].extend(tav_res["doc_aggs"])

            # Merge chunk info for citations
            if not chunk_info["chunks"]:
                for k in chunk_info.keys():
                    chunk_info[k] = kbinfos[k]
            else:
                cids = [c["chunk_id"] for c in chunk_info["chunks"]]
                for c in kbinfos["chunks"]:
                    if c["chunk_id"] in cids:
                        continue
                    chunk_info["chunks"].append(c)
                dids = [d["doc_id"] for d in chunk_info["doc_aggs"]]
                for d in kbinfos["doc_aggs"]:
                    if d["doc_id"] in dids:
                        continue
                    chunk_info["doc_aggs"].append(d)

            think += "\n\n"
            async for ans in chat_mdl.chat_streamly(
                    relevant_extraction_prompt.format(
                        prev_reasoning=truncated_prev_reasoning,
                        search_query=search_query,
                        document="\n".join(await kb_prompt(kbinfos, 4096))
                    ),
                    [{"role": "user",
                      "content": f'Now you should analyze each web page and find helpful information based on the current search query "{search_query}" and previous reasoning steps.'}],
                    {"temperature": 0.7}):
                ans = re.sub(r"<think>.*</think>", "", ans, flags=re.DOTALL)
                if not ans:
                    continue
                summary_think = ans
                yield {"answer": think + rm_result_tags(summary_think) + "</think>", "reference": {},
                       "audio_binary": None}

            all_reasoning_steps.append(summary_think)
            msg_hisotry.append(
                {"role": "user", "content": f"\n\n{BEGIN_SEARCH_RESULT}{summary_think}{END_SEARCH_RESULT}\n\n"})
            think += rm_result_tags(summary_think)
            logging.info(f"[THINK]Summary: {ii}. {summary_think}")

    yield think + "</think>"
