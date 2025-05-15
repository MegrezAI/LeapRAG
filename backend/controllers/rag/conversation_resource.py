import json
import logging
import re
from fastapi import APIRouter, Depends
from fastapi_utils.cbv import cbv
from copy import deepcopy
from starlette.responses import Response, StreamingResponse
from extensions.ext_login import login_manager
from services.service_error_code import ServiceErrorCode
from libs.base_error import BusinessError
from services.account_service import TenantService
from services.conversation_service import ConversationService, structure_answer
from services.dialog_service import DialogService, chat
from services.llm_service import LLMBundle
from services.utils import duplicate_name, get_uuid
from models import Account, FileType, transactional, StatusEnum, Dialog, LLMType, Conversation, get_current_session
from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any

conversation_rt = APIRouter(prefix="/rag")


class ConversationModel(BaseModel):
    name: Optional[str] = None
    dialog_id: Optional[str] = None


class ConversationIds(BaseModel):
    conversation_ids: List[str]


class CompletionModel(BaseModel):
    messages: Optional[List[Dict[str, Any]]] = None
    stream: Optional[bool] = None


class TTSModel(BaseModel):
    text: Optional[str] = None


class QuestionModel(BaseModel):
    question: str
    kb_ids: Optional[List[Union[str, Dict[str, Any]]]] = None


class ThumbUpModel(BaseModel):
    feedback: Optional[str] = None
    set: bool


@cbv(conversation_rt)
class ConversationRoute:
    @conversation_rt.delete("/conversation")
    @transactional
    async def delete(self, data: ConversationIds, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        for cid in data.conversation_ids:
            conv = await ConversationService.get_by_id(cid)
            if not conv:
                continue

            tenants = await TenantService.get_join_tenants(current_user)
            for tenant in tenants:
                if await DialogService.query(tenant_id=tenant.id, id=conv.dialog_id):
                    break
            else:
                raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION,
                                    description='Only owner of conversation authorized for this operation.')
            await ConversationService.delete_by_id(cid)
        return {"result": "success"}

    @conversation_rt.post("/conversation")
    @transactional
    async def post(self, data: ConversationModel, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        dia = await DialogService.get_by_id(data.dialog_id)
        if not dia:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Dialog not found")
        conv = {
            "id": get_uuid(),
            "dialog_id": data.dialog_id,
            "name": data.name or "New conversation",
            "messages": [{"role": "assistant", "content": dia.prompt_config["prologue"]}]
        }
        await ConversationService.save(**conv)
        return conv

    @conversation_rt.get("/conversation")
    async def get(self, dialog_id: str = '', current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        if not await DialogService.query(tenant_id=tenant_id, id=dialog_id):
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION,
                                description='Only owner of dialog authorized for this operation.')
        convs = await ConversationService.query(dialog_id=dialog_id)
        convs = sorted(convs, key=lambda x: x.created_at, reverse=True)
        return convs

    @conversation_rt.get("/conversation/getsse/{dialog_id}")
    async def get_sse(self, dialog_id: str, current_user=Depends(login_manager)):
        conv = await DialogService.get_by_id(dialog_id)
        if not conv:
            raise BusinessError(ServiceErrorCode.NOT_FOUND, description="Dialog not found!")
        conv = conv.to_dict()
        conv["avatar"] = conv["icon"]
        return conv


    @conversation_rt.post('/conversation/tts')
    @transactional
    async def tts_post(self, data: TTSModel, current_user=Depends(login_manager)):
        text = data.text
        tenants = await TenantService.get_join_tenants(current_user)
        if not tenants:
            raise BusinessError(ServiceErrorCode.NOT_FOUND, description="Tenant not found!")

        tts_id = tenants[0]["tts_id"]
        if not tts_id:
            raise BusinessError(ServiceErrorCode.NOT_SUPPORT, description="No default TTS model is set")

        tts_mdl = await LLMBundle.create(tenants[0]["tenant_id"], LLMType.TTS, tts_id)

        def stream_audio():
            try:
                for txt in re.split(r"[，。/《》？；：！\n\r:;]+", text):
                    for chunk in tts_mdl.tts(txt):
                        yield chunk
            except Exception as e:
                yield ("data:" + json.dumps({"code": 500, "message": str(e),
                                             "data": {"answer": "**ERROR**: " + str(e)}},
                                            ensure_ascii=False)).encode('utf-8')

        return Response(stream_audio(), media_type="audio/mpeg", headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        })

    @conversation_rt.post('/conversation/{conversation_id}/{message_id}')
    @transactional
    async def conv_del_post(self, conversation_id: str, message_id: str, data: ThumbUpModel,
                            current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        conv = await ConversationService.get_by_id(conversation_id)
        if not conv:
            raise BusinessError(ServiceErrorCode.NOT_FOUND, description="Conversation not found!")
        up_down = data.set
        feedback = data.feedback

        conv = conv.to_dict()
        for i, msg in enumerate(conv["messages"]):
            if message_id == msg.get("id", "") and msg.get("role", "") == "assistant":
                if up_down:
                    msg["thumbup"] = True
                    if "feedback" in msg:
                        del msg["feedback"]
                else:
                    msg["thumbup"] = False
                    if feedback:
                        msg["feedback"] = feedback
                break

        await ConversationService.update_by_id(conv["id"], conv)
        return conv

    @conversation_rt.delete('/conversation/{conversation_id}/{message_id}')
    @transactional
    async def conv_del_delete(self, conversation_id: str, message_id: str, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        conv = await ConversationService.get_by_id(conversation_id)
        if not conv:
            raise BusinessError(ServiceErrorCode.NOT_FOUND, description="Conversation not found!")

        conv = conv.to_dict()
        for i, msg in enumerate(conv["message"]):
            if message_id != msg.get("id", ""):
                continue
            assert conv["message"][i + 1]["id"] == message_id
            conv["message"].pop(i)
            conv["message"].pop(i)
            conv["reference"].pop(max(0, i // 2 - 1))
            break

        await ConversationService.update_by_id(conv["id"], conv)
        return conv

    @conversation_rt.get('/conversation/{conversation_id}')
    async def conv_info_get(self, conversation_id: str, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        conv = await ConversationService.get_by_id(conversation_id)
        if not conv:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Conversation not found!")
        tenants = await TenantService.get_join_tenants(current_user)
        avatar = None
        for tenant in tenants:
            dialog = await DialogService.query(tenant_id=tenant.id, id=conv.dialog_id)
            if dialog and len(dialog) > 0:
                avatar = dialog[0].icon
                break
        else:
            raise BusinessError(error_code=ServiceErrorCode.NO_AUTHORIZATION,
                                description='Only owner of conversation authorized for this operation.')

        def get_value(d, k1, k2):
            return d.get(k1, d.get(k2))

        for ref in conv.reference:
            if isinstance(ref, list):
                continue
            ref["chunks"] = [{
                "id": get_value(ck, "chunk_id", "id"),
                "content": get_value(ck, "content", "content_with_weight"),
                "document_id": get_value(ck, "doc_id", "document_id"),
                "document_name": get_value(ck, "docnm_kwd", "document_name"),
                "dataset_id": get_value(ck, "kb_id", "dataset_id"),
                "image_id": get_value(ck, "image_id", "img_id"),
                "positions": get_value(ck, "positions", "position_int"),
            } for ck in ref.get("chunks", [])]

        conv = conv.to_dict()
        conv["avatar"] = avatar
        return conv

    @conversation_rt.put('/conversation/{conversation_id}')
    @transactional
    async def conv_info_put(self, conversation_id: str, data: ConversationModel, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id

        if not await ConversationService.update_by_id(conversation_id, data.model_dump(exclude_none=True)):
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Fail to update a conversation!")

        conv = await ConversationService.get_by_id(conversation_id)
        if not conv:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Conversation not found!")

        return conv

    @conversation_rt.post('/conversation/{conversation_id}')
    @transactional
    async def streaming(self, conversation_id: str, data: CompletionModel, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        msg = []
        for m in data.messages:
            if m["role"] == "system":
                continue
            if m["role"] == "assistant" and not msg:
                continue
            msg.append(m)

        message_id = get_uuid()
        conv = await ConversationService.get_by_id(conversation_id)
        if not conv:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Conversation not found!")
        conv.messages = deepcopy(data.messages)
        dia_obj = await DialogService.get_by_id(conv.dialog_id)
        if not dia_obj:
            raise BusinessError(error_code=ServiceErrorCode.NOT_FOUND, description="Dialog not found!")

        dia_dict = dia_obj.to_dict()
        dia = Dialog(**dia_dict)

        req = data.model_dump(exclude_none=True)
        del req["messages"]

        if not conv.reference:
            conv.reference = []
        else:
            def get_value(d, k1, k2):
                return d.get(k1, d.get(k2))

            for ref in conv.reference:
                if isinstance(ref, list):
                    continue
                ref["chunks"] = [{
                    "id": get_value(ck, "chunk_id", "id"),
                    "content": get_value(ck, "content", "content_with_weight"),
                    "document_id": get_value(ck, "doc_id", "document_id"),
                    "document_name": get_value(ck, "docnm_kwd", "document_name"),
                    "dataset_id": get_value(ck, "kb_id", "dataset_id"),
                    "image_id": get_value(ck, "image_id", "img_id"),
                    "positions": get_value(ck, "positions", "position_int"),
                } for ck in ref.get("chunks", [])]

        if not conv.reference:
            conv.reference = []
        conv.reference.append({"chunks": [], "doc_aggs": []})

        conv_dict = conv.to_dict()
        conv = Conversation(**conv_dict)

        async def stream():
            try:
                async for ans in chat(dia, msg, True, **req):
                    ans = structure_answer(conv, ans, message_id, conv.id)
                    yield "data:" + json.dumps({"code": 0, "message": "", "data": ans}, ensure_ascii=False) + "\n\n"
                await ConversationService.update_by_id(conv.id, conv.to_dict())
                session = get_current_session()
                await session.commit()
            except Exception as ex:
                logging.error("stream exception", exc_info=ex)
                yield "data:" + json.dumps({"code": 500, "message": str(ex),
                                            "data": {"answer": "**ERROR**: " + str(ex), "reference": []}},
                                           ensure_ascii=False) + "\n\n"
            yield "data:" + json.dumps({"code": 0, "message": "", "data": True}, ensure_ascii=False) + "\n\n"

        if req.get("stream", True):
            return StreamingResponse(stream(), media_type="text/event-stream")
        else:
            answer = None
            async for ans in chat(dia, msg, **req):
                answer = structure_answer(conv, ans, message_id, conversation_id)
                await ConversationService.update_by_id(conv.id, conv.to_dict())
                break
            return answer
