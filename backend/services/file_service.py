import logging
import os
from concurrent.futures import ThreadPoolExecutor
import re
from sqlalchemy import func, select, delete

from models import FileType, KNOWLEDGEBASE_FOLDER_NAME, FileSource, transactional
from models import File2Document, Knowledgebase, File, Document
from models.knowledgebase import ParserType
from services.common_service import CommonService
from services.document_service import DocumentService
from services.document_service import File2DocumentService
from services.knowledgebase_service import KnowledgebaseService
from services.utils import get_uuid, duplicate_name
from services.utils.file_utils import filename_type, thumbnail_img, get_parser
from extensions.ext_storage import storage as STORAGE_IMPL
from models import get_current_session


class FileService(CommonService):
    model = File

    @classmethod
    async def find_by_pf_id(cls, tenant_id, pf_id, page_number, items_per_page,
                            orderby, desc, keywords):
        session = get_current_session()
        query = select(File).where(
            File.tenant_id == tenant_id,
            File.parent_id == pf_id,
            File.id != pf_id
        )

        if keywords:
            query = query.where(func.lower(File.name).contains(keywords.lower()))

        if desc:
            query = query.order_by(getattr(File, orderby).desc())
        else:
            query = query.order_by(getattr(File, orderby).asc())

        count_result = await session.execute(select(func.count()).select_from(query.subquery()))
        count = count_result.scalar()

        files_result = await session.execute(
            query.offset((page_number - 1) * items_per_page)
            .limit(items_per_page)
        )
        files = files_result.scalars().all()

        res_files = []
        for file in files:
            file_dict = file.to_dict()
            if file.type == FileType.FOLDER.value:
                file_dict["size"] = await cls.get_folder_size(file.id)
                file_dict['kbs_info'] = []
                children_result = await session.execute(
                    select(File).where(
                        File.tenant_id == tenant_id,
                        File.parent_id == file.id,
                        File.id != file.id
                    )
                )
                children = children_result.scalars().all()
                file_dict["has_child_folder"] = any(c.type == FileType.FOLDER.value for c in children)
                continue

            kbs_info = await cls.get_kb_id_by_file_id(file.id)
            file_dict['kbs_info'] = kbs_info
            res_files.append(file_dict)

        return res_files, count

    @classmethod
    async def get_kb_id_by_file_id(cls, file_id):
        session = get_current_session()
        kbs_result = await session.execute(
            select(Knowledgebase.id, Knowledgebase.name)
            .select_from(File)
            .join(File2Document, File2Document.file_id == file_id)
            .join(Document, File2Document.document_id == Document.id)
            .join(Knowledgebase, Knowledgebase.id == Document.kb_id)
            .where(File.id == file_id)
        )
        kbs = kbs_result.all()

        if not kbs:
            return []

        return [{"kb_id": kb[0], "kb_name": kb[1]} for kb in kbs]

    @classmethod
    async def get_by_pf_id_name(cls, id, name):
        session = get_current_session()
        file_result = await session.execute(
            select(File).where(
                File.parent_id == id,
                File.name == name
            )
        )
        file = file_result.scalar_one_or_none()

        if file:
            return file
        return None

    @classmethod
    async def get_id_list_by_id(cls, obj_id, name, count, res):
        session = get_current_session()
        if count < len(name):
            file = await cls.get_by_pf_id_name(obj_id, name[count])
            if file:
                res.append(file.id)
                return await cls.get_id_list_by_id(file.id, name, count + 1, res)
            else:
                return res
        else:
            return res

    @classmethod
    async def get_all_innermost_file_ids(cls, folder_id, result_ids):
        session = get_current_session()
        subfolders_result = await session.execute(
            select(File).where(File.parent_id == folder_id)
        )
        subfolders = subfolders_result.scalars().all()

        if subfolders:
            for subfolder in subfolders:
                await cls.get_all_innermost_file_ids(subfolder.id, result_ids)
        else:
            result_ids.append(folder_id)
        return result_ids

    @classmethod
    @transactional
    async def create_folder(cls, file, parent_id, name, count, tenant_id, account_id):
        session = get_current_session()
        if count > len(name) - 2:
            return file
        else:
            new_file = File(
                id=get_uuid(),
                parent_id=parent_id,
                tenant_id=tenant_id,
                created_by=account_id,
                name=name[count],
                location="",
                size=0,
                type=FileType.FOLDER.value
            )
            session.add(new_file)
            return await cls.create_folder(new_file, new_file.id, name, count + 1, tenant_id, account_id)

    @classmethod
    @transactional
    async def is_parent_folder_exist(cls, parent_id):
        session = get_current_session()
        parent_result = await session.execute(
            select(File).where(File.id == parent_id)
        )
        parent = parent_result.scalar_one_or_none()

        if parent:
            return True

        await cls.delete_folder_by_pf_id(parent_id)
        return False

    @classmethod
    @transactional
    async def get_root_folder_id(cls, tenant_id, account_id):
        session = get_current_session()
        statement = select(File).where(File.tenant_id == tenant_id, File.parent_id == File.id)
        root_result = await session.execute(statement)
        root = root_result.scalar_one_or_none()

        if root:
            return root.id

        file_id = get_uuid()
        file = File(
            id=file_id,
            parent_id=file_id,
            tenant_id=tenant_id,
            created_by=account_id,
            name="/",
            type=FileType.FOLDER.value,
            size=0,
            location=""
        )
        await cls.save_or_update_entity(file)
        return file_id

    @classmethod
    async def get_kb_folder(cls, tenant_id):
        for root in await cls.query(tenant_id=tenant_id, parent_id=cls.model.id):
            for folder in await cls.query(tenant_id=tenant_id, parent_id=root.id, name=KNOWLEDGEBASE_FOLDER_NAME):
                return folder.to_dict()
        assert False, "Can't find the KB folder. Database init error."

    @classmethod
    async def new_a_file_from_kb(cls, tenant_id, account_id, name, parent_id, ty=FileType.FOLDER.value, size=0,
                                 location=""):
        for file in await cls.query(tenant_id=tenant_id, parent_id=parent_id, name=name):
            return file.to_dict()

        file = {
            "id": get_uuid(),
            "parent_id": parent_id,
            "tenant_id": tenant_id,
            "created_by": account_id,
            "name": name,
            "type": ty,
            "size": size,
            "location": location,
            "source_type": FileSource.KNOWLEDGEBASE
        }
        await cls.save(**file)
        return file

    @classmethod
    @transactional
    async def init_knowledgebase_docs(cls, root_id, tenant_id, account_id):
        bases = await cls.query(name=KNOWLEDGEBASE_FOLDER_NAME, parent_id=root_id)
        if len(bases) > 0:
            return

        folder = await cls.new_a_file_from_kb(tenant_id, account_id, KNOWLEDGEBASE_FOLDER_NAME, root_id)

        for kb in await KnowledgebaseService.query(tenant_id=tenant_id):
            kb_folder = await cls.new_a_file_from_kb(tenant_id, account_id, kb.name, folder["id"])
            for doc in await DocumentService.query(kb_id=kb.id):
                await FileService.add_file_from_kb(doc.to_dict(), kb_folder["id"], tenant_id, account_id)

    @classmethod
    async def get_parent_folder(cls, file_id):
        file = await cls.get_by_id(file_id)
        if not file:
            return None

        pf = await cls.get_by_id(file.parent_id)
        if not pf:
            return None

        return pf

    @classmethod
    async def find_all_parent_folders(cls, start_id):
        parent_folders = []
        current_id = start_id
        while current_id:
            file = await cls.get_by_id(current_id)
            if file and file.parent_id != file.id:
                parent_folders.append(file)
                current_id = file.parent_id
            else:
                parent_folders.append(file)
                break

        return parent_folders

    @classmethod
    async def delete_by_pf_id(cls, folder_id):
        session = get_current_session()
        stmt = delete(cls.model).where(cls.model.parent_id == folder_id)
        result = await session.execute(stmt)
        return result.rowcount

    @classmethod
    async def delete_folder_by_pf_id(cls, tenant_id, folder_id):
        session = get_current_session()
        files = await cls.query(tenant_id=tenant_id, parent_id=folder_id)
        for file in files:
            await cls.delete_folder_by_pf_id(tenant_id, file.id)

        stmt = delete(cls.model).where((cls.model.tenant_id == tenant_id)
                                       & (cls.model.id == folder_id))
        await session.execute(stmt)
        return len(files)

    @classmethod
    async def get_folder_size(cls, folder_id):
        size = 0

        async def dfs(parent_id):
            nonlocal size
            for f in await cls.query(parent_id=parent_id, id=cls.model.id, size=cls.model.size,
                                     type=cls.model.type):
                size += f.size
                if f.type == FileType.FOLDER.value:
                    await dfs(f.id)

        await dfs(folder_id)
        return size

    @classmethod
    @transactional
    async def add_file_from_kb(cls, doc, kb_folder_id, tenant_id, account_id):
        for _ in await File2DocumentService.find_by_document_id(doc["id"]):
            return
        file = {
            "id": get_uuid(),
            "parent_id": kb_folder_id,
            "tenant_id": tenant_id,
            "created_by": account_id,
            "name": doc["name"],
            "type": doc["type"],
            "size": doc["size"],
            "location": doc["location"],
            "source_type": FileSource.KNOWLEDGEBASE
        }
        await cls.save(**file)
        return await File2DocumentService.save(**{"id": get_uuid(), "file_id": file["id"], "document_id": doc["id"]})

    @classmethod
    @transactional
    async def move_file(cls, file_ids, folder_id):
        try:
            await cls.filter_update((cls.model.id << file_ids,), {'parent_id': folder_id})
        except Exception:
            logging.exception("move_file")
            raise RuntimeError("Database error (File move)!")

    @classmethod
    @transactional
    async def upload_document(cls, kb, file_objs, tenant_id, account_id):
        pf_id = await cls.get_root_folder_id(tenant_id, account_id)
        await cls.init_knowledgebase_docs(pf_id, tenant_id, account_id)
        kb_root_folder = await cls.get_kb_folder(tenant_id)
        kb_folder = await cls.new_a_file_from_kb(kb.tenant_id, account_id, kb.name, kb_root_folder["id"])

        err, files, infos = [], [], []
        for file in file_objs:
            try:
                MAX_FILE_NUM_PER_USER = int(os.environ.get('MAX_FILE_NUM_PER_USER', 0))
                doc_count = await DocumentService.get_doc_count(kb.tenant_id)
                if 0 < MAX_FILE_NUM_PER_USER <= doc_count:
                    raise RuntimeError("Exceed the maximum file number of a free user!")
                if len(file.filename) >= 128:
                    raise RuntimeError("Exceed the maximum length of file name!")

                filename = await duplicate_name(
                    DocumentService.query,
                    name=file.filename,
                    kb_id=kb.id)
                filetype = filename_type(filename)
                if filetype == FileType.OTHER.value:
                    raise RuntimeError("This type of file has not been supported yet!")

                location = filename
                while STORAGE_IMPL.exists(kb.id + "/" + location):
                    location += "_"
                blob = await file.read()
                STORAGE_IMPL.save(kb.id + "/" + location, blob)

                doc_id = get_uuid()
                img = thumbnail_img(filename, blob)
                thumbnail_location = ''
                if img is not None:
                    thumbnail_location = f'thumbnail_{doc_id}.png'
                    STORAGE_IMPL.save(kb.id + "/" + thumbnail_location, img)

                doc_dict = {
                    "id": doc_id,
                    "kb_id": kb.id,
                    "parser_id": get_parser(filetype, filename, kb.parser_id),
                    "parser_config": kb.parser_config,
                    "created_by": account_id,
                    "type": filetype,
                    "name": filename,
                    "location": location,
                    "size": len(blob),
                    "thumbnail": thumbnail_location
                }
                doc = await DocumentService.insert_document(kb.id, doc_dict)

                await FileService.add_file_from_kb(doc_dict, kb_folder["id"], kb.tenant_id, account_id)
                files.append((doc_dict, blob))
                infos.append(doc)
            except Exception as e:
                err.append(file.filename + ": " + str(e))

        return err, files, infos

