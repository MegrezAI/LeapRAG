import json
import os
import pathlib
import re
from typing import List

from fastapi import APIRouter, Depends, UploadFile, Form
from fastapi_utils.cbv import cbv
from pydantic import BaseModel
from starlette.responses import Response

from extensions.ext_login import login_manager
from services import settings
from rag.nlp import search
from models.knowledgebase import ParserType, Task, File
from services.account_service import TenantService
from services.constants import IMG_BASE64_PREFIX
from services.document_service import File2DocumentService
from services.knowledgebase_service import KnowledgebaseService
from services.service_error_code import ServiceErrorCode
from services.task_service import TaskService, queue_tasks
from services.utils import duplicate_name, get_uuid
from libs.base_error import BusinessError
from models import Account, FileType, transactional, FileSource, TaskStatus
from services.document_service import DocumentService
from services.file_service import FileService
from services.utils.file_utils import filename_type, thumbnail
from extensions.ext_storage import storage as STORAGE_IMPL
from services.utils.web_utils import is_valid_url, html2pdf

document_rt = APIRouter(prefix="/rag")


class CreateDocument(BaseModel):
    kb_id: str


class DocumentIds(BaseModel):
    doc_ids: List[str]
    run: str = None
    stop: bool = None


class DocumentUpdate(BaseModel):
    status: str = None
    meta: str = None
    parser_id: str = None
    name: str = None


class CrawlDocument(BaseModel):
    kb_id: str
    name: str
    url: str


@cbv(document_rt)
class DocRoute:
    @document_rt.delete("/document")
    @transactional
    async def delete(self, data: DocumentIds, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        delete_count = 0
        for doc_id in data.doc_ids:
            count = await delete_doc(doc_id, tenant_id, current_user.id)
            delete_count = delete_count + count

        return {"result": "success", "count": delete_count}

    @document_rt.put("/document")
    @transactional
    async def upload_documents(self, file: List[UploadFile], kb_id: str = Form(), parser_id: str = Form(default=""),
                               current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        account_id = current_user.id
        tenant = await TenantService.get_by_id(tenant_id)
        if not tenant:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Tenant not found!")

        parser_id = parser_id if parser_id else ParserType.NAIVE
        if not kb_id:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR,
                                description="Need kb_id when upload document")

        for file_obj in file:
            if file_obj.filename == '':
                raise BusinessError(error_code=ServiceErrorCode.FILE_NOT_FOUND, description="No file name")

        kb = await KnowledgebaseService.get_by_id(kb_id)
        if not kb:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Knowledge base not found")

        err, _, infos = await FileService.upload_document(kb, file, tenant_id, account_id)
        for doc in infos:
            if parser_id == 'general':
                auto_parser_id = await DocumentService.run_document_classifier(doc, kb, tenant)
                if auto_parser_id:
                    doc.parser_id = auto_parser_id
                    await DocumentService.save_or_update_entity(doc)
            else:
                if doc.type == FileType.VISUAL and parser_id != ParserType.PICTURE:
                    raise BusinessError(error_code=ServiceErrorCode.NOT_SUPPORT, description="Not supported yet!")
                doc.parser_id = parser_id
                await DocumentService.save_or_update_entity(doc)
        return {"result": "success", "data": infos, "err": err}

    @document_rt.post("/document")
    @transactional
    async def create_document(self, data: CreateDocument, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        account_id = current_user.id

        kb_id = data.kb_id
        if not kb_id:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Need kb_id")

        kb = await KnowledgebaseService.get_by_id(kb_id)
        if not kb:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Knowledgebase not found")

        if await DocumentService.query(name=data.name, kb_id=kb_id):
            raise BusinessError(error_code=ServiceErrorCode.INVALID_NAME,
                                description="Duplicated document name in the same knowledgebase.")

        doc = await DocumentService.insert_document(kb.id, {
            "id": get_uuid(),
            "kb_id": kb.id,
            "parser_id": kb.parser_id,
            "parser_config": kb.parser_config,
            "created_by": account_id,
            "type": FileType.VIRTUAL,
            "name": data.name,
            "location": "",
            "size": 0
        })
        return {"result": "success", "data": doc}

    @document_rt.get("/document")
    @transactional
    async def list_documents(self, kb_id: str, keywords: str = "", doc_ids: str = "", page: int = 1,
                             page_size: int = 15, orderby: str = "created_at", desc: bool = True,
                             current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        account_id = current_user.id

        if not kb_id:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Need kb_id")

        docs, total = await DocumentService.find_by_kb_id(kb_id, account_id, page, page_size, orderby, desc,
                                                          keywords, doc_ids.split(","))
        for doc_item in docs:
            if doc_item['thumbnail'] and not doc_item['thumbnail'].startswith(IMG_BASE64_PREFIX):
                doc_item['thumbnail'] = f"/rag/document/image/{kb_id}/{doc_item['thumbnail']}"

        return {"count": total, "data": docs}

    @document_rt.get("/document/thumbnails")
    async def get_thumbnails(self, doc_ids: str = "", current_user=Depends(login_manager)):
        doc_id_list = doc_ids.split(",")
        if len(doc_id_list) > 0 and doc_id_list[0] != '':
            docs = await DocumentService.get_thumbnails(doc_id_list)
            for doc_item in docs:
                if doc_item['thumbnail'] and not doc_item['thumbnail'].startswith(IMG_BASE64_PREFIX):
                    doc_item['thumbnail'] = f"/rag/document/image/{doc_item['kb_id']}/{doc_item['thumbnail']}"
            return {d["id"]: d["thumbnail"] for d in docs}
        else:
            return {}

    @document_rt.get("/document/image/{bucket}/{name}")
    async def get_image(self, bucket: str, name: str):
        file_content = STORAGE_IMPL.load(bucket + "/" + name)
        return Response(content=file_content, media_type="image/JPEG")

    @document_rt.post("/document/run")
    @transactional
    async def run_docs(self, data: DocumentIds, current_user=Depends(login_manager)):
        doc_ids = data.doc_ids
        run = data.run
        count = 0
        for doc_id in doc_ids:
            info = {"run": run, "progress": 0}
            if run == TaskStatus.RUNNING.value and data.stop:
                info["progress_msg"] = ""
                info["chunk_num"] = 0
                info["token_num"] = 0
            await DocumentService.update_by_id(doc_id, info)

            tenant_id = await DocumentService.get_tenant_id(doc_id)
            if not tenant_id:
                raise BusinessError(ServiceErrorCode.NOT_FOUND, description="tenant_id not found")

            doc = await DocumentService.get_by_id(doc_id)
            if not doc:
                raise BusinessError(ServiceErrorCode.NOT_FOUND, description="doc not found")

            if data.stop:
                await TaskService.filter_delete([Task.doc_id == doc_id])
                if settings.docStoreConn.indexExist(search.index_name(tenant_id), doc.kb_id):
                    settings.docStoreConn.delete({"doc_id": doc_id}, search.index_name(tenant_id), doc.kb_id)

            if run == TaskStatus.RUNNING.value:
                doc_dict = doc.to_dict()
                doc_dict["tenant_id"] = tenant_id
                bucket, name = await File2DocumentService.get_storage_address(doc_id=doc_dict["id"])
                await queue_tasks(doc_dict, bucket, name)
            count = count + 1
        return {"result": "success", "count": count}

    @document_rt.post("/document/web-crawl")
    @transactional
    async def web_crawl(self, data: CrawlDocument, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        account_id = current_user.id

        kb_id = data.kb_id
        name = data.name
        url = data.url

        if not is_valid_url(url):
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description='The URL format is invalid')

        kb = await KnowledgebaseService.get_by_id(kb_id)
        if not kb:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Knowledgebase not found")

        blob = html2pdf(url)
        if not blob:
            raise BusinessError(error_code=ServiceErrorCode.DOWNLOAD_ERROR, description="download url error")

        pf_id = await FileService.get_root_folder_id(tenant_id, account_id)
        await FileService.init_knowledgebase_docs(pf_id, account_id)
        kb_root_folder = await FileService.get_kb_folder(account_id)
        kb_folder = await FileService.new_a_file_from_kb(kb.tenant_id, kb.name, kb_root_folder["id"])

        filename = await duplicate_name(
            DocumentService.query,
            name=name + ".pdf",
            kb_id=kb.id)
        filetype = filename_type(filename)
        if filetype == FileType.OTHER.value:
            raise RuntimeError("This type of file has not been supported yet!")

        location = filename
        while await STORAGE_IMPL.obj_exist(kb_id, location):
            location += "_"
        await STORAGE_IMPL.put(kb_id, location, blob)
        doc = {
            "id": get_uuid(),
            "kb_id": kb.id,
            "parser_id": kb.parser_id,
            "parser_config": kb.parser_config,
            "created_by": current_user.id,
            "type": filetype,
            "name": filename,
            "location": location,
            "size": len(blob),
            "thumbnail": thumbnail(filename, blob)
        }
        if doc["type"] == FileType.VISUAL:
            doc["parser_id"] = ParserType.PICTURE.value
        if doc["type"] == FileType.AURAL:
            doc["parser_id"] = ParserType.AUDIO.value
        if re.search(r"\.(eml)$", filename):
            doc["parser_id"] = ParserType.EMAIL.value
        await DocumentService.insert_document(kb.id, doc)
        doc = await FileService.add_file_from_kb(doc, kb_folder["id"], kb.tenant_id, account_id)
        return {"result": "success", "data": doc}

    @document_rt.post("/document/{doc_id}")
    @transactional
    async def check_parser_id(self, doc_id: str, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        doc = await DocumentService.get_by_id(doc_id)
        tenant = await TenantService.get_by_id(tenant_id)
        if not doc:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Document not found!")
        kb = await KnowledgebaseService.get_by_id(doc.kb_id)
        if not kb:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Can't find this knowledgebase!")
        parser_id = ""
        if doc.parser_id == ParserType.NAIVE:
            parser_id = await DocumentService.run_document_classifier(doc, kb, tenant)
        return {"result": "success", "parser_id": parser_id}

    @document_rt.delete("/document/{doc_id}")
    @transactional
    async def delete_single(self, doc_id: str, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        count = await delete_doc(doc_id, tenant_id, current_user.id)
        return {"result": "success", "count": count}

    @document_rt.put("/document/{doc_id}")
    @transactional
    async def put_single(self, doc_id: str, data: DocumentUpdate, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        account_id = current_user.id

        doc = await DocumentService.get_by_id(doc_id)
        if not doc:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Document not found!")

        kb = await KnowledgebaseService.get_by_id(doc.kb_id)
        if not kb:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Can't find this knowledgebase!")

        if not await DocumentService.accessible(doc_id, account_id):
            raise BusinessError(error_code=ServiceErrorCode.NO_AUTHORIZATION, description='No authorization.')

        status = data.status
        if status is not None:
            if status not in ["0", "1"]:
                raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR,
                                    description='status value should be "0" or "1"')

            await DocumentService.update_by_id(doc_id, {"status": status})
            settings.docStoreConn.update({"doc_id": doc_id}, {"available_int": int(status)},
                                         search.index_name(kb.tenant_id), doc.kb_id)

        name = data.name
        if name is not None:
            if pathlib.Path(name.lower()).suffix != pathlib.Path(doc.name.lower()).suffix:
                raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR,
                                    description="The extension of file can't be changed")

            for d in await DocumentService.query(name=name, kb_id=doc.kb_id):
                if d.name == name:
                    raise BusinessError(error_code=ServiceErrorCode.INVALID_NAME,
                                        description="Duplicated document name in the same knowledgebase.")

            await DocumentService.update_by_id(doc_id, {"name": name})

            informs = await File2DocumentService.find_by_document_id(doc_id)
            if informs:
                file = await FileService.get_by_id(informs[0].file_id)
                await FileService.update_by_id(file.id, {"name": name})

        parser_id = data.parser_id
        if parser_id is not None:
            if doc.parser_id.lower() == parser_id.lower():
                if "parser_config" in data:
                    if data.parser_config == doc.parser_config:
                        return {"result": "success"}
                else:
                    return {"result": "success"}

            if doc.type == FileType.VISUAL and parser_id != ParserType.PICTURE:
                raise BusinessError(error_code=ServiceErrorCode.NOT_SUPPORT, description="Not supported yet!")

            await DocumentService.update_by_id(doc.id,
                                               {"parser_id": parser_id, "progress": 0, "progress_msg": "",
                                                "run": TaskStatus.UNSTART.value})

            if "parser_config" in data:
                await DocumentService.update_parser_config(doc.id, data.parser_config)
            if doc.token_num > 0:
                await DocumentService.increment_chunk_num(doc.id, doc.kb_id, doc.token_num * -1, doc.chunk_num * -1,
                                                          doc.process_duation * -1)
                if settings.docStoreConn.indexExist(search.index_name(tenant_id), doc.kb_id):
                    settings.docStoreConn.delete({"doc_id": doc.id}, search.index_name(tenant_id), doc.kb_id)

        meta_str = data.meta
        if meta_str is not None:
            meta = json.loads(meta_str)
            if not isinstance(meta, dict):
                raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR,
                                    description='Meta data should be in Json map format, like {"key": "value"}')
            await DocumentService.update_by_id(doc_id, {"meta_fields": meta})

        return {"result": "success"}

    @document_rt.get("/document/{doc_id}")
    async def get_document_info(self, doc_id: str, current_user=Depends(login_manager)):
        doc = await DocumentService.get_by_id(doc_id)
        if not doc:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Document not found!")

        return doc

    @document_rt.get("/document/{doc_id}/download")
    async def get_document_file(self, doc_id: str, current_user=Depends(login_manager)):
        doc = await DocumentService.get_by_id(doc_id)
        if not doc:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Document not found!")

        b, n = await File2DocumentService.get_storage_address(doc_id=doc_id)
        file_content = STORAGE_IMPL.load(b + "/" + n)

        ext = re.search(r"\.([^.]+)$", doc.name)
        content_type = "application/octet-stream"
        if ext:
            if doc.type == FileType.VISUAL.value:
                content_type = f"image/{ext.group(1)}"
            else:
                content_type = f"application/{ext.group(1)}"

        return Response(content=file_content, media_type=content_type)


@transactional
async def delete_doc(doc_id: str, tenant_id: str, account_id: str):
    if not await DocumentService.accessible4deletion(doc_id, account_id):
        return 0

    pf_id = await FileService.get_root_folder_id(tenant_id, account_id)
    await FileService.init_knowledgebase_docs(pf_id, tenant_id, account_id)

    doc = await DocumentService.get_by_id(doc_id)
    if not doc:
        return 0

    b, n = await File2DocumentService.get_storage_address(doc_id=doc_id)
    STORAGE_IMPL.delete(b + "/" + n)

    await TaskService.filter_delete([Task.doc_id == doc_id])
    if not await DocumentService.remove_document(doc, tenant_id):
        return 0

    f2d = await File2DocumentService.find_by_document_id(doc_id)
    await FileService.filter_delete([File.source_type == FileSource.KNOWLEDGEBASE, File.id == f2d[0].file_id])
    await File2DocumentService.delete_by_document_id(doc_id)
    return 1
