import json
from typing import List

from fastapi import APIRouter, Depends
from fastapi_utils.cbv import cbv
from pydantic import BaseModel

from extensions.ext_login import login_manager
from libs.base_error import BusinessError
import os
from services.account_service import TenantService
from services.document_service import DocumentService, File2DocumentService
from services.dialog_service import DialogService
from services.file_service import FileService
from services.service_error_code import ServiceErrorCode
from services.task_service import TaskService
from services.utils import duplicate_name, get_uuid
from services.constants import DATASET_NAME_LIMIT
from services.knowledgebase_service import KnowledgebaseService
from models import StatusEnum, Account, File, FileSource, transactional, Task
from services import settings
from rag.settings import PAGERANK_FLD
from rag.nlp import search

kb_rt = APIRouter(prefix="/rag")


class KBCreateModel(BaseModel):
    name: str
    language: str


class KBTagsModel(BaseModel):
    tags: List[str]


class KBRenameModel(BaseModel):
    from_tag: str
    to_tag: str


class KBUpdateModel(BaseModel):
    parser_id: str = 'native'
    description: str = None
    avatar: str = None
    language: str = None
    permission: str = 'team'
    name: str = None
    parser_config: dict = None
    pagerank: int = 0


@cbv(kb_rt)
class KBRoute:
    @kb_rt.post("/kb")
    @transactional
    async def post(self, data: KBCreateModel, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        tenant = await TenantService.get_by_id(tenant_id)
        if not tenant:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Tenant not found!")

        language = data.language
        if language != "Chinese" and language != "English":
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR,
                                description="language must be either Chinese or English")

        dataset_name = data.name
        if dataset_name == "" or len(dataset_name) >= DATASET_NAME_LIMIT:
            raise BusinessError(error_code=ServiceErrorCode.INVALID_NAME)

        dataset_name = dataset_name.strip()
        dataset_name = await duplicate_name(
            KnowledgebaseService.query,
            name=dataset_name,
            created_by=current_user.id,
            status=StatusEnum.VALID.value)

        kb = await KnowledgebaseService.create(dataset_name, current_user.id, current_user.current_tenant_id,
                                               current_user.current_tenant.embd_id, language,
                                               make_parser_config(language))
        dia_req = {
            "id": get_uuid(),
            "name": kb.id,
            "language": language,
            "kb_ids": [kb.id],
        }
        dialog = DialogService.make_dialog(dia_req, tenant)
        await DialogService.save_or_update_entity(dialog)
        kb_dict = kb.to_dict()
        kb_dict["dialogs"] = [dialog]
        return {"result": "success", "data": kb_dict}

    @kb_rt.get("/kb")
    @transactional
    async def get(self, keywords: str = "", page: int = 1, page_size: int = 15, parser_id: str = "",
                  orderby: str = "created_at", desc: bool = True, current_user=Depends(login_manager)):
        joined_tenant_ids = [t.id for t in await TenantService.get_join_tenants(current_user)]
        data, count = await KnowledgebaseService.find_by_tenant_ids(
            tenant_ids=joined_tenant_ids,
            account_id=current_user.id,
            page_number=page,
            items_per_page=page_size,
            orderby=orderby,
            desc=desc,
            keywords=keywords,
            parser_id=parser_id
        )
        return {"result": "success", "data": data, "count": count}

    @kb_rt.get("/kb/{kb_id}")
    async def get_kb_info(self, kb_id: str, current_user=Depends(login_manager)):
        if not await KnowledgebaseService.query(created_by=current_user.id, id=kb_id):
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND)

        kb = await KnowledgebaseService.get_kb_by_id(kb_id, current_user.id)
        kb_dict = kb.to_dict()
        dialogs = await DialogService.find_by_name(kb_id)
        kb_dict["dialogs"] = dialogs
        return kb_dict

    @kb_rt.put("/kb/{kb_id}")
    @transactional
    async def put_kb_info(self, kb_id: str, data: KBUpdateModel, current_user=Depends(login_manager)):
        if not await KnowledgebaseService.query(created_by=current_user.id, id=kb_id):
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND)

        if data.parser_id == "tag" and os.environ.get('DOC_ENGINE', "elasticsearch") == "infinity":
            raise BusinessError(error_code=ServiceErrorCode.NOT_SUPPORT)

        kb = await KnowledgebaseService.get_kb_by_id(kb_id, current_user.id)
        new_name = data.name
        old_name = kb.name
        if new_name and new_name.lower() != old_name.lower():
            count = len(await KnowledgebaseService.query(name=new_name, tenant_id=current_user.current_tenant_id,
                                                         status=StatusEnum.VALID.value))
            if count > 0:
                raise BusinessError(error_code=ServiceErrorCode.INVALID_NAME)
            else:
                await DialogService.rename(old_name, new_name)

        language = data.language
        if language is not None:
            if language != "Chinese" and language != "English":
                raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR,
                                    description="language must be either Chinese or English")
            data.parser_config = make_parser_config(language)

        await KnowledgebaseService.update_by_id(kb_id, data.model_dump(exclude_none=True))

        if kb.pagerank != data.pagerank:
            if data.pagerank > 0:
                settings.docStoreConn.update({"kb_id": kb.id}, {PAGERANK_FLD: data.pagerank},
                                             search.index_name(kb.tenant_id), kb.id)
            else:
                # Elasticsearch requires PAGERANK_FLD be non-zero!
                settings.docStoreConn.update({"exists": PAGERANK_FLD}, {"remove": PAGERANK_FLD},
                                             search.index_name(kb.tenant_id), kb.id)

        kb = await KnowledgebaseService.get_kb_by_id(kb_id, current_user.id)
        return kb

    @kb_rt.delete("/kb/{kb_id}")
    @transactional
    async def delete_kb_info(self, kb_id: str, current_user=Depends(login_manager)):
        if not await KnowledgebaseService.query(created_by=current_user.id, id=kb_id):
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND)

        kb = await KnowledgebaseService.get_by_id(kb_id)
        for doc in await DocumentService.query(kb_id=kb_id):
            await TaskService.filter_delete([Task.doc_id == doc.id])
            await DocumentService.remove_document(doc, kb.tenant_id)
            f2ds = await File2DocumentService.find_by_document_id(doc.id)
            if f2ds:
                await FileService.filter_delete(
                    [File.source_type == FileSource.KNOWLEDGEBASE, File.id == f2ds[0].file_id])
            await File2DocumentService.delete_by_document_id(doc.id)

        await FileService.filter_delete(
            [File.source_type == FileSource.KNOWLEDGEBASE, File.type == "folder", File.name == kb.name])

        settings.docStoreConn.delete({"kb_id": kb_id}, search.index_name(kb.tenant_id), kb_id)
        settings.docStoreConn.deleteIdx(search.index_name(kb.tenant_id), kb_id)

        await DialogService.delete_by_name(kb_id)
        await KnowledgebaseService.delete_by_id(kb_id)
        return {"result": "success"}

    @kb_rt.get("/kb/{kb_id}/tags")
    async def get_kb_tags(self, kb_id: str, current_user=Depends(login_manager)):
        if not await KnowledgebaseService.accessible(kb_id, current_user.id):
            raise BusinessError(error_code=ServiceErrorCode.NO_AUTHORIZATION)

        tags = settings.retrievaler.all_tags(current_user.current_tenant_id, [kb_id])
        return tags

    @kb_rt.delete("/kb/{kb_id}/tags")
    @transactional
    async def delete_kb_tags(self, kb_id: str, data: KBTagsModel, current_user=Depends(login_manager)):
        if not await KnowledgebaseService.accessible(kb_id, current_user.id):
            raise BusinessError(error_code=ServiceErrorCode.NO_AUTHORIZATION)

        kb = await KnowledgebaseService.get_by_id(kb_id)
        for t in data.tags:
            settings.docStoreConn.update({"tag_kwd": t, "kb_id": [kb_id]},
                                         {"remove": {"tag_kwd": t}},
                                         search.index_name(kb.tenant_id),
                                         kb_id)
        return {"result": "success"}

    @kb_rt.put("/kb/{kb_id}/tags")
    @transactional
    async def put_kb_tags(self, kb_id: str, data: KBRenameModel, current_user=Depends(login_manager)):
        if not await KnowledgebaseService.accessible(kb_id, current_user.id):
            raise BusinessError(error_code=ServiceErrorCode.NO_AUTHORIZATION)

        kb = await KnowledgebaseService.get_by_id(kb_id)
        settings.docStoreConn.update({"tag_kwd": data.from_tag, "kb_id": [kb_id]},
                                     {"remove": {"tag_kwd": data.from_tag.strip()},
                                      "add": {"tag_kwd": data.to_tag}},
                                     search.index_name(kb.tenant_id),
                                     kb_id)
        return {"result": "success"}

    @kb_rt.get("/kb/tags")
    async def get_all_kb_tags(self, kb_ids: str, current_user=Depends(login_manager)):
        kb_ids = kb_ids.split(",")
        tenant_id = current_user.current_tenant_id
        for kb_id in kb_ids:
            if not await KnowledgebaseService.accessible(kb_id, current_user.id):
                raise BusinessError(error_code=ServiceErrorCode.NO_AUTHORIZATION)

        tags = settings.retrievaler.all_tags(tenant_id, kb_ids)
        return tags

    @kb_rt.get("/kb/{kb_id}/knowledge-graph")
    async def get_kb_knowledge_graph(self, kb_id: str, current_user=Depends(login_manager)):
        if not await KnowledgebaseService.accessible(kb_id, current_user.id):
            raise BusinessError(error_code=ServiceErrorCode.NO_AUTHORIZATION)

        kb = await KnowledgebaseService.get_by_id(kb_id)
        req = {
            "kb_id": [kb_id],
            "knowledge_graph_kwd": ["graph"]
        }

        obj = {"graph": {}, "mind_map": {}}
        if not settings.docStoreConn.indexExist(search.index_name(kb.tenant_id), kb_id):
            return obj
        sres = await settings.retrievaler.search(req, search.index_name(kb.tenant_id), [kb_id])
        if not len(sres.ids):
            return obj

        for id in sres.ids[:1]:
            ty = sres.field[id]["knowledge_graph_kwd"]
            try:
                content_json = json.loads(sres.field[id]["content_with_weight"])
            except Exception:
                continue

            obj[ty] = content_json

        if "nodes" in obj["graph"]:
            obj["graph"]["nodes"] = sorted(obj["graph"]["nodes"], key=lambda x: x.get("pagerank", 0), reverse=True)[
                                    :256]
            if "edges" in obj["graph"]:
                node_id_set = {o["id"] for o in obj["graph"]["nodes"]}
                filtered_edges = [o for o in obj["graph"]["edges"] if
                                  o["source"] != o["target"] and o["source"] in node_id_set and o[
                                      "target"] in node_id_set]
                obj["graph"]["edges"] = sorted(filtered_edges, key=lambda x: x.get("weight", 0), reverse=True)[:128]
        return obj


def make_parser_config(language):
    prompt = """请总结以下内容并遵守要求：
        1. 如果原文出现章节标题（如第X(章|节|卷|编|部分)），格式为（以文中出现的章节标题格式为准）：第X(章|节|卷|编|部分)主要讲述了...
        2. 如果没有出现章节标题，直接总结核心内容，开头禁用章节表述
        3. 不要添加原文没有的信息，小心数字，不要编造
        待总结内容：
        {cluster_content}
        "请按上述要求生成总结""" if language == "Chinese" else """Please summarize with requirements:
        1. If the source text contains section headings (e.g., Chapter X), use the format: "Chapter X mainly discusses...
        2. If there are no chapters (e.g., Chapter X), summarize the core content directly and disable the chapter formulation at the beginning
        3. Don't add information that is not in the original text, be careful with numbers, don't make them up!
        Content to summarize:
        {cluster_content}
        The above is the content you need to summarize."""
    parser_config = {
        "pages": [[1, 1000000]],
        "auto_keywords": 0,
        "auto_questions": 0,
        "raptor": {
            "use_raptor": True,
            "prompt": prompt,
            "max_token": 256,
            "threshold": 0.1,
            "max_cluster": 64,
            "random_seed": 0
        },
        "graphrag": {
            "use_graphrag": False
        },
        "chunk_token_num": 128,
        "delimiter": "\\\\n!?;。；！？",
        "layout_recognize": "DeepDOC",
        "html4excel": False
    }
    return parser_config
