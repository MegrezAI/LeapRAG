from fastapi import APIRouter, Depends
from fastapi_utils.cbv import cbv

from extensions.ext_login import login_manager
from services.document_service import File2DocumentService
from services.knowledgebase_service import KnowledgebaseService
from services.utils import get_uuid

from models import FileType, transactional
from services.document_service import DocumentService
from services.file_service import FileService
from pydantic import BaseModel
from typing import List

from services.utils.file_utils import get_parser

f2d_rt = APIRouter(prefix="/rag")


class ConvertFile2Document(BaseModel):
    kb_ids: List[str]
    file_ids: List[str]


class DeleteFile2Document(BaseModel):
    file_ids: List[str]


@cbv(f2d_rt)
class F2DRoute:
    @f2d_rt.post("/f2d")
    @transactional
    async def post(self, data: ConvertFile2Document, current_user=Depends(login_manager)):
        account = current_user
        tenant_id = account.current_tenant_id
        account_id = account.id
        kb_ids = data.kb_ids
        file_ids = data.file_ids
        file2documents = []

        for file_id in file_ids:
            file = await FileService.get_by_id(file_id)
            file_ids_list = [file_id]
            if file.type == FileType.FOLDER.value:
                file_ids_list = await FileService.get_all_innermost_file_ids(file_id, [])
            for fid in file_ids_list:
                informs = await File2DocumentService.find_by_file_id(fid)
                # delete
                for inform in informs:
                    doc_id = inform.document_id
                    doc = await DocumentService.get_by_id(doc_id)
                    if not doc:
                        continue
                    tenant_id = await DocumentService.get_tenant_id(doc_id)
                    if not tenant_id:
                        continue
                    await DocumentService.remove_document(doc, tenant_id)

                await File2DocumentService.delete_by_file_id(fid)

                # insert
                for kb_id in kb_ids:
                    kb = await KnowledgebaseService.get_by_id(kb_id)
                    if not kb:
                        continue
                    file = await FileService.get_by_id(fid)
                    if not file:
                        continue
                    doc_id = get_uuid()
                    await DocumentService.insert_document(kb.id, {
                        "id": get_uuid(),
                        "kb_id": kb.id,
                        "parser_id": get_parser(file.type, file.name, kb.parser_id),
                        "parser_config": kb.parser_config,
                        "created_by": account_id,
                        "type": file.type,
                        "name": file.name,
                        "location": file.location,
                        "size": file.size
                    })
                    file2document = await File2DocumentService.insert({
                        "id": get_uuid(),
                        "file_id": fid,
                        "document_id": doc_id,
                    })
                    file2documents.append(file2document.to_dict())
        return {"result": "success", "data": file2documents}

    @f2d_rt.delete("/f2d")
    @transactional
    async def delete(self, data: DeleteFile2Document, current_user=Depends(login_manager)):
        account = current_user
        tenant_id = account.current_tenant_id
        file_ids = data.file_ids
        delete_count = 0
        for file_id in file_ids:
            informs = await File2DocumentService.find_by_file_id(file_id)
            if not informs:
                continue

            for inform in informs:
                await File2DocumentService.delete_by_file_id(file_id)
                doc_id = inform.document_id
                doc = await DocumentService.get_by_id(doc_id)
                if not doc:
                    continue
                tenant_id = await DocumentService.get_tenant_id(doc_id)
                if not tenant_id:
                    continue
                await DocumentService.remove_document(doc, tenant_id)
                delete_count = delete_count + 1
        return {"result": "success", "delete_count": delete_count}
