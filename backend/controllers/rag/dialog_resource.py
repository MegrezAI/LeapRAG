from fastapi import APIRouter, Depends
from fastapi_utils.cbv import cbv
from extensions.ext_login import login_manager
from services.service_error_code import ServiceErrorCode
from libs.base_error import BusinessError
from services.account_service import TenantService
from services.dialog_service import DialogService
from services.knowledgebase_service import KnowledgebaseService
from services.llm_service import TenantLLMService
from models import Account, FileType, transactional, StatusEnum, Dialog
from pydantic import BaseModel
from typing import List, Optional

dialog_rt = APIRouter(prefix="/rag")


class DialogModel(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    icon: Optional[str] = None
    kb_ids: List[str]
    top_n: Optional[int] = None
    top_k: Optional[int] = None
    similarity_threshold: Optional[float] = None
    vector_similarity_weight: Optional[float] = None
    rerank_id: Optional[str] = None
    prompt_config: Optional[dict] = None
    llm_setting: Optional[dict] = None
    llm_id: Optional[str] = None
    prompt_type: Optional[str] = None
    status: Optional[str] = None
    do_refer: Optional[str] = None


class DialogIds(BaseModel):
    dialog_ids: List[str]


@cbv(dialog_rt)
class DialogRoute:
    @dialog_rt.delete("/dialog")
    @transactional
    async def delete(self, data: DialogIds, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        dialog_list = []
        tenants = await TenantService.get_join_tenants(current_user)
        for id in data.dialog_ids:
            for tenant in tenants:
                if await DialogService.query(tenant_id=tenant.id, id=id):
                    break
            else:
                raise BusinessError(error_code=ServiceErrorCode.NO_AUTHORIZATION,
                                    description='Only owner of dialog authorized for this operation.')
            dialog_list.append({"id": id, "status": StatusEnum.INVALID.value})
        await DialogService.update_many_by_id(dialog_list)
        return {"result": "success"}

    @dialog_rt.post("/dialog")
    @transactional
    async def post(self, data: DialogModel, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        tenant = await TenantService.get_by_id(tenant_id)
        if not tenant:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Tenant not found!")

        kbs = await KnowledgebaseService.find_by_ids(data.kb_ids)
        embd_ids = [TenantLLMService.split_model_name_and_factory(kb.embd_id)[0] for kb in kbs]
        embd_count = len(set(embd_ids))
        if embd_count > 1:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR,
                                description=f'Datasets use different embedding models: {[kb.embd_id for kb in kbs]}"')

        dialog = DialogService.make_dialog(data.model_dump(exclude_none=True), tenant)
        await DialogService.save_or_update_entity(dialog)
        return dialog

    @dialog_rt.get("/dialog")
    async def list_dialogs(self, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        diags = await DialogService.query(
            tenant_id=tenant_id,
            status=StatusEnum.VALID.value
        )
        diags = sorted(diags, key=lambda x: x.created_at, reverse=True)
        diags = [d.to_dict() for d in diags]
        for d in diags:
            d["kb_ids"], d["kb_names"] = await KnowledgebaseService.get_kb_names(d["kb_ids"])
        return diags

    @dialog_rt.get("/dialog/{dialog_id}")
    async def get_dialog(self, dialog_id: str, current_user=Depends(login_manager)):
        dia = await DialogService.get_by_id(dialog_id)
        if not dia:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Dialog not found!")
        dia = dia.to_dict()
        dia["kb_ids"], dia["kb_names"] = await KnowledgebaseService.get_kb_names(dia["kb_ids"])
        return dia

    @dialog_rt.put("/dialog/{dialog_id}")
    @transactional
    async def put(self, dialog_id: str, data: DialogModel, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        dia = await DialogService.get_by_id(dialog_id)
        if not dia:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Dialog not found!")

        tenant = await TenantService.get_by_id(tenant_id)
        if not tenant:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Tenant not found!")

        kbs = await KnowledgebaseService.find_by_ids(data.kb_ids)
        embd_ids = [TenantLLMService.split_model_name_and_factory(kb.embd_id)[0] for kb in kbs]
        embd_count = len(set(embd_ids))
        if embd_count > 1:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR,
                                description=f'Datasets use different embedding models: {[kb.embd_id for kb in kbs]}"')

        dialog = DialogService.make_dialog(data.model_dump(exclude_none=True), tenant)
        dialog.id = dialog_id
        result = await DialogService.save_or_update_entity(dialog)
        dia = result.to_dict()
        dia["kb_ids"], dia["kb_names"] = await KnowledgebaseService.get_kb_names(dia["kb_ids"])
        return dia
