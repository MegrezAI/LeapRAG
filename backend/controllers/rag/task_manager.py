import logging
from abc import abstractmethod
from datetime import datetime, UTC
from typing import Union, Iterable, Any, AsyncIterable, Dict
import re

from common.server import utils, TaskManager
from common.server.utils import new_not_implemented_error
from common.types import (
    JSONRPCResponse,
    TaskIdParams,
    TaskQueryParams,
    GetTaskRequest,
    TaskNotFoundError,
    SendTaskRequest,
    CancelTaskRequest,
    TaskNotCancelableError,
    SetTaskPushNotificationRequest,
    GetTaskPushNotificationRequest,
    GetTaskResponse,
    CancelTaskResponse,
    SendTaskResponse,
    SetTaskPushNotificationResponse,
    GetTaskPushNotificationResponse,
    PushNotificationNotSupportedError,
    TaskSendParams,
    TaskStatus,
    TaskState,
    TaskResubscriptionRequest,
    SendTaskStreamingRequest,
    SendTaskStreamingResponse,
    Artifact,
    PushNotificationConfig,
    TaskStatusUpdateEvent,
    JSONRPCError,
    TaskPushNotificationConfig,
    InternalError, Message, TaskArtifactUpdateEvent, TextPart, Task, InvalidParamsError,
)
from common.utils.push_notification_auth import PushNotificationSenderAuth
from models import Agent, transactional, AgentTask, API4Conversation, Dialog, get_current_session
from services.agent_service import AgentTaskService
from services.api_service import API4ConversationService
from services.dialog_service import DialogService, chat
from services.utils import get_uuid

SUPPORTED_CONTENT_TYPES = ["text", "text/plain"]


class OnDiskTaskManager(TaskManager):
    def __init__(self, agent_id: str):
        self.agent_id = agent_id

    def _convert_model(self, agent_task) -> Task:
        return Task(
            id=agent_task.id,
            sessionId=agent_task.session_id,
            artifacts=[Artifact(**artifact) for artifact in agent_task.artifacts] if agent_task.artifacts else [],
            status=TaskStatus(
                state=TaskState(agent_task.state),
                timestamp=agent_task.timestamp,
                message=Message(**agent_task.message) if agent_task.message else None
            ),
            history=[Message(**msg) for msg in agent_task.history] if agent_task.history else [],
            metadata=agent_task.task_metadata,
        )

    async def on_get_task(self, request: GetTaskRequest) -> GetTaskResponse:
        logging.info(f"Getting task {request.params.id}")
        task_query_params: TaskQueryParams = request.params
        agent_task = await AgentTaskService.get_by_id(task_query_params.id)
        if agent_task is None:
            return GetTaskResponse(id=request.id, error=TaskNotFoundError())

        task = self._convert_model(agent_task)
        task_result = self.append_task_history(task, task_query_params.historyLength)
        return GetTaskResponse(id=request.id, result=task_result)

    async def on_cancel_task(self, request: CancelTaskRequest) -> CancelTaskResponse:
        logging.info(f"Cancelling task {request.params.id}")
        task_id_params: TaskIdParams = request.params

        agent_task = await AgentTaskService.get_by_id(task_id_params.id)
        if agent_task is None:
            return CancelTaskResponse(id=request.id, error=TaskNotFoundError())
        return CancelTaskResponse(id=request.id, error=TaskNotCancelableError())

    @abstractmethod
    async def on_send_task(self, request: SendTaskRequest) -> SendTaskResponse:
        pass

    @abstractmethod
    async def on_send_task_subscribe(
            self, request: SendTaskStreamingRequest
    ) -> Union[Iterable[SendTaskStreamingResponse], JSONRPCResponse]:
        pass

    @transactional
    async def set_push_notification_info(self, task_id: str, notification_config: PushNotificationConfig):
        agent_task = await AgentTaskService.get_by_id(task_id)
        if agent_task is None:
            agent_task = AgentTask(id=task_id)
        agent_task.push_notification = notification_config.model_dump(exclude_none=True)
        await AgentTaskService.save_or_update_entity(agent_task)

    async def get_push_notification_info(self, task_id: str) -> PushNotificationConfig | None:
        agent_task = await AgentTaskService.get_by_id(task_id)
        if agent_task is None or agent_task.push_notification is None:
            return None
        return PushNotificationConfig(**agent_task.push_notification)

    async def has_push_notification_info(self, task_id: str) -> bool:
        agent_task = await AgentTaskService.get_by_id(task_id)
        if agent_task is None:
            return False
        return agent_task.push_notification is not None

    async def on_set_task_push_notification(self,
                                            request: SetTaskPushNotificationRequest) -> SetTaskPushNotificationResponse:
        task_notification_params: TaskPushNotificationConfig = request.params

        try:
            await self.set_push_notification_info(task_notification_params.id,
                                                  task_notification_params.pushNotificationConfig)
        except Exception as e:
            logging.error(f"Error while setting push notification info: {e}")
            return JSONRPCResponse(id=request.id,
                                   error=InternalError(
                                       message="An error occurred while setting push notification info"),
                                   )

        return SetTaskPushNotificationResponse(id=request.id, result=task_notification_params)

    async def on_get_task_push_notification(self,
                                            request: GetTaskPushNotificationRequest) -> GetTaskPushNotificationResponse:
        task_params: TaskIdParams = request.params

        try:
            notification_info = await self.get_push_notification_info(task_params.id)
            return GetTaskPushNotificationResponse(id=request.id,
                                                   result=TaskPushNotificationConfig(id=task_params.id,
                                                                                     pushNotificationConfig=notification_info))
        except Exception as e:
            return GetTaskPushNotificationResponse(id=request.id,
                                                   error=InternalError(
                                                       message="An error occurred while getting push notification info"))

    @transactional
    async def upsert_task(self, task_send_params: TaskSendParams) -> Task:
        agent_task = await AgentTaskService.get_by_id(task_send_params.id)
        if agent_task is None:
            agent_task = AgentTask(
                id=task_send_params.id,
                agent_id=self.agent_id,
                session_id=task_send_params.sessionId,
                push_notification=task_send_params.pushNotification.model_dump(
                    exclude_none=True) if task_send_params.pushNotification else None,
                artifacts=[],
                state=TaskState.SUBMITTED,
                timestamp=datetime.now(UTC).replace(tzinfo=None),
                history=[task_send_params.message.model_dump(exclude_none=True)],
            )
            await AgentTaskService.save_or_update_entity(agent_task)
        else:
            agent_task.history.append(task_send_params.message.model_dump(exclude_none=True))
            await AgentTaskService.update_by_id(task_send_params.id, agent_task.to_dict())

        session = get_current_session()
        await session.commit()
        return self._convert_model(agent_task)

    async def on_resubscribe_to_task(
            self, request: TaskResubscriptionRequest
    ) -> Union[AsyncIterable[SendTaskStreamingResponse], JSONRPCResponse]:
        return new_not_implemented_error(request.id)

    @transactional
    async def update_store(self, task_id: str, status: TaskStatus, artifact: Artifact | None,
                           replacing: bool = False) -> Task:
        agent_task = await AgentTaskService.get_by_id(task_id)
        if not agent_task:
            logging.error(f"Task {task_id} not found for updating the task")
            raise ValueError(f"Task {task_id} not found")

        agent_task.state = status.state
        agent_task.timestamp = status.timestamp
        if status.message is not None:
            agent_task.message = status.message.model_dump(exclude_none=True)
            if replacing:
                if agent_task.history:
                    agent_task.history[-1] = status.message.model_dump(exclude_none=True)
                else:
                    agent_task.history.append(status.message.model_dump(exclude_none=True))
            else:
                agent_task.history.append(status.message.model_dump(exclude_none=True))

        if artifact is not None:
            if replacing:
                if agent_task.artifacts:
                    agent_task.artifacts[-1] = artifact.model_dump(exclude_none=True)
                else:
                    agent_task.artifacts = [artifact.model_dump(exclude_none=True)]
            else:
                agent_task.artifacts.append(artifact.model_dump(exclude_none=True))

        await AgentTaskService.update_by_id(task_id, agent_task.to_dict())

        session = get_current_session()
        await session.commit()
        return self._convert_model(agent_task)

    def append_task_history(self, task: Task, historyLength: int | None):
        new_task = task.model_copy()
        if historyLength is not None and historyLength > 0:
            new_task.history = new_task.history[-historyLength:]
        else:
            new_task.history = []

        return new_task


class RagAgentTaskManager(OnDiskTaskManager):
    def __init__(self, agent_id: str, dialog_id: str, notification_sender_auth: PushNotificationSenderAuth):
        super().__init__(agent_id)
        self.dialog_id = dialog_id
        self.notification_sender_auth = notification_sender_auth

    async def _stream_generator(self, request: SendTaskStreamingRequest, push_notification_config) -> AsyncIterable[
        SendTaskStreamingResponse | JSONRPCResponse]:
        task_send_params: TaskSendParams = request.params
        query = self._get_user_query(task_send_params)
        try:
            replacing = False
            async for item in self._invoke_rag_agent_sse(query, task_send_params.id, task_send_params.sessionId):
                is_task_complete = not isinstance(item, dict)
                task_state = TaskState.COMPLETED if is_task_complete else TaskState.WORKING

                # Now yield TaskStatusUpdateEvent
                if is_task_complete:
                    task_status = TaskStatus(state=task_state,
                                             timestamp=datetime.now(UTC).replace(tzinfo=None))
                    task = await self.update_store(task_send_params.id, task_status, None, True)
                    await self.send_task_notification(task, push_notification_config)
                    yield SendTaskStreamingResponse(id=request.id, result=TaskStatusUpdateEvent(
                        id=task_send_params.id,
                        status=task_status,
                        final=True
                    ))
                else:
                    parts = [{"type": "text", "text": item["answer"]}]
                    artifact = Artifact(parts=parts, index=0, append=False)
                    message = Message(role="agent", parts=parts)
                    task_status = TaskStatus(state=task_state, message=message,
                                             timestamp=datetime.now(UTC).replace(tzinfo=None))
                    task = await self.update_store(task_send_params.id, task_status, artifact, replacing)
                    replacing = True

                    await self.send_task_notification(task, push_notification_config)

                    # Now yield Artifact
                    if artifact:
                        yield SendTaskStreamingResponse(id=request.id, result=TaskArtifactUpdateEvent(
                            id=task_send_params.id,
                            artifact=artifact,
                        ))

                    yield SendTaskStreamingResponse(id=request.id, result=TaskStatusUpdateEvent(
                        id=task_send_params.id,
                        status=task_status,
                        final=False,
                    ))
        except Exception as ex:
            logging.error(f"An error occurred while streaming the response", exc_info=ex)
            yield JSONRPCResponse(id=request.id,
                                  error=InternalError(message="An error occurred while streaming the response"))

    def _validate_request(self, request: Union[SendTaskRequest, SendTaskStreamingRequest]):
        task_send_params: TaskSendParams = request.params
        # 强制要求 sessionId
        if not task_send_params.sessionId:
            return utils.new_incompatible_types_error(request.id)

        if not re.fullmatch(r'^[0-9a-f]{32}$', task_send_params.sessionId, re.IGNORECASE) and not re.fullmatch(
                r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
                task_send_params.sessionId, re.IGNORECASE):
            return utils.new_incompatible_types_error(request.id)

        if not utils.are_modalities_compatible(task_send_params.acceptedOutputModes, SUPPORTED_CONTENT_TYPES):
            logging.info(
                "Unsupported output mode. Received %s, Support %s",
                task_send_params.acceptedOutputModes,
                SUPPORTED_CONTENT_TYPES,
            )
            return utils.new_incompatible_types_error(request.id)

    async def on_send_task(self, request: SendTaskRequest) -> SendTaskResponse:
        error = self._validate_request(request)
        if error:
            return error

        push_notification_config = request.params.pushNotification
        if push_notification_config:
            if not await self.notification_sender_auth.verify_push_notification_url(push_notification_config.url):
                return SendTaskResponse(id=request.id,
                                        error=InvalidParamsError(message="Push notification URL is invalid"))

        await self.upsert_task(request.params)
        task = await self.update_store(request.params.id,
                                       TaskStatus(state=TaskState.WORKING,
                                                  timestamp=datetime.now(UTC).replace(tzinfo=None)),
                                       None)
        await self.send_task_notification(task, push_notification_config)
        return await self._invoke(request, push_notification_config)

    async def on_send_task_subscribe(self, request: SendTaskStreamingRequest) -> AsyncIterable[
                                                                                     SendTaskStreamingResponse] | JSONRPCResponse:
        error = self._validate_request(request)
        if error:
            return error

        push_notification_config = request.params.pushNotification
        if push_notification_config:
            if not await self.notification_sender_auth.verify_push_notification_url(push_notification_config.url):
                return SendTaskResponse(id=request.id,
                                        error=InvalidParamsError(message="Push notification URL is invalid"))

        await self.upsert_task(request.params)
        return self._stream_generator(request, push_notification_config)

    async def _invoke(self, request: SendTaskRequest, push_notification_config) -> SendTaskResponse:
        task_send_params: TaskSendParams = request.params
        query = self._get_user_query(task_send_params)

        try:
            result = await self._invoke_rag_agent(query, task_send_params.id, task_send_params.sessionId)
        except Exception as e:
            raise ValueError(f"Error invoking agent: {e}")

        parts = [{"type": "text", "text": result}]
        task_state = TaskState.INPUT_REQUIRED if "MISSING_INFO:" in result else TaskState.COMPLETED
        task = await self.update_store(task_send_params.id,
                                       TaskStatus(state=task_state, message=Message(role="agent", parts=parts),
                                                  timestamp=datetime.now(UTC).replace(tzinfo=None)),
                                       Artifact(parts=parts),
                                       False)
        await self.send_task_notification(task, push_notification_config)
        return SendTaskResponse(id=request.id, result=task)

    def _get_user_query(self, task_send_params: TaskSendParams) -> str:
        part = task_send_params.message.parts[0]
        if not isinstance(part, TextPart):
            raise ValueError("Only text parts are supported")
        return part.text

    async def send_task_notification(self, task: Task, push_notification_config: PushNotificationConfig):
        push_info = push_notification_config if push_notification_config else await self.get_push_notification_info(
            task.id)
        if push_info is None:
            return

        await self.notification_sender_auth.send_push_notification(
            push_info.url,
            data=task.model_dump(exclude_none=True)
        )

    async def set_push_notification_info(self, task_id: str, push_notification_config: PushNotificationConfig):
        # Verify the ownership of notification URL by issuing a challenge request.
        is_verified = await self.notification_sender_auth.verify_push_notification_url(push_notification_config.url)
        if not is_verified:
            return False

        await super().set_push_notification_info(task_id, push_notification_config)
        return True

    async def _invoke_rag_agent_sse(self, content, task_id, session_id) -> AsyncIterable[Dict[str, Any]]:
        conv, dia = await self.get_api_conversation(task_id, session_id)
        if dia is None:
            raise ValueError(f"Error invoking agent: server dialog config not found")

        conv_dict = conv.to_dict()
        conv = API4Conversation(**conv_dict)
        dia_dict = dia.to_dict()
        dia = Dialog(**dia_dict)

        conv.messages.append({"content": content, "role": "user", "id": task_id})
        req = {'stream': True}
        if "quote" not in req:
            req["quote"] = False

        msg = []
        for m in conv.messages:
            if m["role"] == "system":
                continue
            if m["role"] == "assistant" and not msg:
                continue
            msg.append(m)

        message_id = get_uuid()
        if not conv.reference:
            conv.reference = []
        conv.messages.append({"role": "assistant", "content": "", "id": message_id})
        conv.reference.append({"chunks": [], "doc_aggs": []})

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

        async def stream() -> AsyncIterable[Dict[str, Any] | bool]:
            nonlocal dia, msg, req, conv
            try:
                async for ans in chat(dia, msg, **req):
                    fillin_conv(ans)
                    rename_field(ans)
                    yield ans
                await API4ConversationService.append_message(conv.id, conv)
            except Exception as ex:
                logging.error("stream exception", exc_info=ex)
                yield {"answer": "**ERROR**: " + str(ex), "reference": []}
            yield True

        async for data in stream():
            yield data

    async def _invoke_rag_agent(self, content, task_id, session_id):
        conv, dia = await self.get_api_conversation(task_id, session_id)
        if dia is None:
            raise ValueError(f"Error invoking agent: server dialog config not found")

        conv_dict = conv.to_dict()
        conv = API4Conversation(**conv_dict)
        dia_dict = dia.to_dict()
        dia = Dialog(**dia_dict)

        conv.messages.append({"content": content, "role": "user", "id": task_id})
        req = {'stream': False}
        if "quote" not in req:
            req["quote"] = False

        msg = []
        for m in conv.messages:
            if m["role"] == "system":
                continue
            if m["role"] == "assistant" and not msg:
                continue
            msg.append(m)

        message_id = get_uuid()
        if not conv.reference:
            conv.reference = []
        conv.messages.append({"role": "assistant", "content": "", "id": message_id})
        conv.reference.append({"chunks": [], "doc_aggs": []})

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

        # ****************** Not Streaming ******************
        answer = None
        async for ans in chat(dia, msg, **req):
            answer = ans
            fillin_conv(ans)
            await API4ConversationService.append_message(conv.id, conv)
            break

        rename_field(answer)
        return answer['answer']

    @transactional
    async def get_api_conversation(self, task_id, conversation_id):
        dia = await DialogService.get_by_id(self.dialog_id)
        if not dia:
            return None, None

        conv = API4Conversation()
        conv.id = conversation_id
        existing = await API4ConversationService.get_by_id(conv.id)
        if existing is not None:
            return existing, dia

        conv.dialog_id = dia.id
        conv.round = 0
        conv.tokens = 0
        conv.duration = 0
        conv.thumb_up = 0
        conv.source = self.agent_id
        conv.user_id = task_id
        conv.dsl = {}
        conv.created_at = datetime.now(UTC).replace(tzinfo=None)
        conv.updated_at = datetime.now(UTC).replace(tzinfo=None)
        conv.messages = [{"role": "assistant", "content": dia.prompt_config["prologue"]}]
        return await API4ConversationService.save_or_update_entity(conv), dia
