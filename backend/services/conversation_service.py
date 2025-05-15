import time
from typing import Optional, List, Dict, Any
from sqlalchemy import select, update, and_
from models import Conversation, get_current_session, transactional
from services.common_service import CommonService


class ConversationService(CommonService):
    model = Conversation

    @classmethod
    @transactional
    async def find_list(cls, dialog_id: str, page_number: int, items_per_page: int,
                 orderby: str, desc: bool, id: Optional[str] = None, 
                 name: Optional[str] = None) -> List[Dict[str, Any]]:

        query = select(cls.model).where(cls.model.dialog_id == dialog_id)

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


def structure_answer(conv, ans, message_id, session_id):
    reference = ans["reference"]
    if not isinstance(reference, dict):
        reference = {}
        ans["reference"] = {}

    def get_value(d, k1, k2):
        return d.get(k1, d.get(k2))

    chunk_list = [{
        "id": get_value(chunk, "chunk_id", "id"),
        "content": get_value(chunk, "content", "content_with_weight"),
        "document_id": get_value(chunk, "doc_id", "document_id"),
        "document_name": get_value(chunk, "docnm_kwd", "document_name"),
        "dataset_id": get_value(chunk, "kb_id", "dataset_id"),
        "image_id": get_value(chunk, "image_id", "img_id"),
        "positions": get_value(chunk, "positions", "position_int"),
        "url": chunk.get("url")
    } for chunk in reference.get("chunks", [])]

    reference["chunks"] = chunk_list
    ans["id"] = message_id
    ans["session_id"] = session_id

    if not conv:
        return ans

    if not conv.messages:
        conv.messages = []
    if not conv.messages or conv.messages[-1].get("role", "") != "assistant":
        conv.messages.append(
            {"role": "assistant", "content": ans["answer"], "prompt": ans.get("prompt", ""), "created_at": time.time(),
             "id": message_id})
    else:
        conv.messages[-1] = {"role": "assistant", "content": ans["answer"], "prompt": ans.get("prompt", ""),
                             "created_at": time.time(), "id": message_id}
    if conv.reference:
        conv.reference[-1] = reference
    return ans
