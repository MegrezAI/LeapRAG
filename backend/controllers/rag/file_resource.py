import os
import pathlib
import re
from typing import List

from fastapi import APIRouter, Depends, UploadFile, Form
from fastapi_utils.cbv import cbv
from pydantic import BaseModel
from starlette.responses import Response

from extensions.ext_login import login_manager
from services.document_service import File2DocumentService
from services.utils import duplicate_name, get_uuid
from services.service_error_code import ServiceErrorCode
from libs.base_error import BusinessError
from models import FileType, transactional, FileSource
from services.document_service import DocumentService
from services.file_service import FileService
from services.utils.file_utils import filename_type
from extensions.ext_storage import storage as STORAGE_IMPL

file_rt = APIRouter(prefix="/rag")


class FileInfoModel(BaseModel):
    name: str


class FileDeleteModel(BaseModel):
    file_ids: List[str]


@cbv(file_rt)
class FileRoute:
    @file_rt.delete("/file")
    @transactional
    async def delete(self, data: FileDeleteModel, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        file_ids = data.file_ids
        delete_count = 0
        for file_id in file_ids:
            file = await FileService.get_by_id(file_id)
            if not file:
                continue
            if not file.tenant_id:
                continue
            if file.source_type == FileSource.KNOWLEDGEBASE:
                continue

            if file.type == FileType.FOLDER.value:
                file_id_list = await FileService.get_all_innermost_file_ids(file_id, [])
                for inner_file_id in file_id_list:
                    inner_file = await FileService.get_by_id(inner_file_id)
                    if inner_file:
                        STORAGE_IMPL.delete(inner_file.parent_id + "/" + inner_file.location)
                await FileService.delete_folder_by_pf_id(tenant_id, file_id)
            else:
                delete_count = delete_count + 1
                STORAGE_IMPL.delete(file.parent_id + "/" + file.location)
                await FileService.delete_by_id(file_id)

            # delete file2document
            informs = await File2DocumentService.find_by_file_id(file_id)
            for inform in informs:
                doc_id = inform.document_id
                doc = await DocumentService.get_by_id(doc_id)
                if not doc:
                    continue
                tenant_id = await DocumentService.get_tenant_id(doc_id)
                if not tenant_id:
                    continue
                if not await DocumentService.remove_document(doc, tenant_id):
                    continue
            await File2DocumentService.delete_by_file_id(file_id)

        return {"result": "success", "count": delete_count}

    @file_rt.put("/file")
    @transactional
    async def upload_files(self, file: List[UploadFile], parent_id: str = Form(default=""),
                           current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        account_id = current_user.id

        if not parent_id:
            parent_id = await FileService.get_root_folder_id(tenant_id, account_id)
        else:
            parent = await FileService.get_by_id(parent_id)
            if not parent:
                raise BusinessError(error_code=ServiceErrorCode.FOLDER_NOT_FOUND, description="Parent not found!")

        file_res = []
        for file_obj in file:
            if not file_obj.filename:
                raise BusinessError(error_code=ServiceErrorCode.FILE_NOT_FOUND, description="File name not found!")

            max_file_num_per_user = int(os.environ.get('MAX_FILE_NUM_PER_USER', 0))
            if 0 < max_file_num_per_user <= await DocumentService.get_doc_count(tenant_id):
                raise BusinessError(error_code=ServiceErrorCode.MAX_FILE_NUM_PER_USER,
                                    description="Exceed the maximum file number of a free user!")

            # split file name path
            full_path = '/' + file_obj.filename
            file_obj_names = full_path.split('/')
            file_len = len(file_obj_names)

            # get folder
            file_id_list = await FileService.get_id_list_by_id(parent_id, file_obj_names, 1, [parent_id])
            len_id_list = len(file_id_list)

            # create folder
            if file_len != len_id_list:
                folder = await FileService.get_by_id(file_id_list[len_id_list - 1])
                if not folder:
                    raise BusinessError(error_code=ServiceErrorCode.FOLDER_NOT_FOUND, description="Folder not found!")

                last_folder = await FileService.create_folder(folder, file_id_list[len_id_list - 1], file_obj_names,
                                                              len_id_list, tenant_id, account_id)
            else:
                folder = await FileService.get_by_id(file_id_list[len_id_list - 2])
                if not folder:
                    raise BusinessError(error_code=ServiceErrorCode.FOLDER_NOT_FOUND, description="Folder not found!")
                last_folder = await FileService.create_folder(folder, file_id_list[len_id_list - 2], file_obj_names,
                                                              len_id_list, tenant_id, account_id)

            # file type
            filetype = filename_type(file_obj_names[file_len - 1])
            location = file_obj_names[file_len - 1]
            while STORAGE_IMPL.exists(last_folder.id + "/" + location):
                location += "_"
            blob = await file_obj.read()
            filename = await duplicate_name(
                FileService.query,
                name=file_obj_names[file_len - 1],
                parent_id=last_folder.id)
            file_info = {
                "id": get_uuid(),
                "parent_id": last_folder.id,
                "tenant_id": tenant_id,
                "created_by": account_id,
                "type": filetype,
                "name": filename,
                "location": location,
                "size": len(blob),
            }
            result = await FileService.insert(**file_info)
            STORAGE_IMPL.save(last_folder.id + "/" + location, blob)
            file_res.append(result.to_dict())

        return file_res

    @file_rt.post("/file")
    @transactional
    async def create_file(self, data: FileInfoModel, current_user=Depends(login_manager)):
        account_id = current_user.id
        tenant_id = current_user.current_tenant_id

        pf_id = data.parent_id
        input_file_type = data.type

        if not pf_id:
            pf_id = await FileService.get_root_folder_id(tenant_id, account_id)

        if not await FileService.is_parent_folder_exist(pf_id):
            raise BusinessError(error_code=ServiceErrorCode.FOLDER_NOT_FOUND, description="Folder not found!")

        if await FileService.query(name=data.name, parent_id=pf_id):
            raise BusinessError(error_code=ServiceErrorCode.INVALID_NAME,
                                description="Duplicated file name in the same folder.")

        if input_file_type == FileType.FOLDER.value:
            file_type = FileType.FOLDER.value
        else:
            file_type = FileType.VIRTUAL.value

        file = {
            "id": get_uuid(),
            "parent_id": pf_id,
            "tenant_id": current_user.tenant_id,
            "created_by": account_id,
            "name": data.name,
            "location": "",
            "size": 0,
            "type": file_type
        }
        file = await FileService.insert(**file)
        return file.to_dict()

    @file_rt.get("/file")
    @transactional
    async def list_files(self, parent_id: str = None, keywords: str = "", page: int = 1, page_size: int = 15,
                         orderby: str = "created_at", desc: bool = True, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        account_id = current_user.id

        if not parent_id:
            parent_id = await FileService.get_root_folder_id(tenant_id, account_id)
            await FileService.init_knowledgebase_docs(parent_id, tenant_id, account_id)

        file = await FileService.get_by_id(parent_id)
        if not file:
            raise BusinessError(error_code=ServiceErrorCode.FOLDER_NOT_FOUND,
                                description=f"Folder not found!, parent_id={parent_id}")

        files, total = await FileService.find_by_pf_id(tenant_id, parent_id, page, page_size, orderby, desc, keywords)

        parent_folder = await FileService.get_parent_folder(parent_id)
        if not parent_folder:
            raise BusinessError(error_code=ServiceErrorCode.FILE_NOT_FOUND, description="File not found!")

        return {"count": total, "data": files, "parent_folder": parent_folder.to_dict()}

    @file_rt.put("/file/{file_id}")
    @transactional
    async def rename(self, file_id: str, data: FileInfoModel, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id

        file = await FileService.get_by_id(file_id)
        if not file:
            raise BusinessError(ServiceErrorCode.FILE_NOT_FOUND)
        if file.tenant_id != tenant_id:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION)

        if file.type != FileType.FOLDER.value and pathlib.Path(data.name.lower()).suffix != pathlib.Path(
                file.name.lower()).suffix:
            raise BusinessError(ServiceErrorCode.NOT_SUPPORT, description="The extension of file can't be changed")

        for sibling in await FileService.query(name=data.name, parent_id=file.parent_id):
            if sibling.name == data.name:
                raise BusinessError(ServiceErrorCode.INVALID_NAME,
                                    description="Duplicated file name in the same folder.")

        await FileService.update_by_id(file_id, {"name": data.name})

        informs = await File2DocumentService.find_by_file_id(file_id)
        if informs:
            await DocumentService.update_by_id(informs[0].document_id, {"name": data.name})

        return {"result": "success"}

    @file_rt.get("/file/{file_id}")
    async def get_file_info(self, file_id: str, current_user=Depends(login_manager)):

        file = await FileService.get_by_id(file_id)
        if not file:
            raise BusinessError(error_code=ServiceErrorCode.FILE_NOT_FOUND, description="File not found!")

        parent_folders = await FileService.find_all_parent_folders(file_id)
        parent_folders_res = []
        for parent_folder in parent_folders:
            parent_folders_res.append(parent_folder.to_dict())

        return {"file": file, "parents": parent_folders_res}

    @file_rt.get("/file/{file_id}/download")
    async def download(self, file_id: str, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id

        file = await FileService.get_by_id(file_id)
        if not file:
            raise BusinessError(ServiceErrorCode.FILE_NOT_FOUND)
        if file.tenant_id != tenant_id:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION)

        blob = STORAGE_IMPL.load(file.parent_id + "/" + file.location)
        if not blob:
            b, n = File2DocumentService.get_storage_address(file_id=file_id)
            blob = STORAGE_IMPL.load(b + "/" + n)

        media_type = 'application/octet-stream'
        if ext := re.search(r"\.([^.]+)$", file.name):
            if file.type == FileType.VISUAL.value:
                media_type = f'image/{ext.group(1)}'
            else:
                media_type = f'application/{ext.group(1)}'

        return Response(content=blob, media_type=media_type)
