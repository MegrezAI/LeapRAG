import json
import logging
from starlette.responses import StreamingResponse
from fastapi import APIRouter, Header
from fastapi_utils.cbv import cbv

from libs.base_error import BusinessError
from services.api_service import APIKeyService, API4ConversationService
from services.dialog_service import chat, DialogService
from models import Account, LLMType, transactional, API4Conversation, Dialog, get_current_session
from services.service_error_code import ServiceErrorCode
from services.utils import to_uuid, get_uuid
from pydantic import BaseModel
from typing import List, Any

api_rt = APIRouter(prefix="/rag")


class ApiConversationCompletion(BaseModel):
    messages: List[Any] = []
    stream: bool = False


# user_id chat_id 创建新的 conversation
@cbv(api_rt)
class APIRoute:
    @api_rt.get("/api")
    @transactional
    async def get(self, user_id: str = "", chat_id: str = "", authorization: str = Header(None)):
        if authorization:
            token = authorization.split()[1]
        else:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Authorization header is missing")

        objs = await APIKeyService.query(apikey=token)
        if not objs:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, f"Authentication error: API key {token} is invalid!")

        dialog_id = objs[0].dialog_id
        dia = await DialogService.get_by_id(dialog_id)
        if not dia:
            raise BusinessError(ServiceErrorCode.NOT_FOUND, f"Dialog {dialog_id} not found")

        conv = API4Conversation()
        conv.id = to_uuid(chat_id)
        existing = await API4ConversationService.get_by_id(conv.id)
        if existing is not None:
            return existing

        conv.dialog_id = dia.id
        conv.user_id = to_uuid(user_id)
        conv.messages = [{"role": "assistant", "content": dia.prompt_config["prologue"]}]

        return await API4ConversationService.save_or_update_entity(conv)

    @api_rt.get("/api/{conversation_id}")
    async def get_conversation(self, conversation_id: str, authorization: str = Header(None)):
        if authorization:
            token = authorization.split()[1]
        else:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Authorization header is missing")

        objs = await APIKeyService.query(apikey=token)
        if not objs:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Authentication error: API key is invalid!")

        conv = await API4ConversationService.get_by_id(conversation_id)
        if not conv:
            raise BusinessError(ServiceErrorCode.NOT_FOUND, "Conversation not found!")

        conv = conv.to_dict()
        for referenct_i in conv['reference']:
            if referenct_i is None or len(referenct_i) == 0:
                continue
            for chunk_i in referenct_i['chunks']:
                if 'docnm_kwd' in chunk_i.keys():
                    chunk_i['doc_name'] = chunk_i['docnm_kwd']
                    chunk_i.pop('docnm_kwd')
        return conv

    @api_rt.post("/api/{conversation_id}")
    @transactional
    async def post_conversation(self, conversation_id: str, data: ApiConversationCompletion,
                                authorization: str = Header(None)):
        if authorization:
            token = authorization.split()[1]
        else:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Authorization header is missing")

        objs = await APIKeyService.query(apikey=token)
        if not objs:
            raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION, "Authentication error: API key is invalid!")

        conv = await API4ConversationService.get_by_id(conversation_id)
        if not conv:
            raise BusinessError(ServiceErrorCode.NOT_FOUND, "Conversation not found!")

        req = data.model_dump(exclude_none=True)
        if "quote" not in req:
            req["quote"] = False

        msg = []
        for m in req["messages"]:
            if m["role"] == "system":
                continue
            if m["role"] == "assistant" and not msg:
                continue
            msg.append(m)
        if not msg[-1].get("id"):
            msg[-1]["id"] = get_uuid()
        message_id = get_uuid()

        def fillin_conv(ans):
            nonlocal conv, message_id
            if not conv.reference:
                conv.reference.append(ans["reference"])
            else:
                conv.reference[-1] = ans["reference"]
            conv.messages[-1] = {"role": "assistant", "content": ans["answer"], "id": message_id}
            ans["id"] = message_id

        def rename_field(ans):
            reference = ans['reference']
            if not isinstance(reference, dict):
                return
            for chunk_i in reference.get('chunks', []):
                if 'docnm_kwd' in chunk_i:
                    chunk_i['doc_name'] = chunk_i['docnm_kwd']
                    chunk_i.pop('docnm_kwd')

        conv.messages.append(msg[-1])
        dia = await DialogService.get_by_id(conv.dialog_id)
        if not dia:
            raise BusinessError(ServiceErrorCode.NOT_FOUND, "Dialog not found!")

        del req["messages"]

        if not conv.reference:
            conv.reference = []
        conv.messages.append({"role": "assistant", "content": "", "id": message_id})
        conv.reference.append({"chunks": [], "doc_aggs": []})

        conv_dict = conv.to_dict()
        conv = API4Conversation(**conv_dict)

        dia_dict = dia.to_dict()
        dia = Dialog(**dia_dict)

        async def stream():
            try:
                async for ans in chat(dia, msg, **req):
                    fillin_conv(ans)
                    rename_field(ans)
                    yield "data:" + json.dumps({"code": 0, "message": "", "data": ans}, ensure_ascii=False) + "\n\n"
                await API4ConversationService.append_message(conversation_id, conv)
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

        answer = None
        async for ans in chat(dia, msg, **req):
            answer = ans
            fillin_conv(ans)
            await API4ConversationService.append_message(conversation_id, conv)
            break

        rename_field(answer)
        return answer
