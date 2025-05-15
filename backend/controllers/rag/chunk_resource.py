import json
from fastapi import APIRouter, Depends
from fastapi_utils.cbv import cbv
from extensions.ext_login import login_manager
from libs.base_error import BusinessError
from rag.nlp import search
from rag.utils import rmSpace
from services import settings
from services.account_service import TenantService
from services.dialog_service import keyword_extraction, label_question
from services.knowledgebase_service import KnowledgebaseService
from services.llm_service import LLMBundle
from models import Account, LLMType, transactional
from services.document_service import DocumentService
import re
from services.service_error_code import ServiceErrorCode
from pydantic import BaseModel
from typing import List, Optional

chunk_rt = APIRouter(prefix="/rag")


class ChunkIds(BaseModel):
    chunk_ids: List[str]
    doc_id: Optional[str] = None
    available_int: Optional[int] = None


class RetrievalModel(BaseModel):
    page: int
    page_size: int
    kb_ids: List[str]
    doc_ids: List[str]
    top_k: int = 1024
    highlight: bool = False
    similarity_threshold: float = 0.0
    vector_similarity_weight: float = 0.3
    question: str
    rerank_id: Optional[str] = None
    keyword: Optional[str] = None


@cbv(chunk_rt)
class ChunkRoute:
    @chunk_rt.delete("/chunk")
    @transactional
    async def delete(self, data: ChunkIds, current_user=Depends(login_manager)):
        account = current_user
        tenant_id = account.current_tenant_id
        doc = await DocumentService.get_by_id(data.doc_id)
        if not doc:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Document not found!")

        settings.docStoreConn.delete({"id": data.chunk_ids}, search.index_name(tenant_id), doc.kb_id)

        await DocumentService.decrement_chunk_num(doc.id, doc.kb_id, 1, len(data.chunk_ids), 0)
        return {"result": "success"}

    @chunk_rt.put("/chunk")
    @transactional
    async def put(self, data: ChunkIds, current_user=Depends(login_manager)):
        account = current_user
        tenant_id = account.current_tenant_id
        doc = await DocumentService.get_by_id(data.doc_id)
        if not doc:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Document not found!")
        for cid in data.chunk_ids:
            settings.docStoreConn.update({"id": cid},
                                         {"available_int": int(data.available_int)},
                                         search.index_name(await DocumentService.get_tenant_id(data.doc_id)),
                                         doc.kb_id)
        return {"result": "success"}

    @chunk_rt.get("/chunk")
    async def list_chunks(self, doc_id: str, keywords: str = "", available_int: int = -1, page: int = 1,
                          page_size: int = 30, current_user=Depends(login_manager)):
        account = current_user
        tenant_id = account.current_tenant_id

        if not doc_id:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Invalid doc_id")

        tenant_id = await DocumentService.get_tenant_id(doc_id)
        if not tenant_id:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Tenant not found!")

        doc = await DocumentService.get_by_id(doc_id)
        if not doc:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Document not found!")

        kb_ids = await KnowledgebaseService.find_kb_ids(tenant_id)
        query = {
            "doc_ids": [doc_id], "page": page, "size": page_size, "question": keywords, "sort": True
        }
        if available_int != -1:
            query["available_int"] = available_int

        try:
            sres = await settings.retrievaler.search(query, search.index_name(tenant_id), kb_ids, highlight=True)
        except Exception as ex:
            return {}

        res = {"total": sres.total, "chunks": [], "doc": doc.to_dict()}
        for id in sres.ids:
            sres_field = sres.field[id]
            d = {
                "idx": int(sres_field.get("idx", 0)),
                "mixed": sres_field.get("mixed", []),
                "id": id,
                "content_with_weight": rmSpace(sres.highlight[id]) if keywords and id in sres.highlight else
                sres_field.get("content_with_weight", ""),
                "doc_id": sres_field["doc_id"],
                "docnm_kwd": sres_field["docnm_kwd"],
                "important_kwd": sres_field.get("important_kwd", []),
                "question_kwd": sres_field.get("question_kwd", []),
                "image_id": sres_field.get("img_id", ""),
                "available_int": int(sres_field.get("available_int", 1)),
                "positions": sres_field.get("position_int", []),
            }
            assert isinstance(d["positions"], list)
            assert len(d["positions"]) == 0 or (isinstance(d["positions"][0], list) and len(d["positions"][0]) == 5)
            res["chunks"].append(d)
        return res

    @chunk_rt.get("/chunk/{doc_id}/{chunk_id}")
    async def get_chunk_info(self, doc_id: str, chunk_id: str, current_user=Depends(login_manager)):
        doc = await DocumentService.get_by_id(doc_id)
        if not doc:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Document not found!")

        chunk = settings.docStoreConn.get(chunk_id, search.index_name(await DocumentService.get_tenant_id(doc_id)),
                                          doc.kb_id)
        if chunk is None:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Chunk not found")

        k = []
        for n in chunk.keys():
            if re.search(r"(_vec$|_sm_|_tks|_ltks)", n):
                k.append(n)
        for n in k:
            del chunk[n]

        return chunk

    @chunk_rt.post("/chunk/retrieval-test")
    async def post(self, data: RetrievalModel, current_user=Depends(login_manager)):
        account = current_user
        tenant_ids = []

        tenants = await TenantService.get_join_tenants(account)
        for kb_id in data.kb_ids:
            for tenant in tenants:
                if await KnowledgebaseService.query(tenant_id=tenant.id, id=kb_id):
                    tenant_ids.append(tenant.id)
                    break
            else:
                raise BusinessError(error_code=ServiceErrorCode.NO_AUTHORIZATION,
                                    description='Only owner of knowledgebase authorized for this operation.')

        kb = await KnowledgebaseService.get_by_id(data.kb_ids[0])
        if not kb:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Knowledgebase not found!")

        embd_mdl = await LLMBundle.create(kb.tenant_id, LLMType.EMBEDDING.value, llm_name=kb.embd_id)

        rerank_mdl = None
        if data.rerank_id:
            rerank_mdl = await LLMBundle.create(kb.tenant_id, LLMType.RERANK.value, llm_name=data.rerank_id)

        question = data.question
        if data.keyword:
            chat_mdl = await LLMBundle.create(kb.tenant_id, LLMType.CHAT)
            question += await keyword_extraction(chat_mdl, question)

        labels = await label_question(question, [kb])
        ranks = await settings.retrievaler.retrieval_paging(question, embd_mdl, tenant_ids, data.kb_ids, data.page,
                                                            data.page_size,
                                                            data.similarity_threshold, data.vector_similarity_weight,
                                                            data.top_k,
                                                            data.doc_ids, rerank_mdl=rerank_mdl,
                                                            highlight=data.highlight,
                                                            rank_feature=labels)

        for c in ranks["chunks"]:
            c.pop("vector", None)
        ranks["labels"] = labels

        return ranks

    @chunk_rt.get("/chunk/knowledge-graph/{doc_id}")
    async def get_knowledge_graph(self, doc_id: str, current_user=Depends(login_manager)):
        tenant_id = await DocumentService.get_tenant_id(doc_id)
        kb_ids = await KnowledgebaseService.find_kb_ids(tenant_id)
        req = {
            "doc_ids": [doc_id],
            "knowledge_graph_kwd": ["graph", "mind_map"]
        }
        sres = await settings.retrievaler.search(req, search.index_name(tenant_id), kb_ids)
        obj = {"graph": {}, "mind_map": {}}
        for id in sres.ids[:2]:
            sres_field = sres.field[id]
            ty = sres_field["knowledge_graph_kwd"]
            try:
                content_json = json.loads(sres_field["content_with_weight"])
            except Exception:
                continue

            if ty == 'mind_map':
                node_dict = {}

                def repeat_deal(content_json, node_dict):
                    if 'id' in content_json:
                        if content_json['id'] in node_dict:
                            node_name = content_json['id']
                            content_json['id'] += f"({node_dict[content_json['id']]})"
                            node_dict[node_name] += 1
                        else:
                            node_dict[content_json['id']] = 1
                    if 'children' in content_json and content_json['children']:
                        for item in content_json['children']:
                            repeat_deal(item, node_dict)

                repeat_deal(content_json, node_dict)

            obj[ty] = content_json

        return obj
