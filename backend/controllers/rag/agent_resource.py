from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, Request
from fastapi_utils.cbv import cbv

from pydantic import BaseModel
from common.server.server import A2AServer
from common.types import AgentCard, AgentAuthentication
from common.utils.push_notification_auth import PushNotificationSenderAuth
from configs import app_config
from controllers.rag.task_manager import RagAgentTaskManager
from extensions.ext_login import login_manager
from services.account_service import TenantService
from services.agent_service import AgentService, AgentTaskService
from libs.base_error import BusinessError
from services.api_service import APIKeyService
from services.dialog_service import DialogService
from services.knowledgebase_service import KnowledgebaseService
from services.llm_service import TenantLLMService
from services.service_error_code import ServiceErrorCode
from models import Agent, transactional, Dialog, APIToken
from services.utils import get_uuid

agent_rt = APIRouter(prefix="/rag")


class AgentModel(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    url: Optional[str] = None
    documentation_url: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    agent_config: Optional[dict] = None
    authentication: Optional[dict] = None
    provider: Optional[dict] = None
    capabilities: Optional[dict] = None
    skills: Optional[List[dict]] = None
    default_input_modes: Optional[List[str]] = None
    default_output_modes: Optional[List[str]] = None
    icon: Optional[str] = None


class A2AModel(BaseModel):
    method: str
    params: Optional[dict] = None


class AgentResponse(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    url: Optional[str] = None
    documentation_url: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    agent_config: Optional[dict] = None
    authentication: Optional[dict] = None
    provider: Optional[dict] = None
    capabilities: Optional[dict] = None
    skills: List[dict]
    default_input_modes: Optional[List[str]] = None
    default_output_modes: Optional[List[str]] = None
    icon: Optional[str] = None
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


notification_sender_auth = PushNotificationSenderAuth()
notification_sender_auth.generate_jwk()


@cbv(agent_rt)
class AgentRoute:
    @agent_rt.get("/agent", response_model=List[AgentResponse])
    async def find_list(self, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        return await AgentService.list_agents(tenant_id)

    @agent_rt.post("/agent", response_model=AgentResponse)
    @transactional
    async def create_agent(self, data: AgentModel, current_user=Depends(login_manager)):
        """Create a new agent"""
        tenant_id = current_user.current_tenant_id
        tenant = await TenantService.get_by_id(tenant_id)
        if not tenant:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Tenant not found!")
        agent_id = get_uuid()

        agent_config = data.agent_config.copy()
        dialog_config = agent_config.get("dialog_config", {})
        if dialog_config:
            kbs = await KnowledgebaseService.find_by_ids(dialog_config.get("kb_ids", []))
            embd_ids = [TenantLLMService.split_model_name_and_factory(kb.embd_id)[0] for kb in
                        kbs]  # remove vendor suffix for comparison
            embd_count = len(set(embd_ids))
            if embd_count > 1:
                raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR,
                                    description=f'Datasets use different embedding models: {[kb.embd_id for kb in kbs]}"')

            dialog = DialogService.make_dialog(dialog_config, tenant)
            dialog.agent_id = agent_id
            dialog.id = get_uuid()
            await DialogService.save_or_update_entity(dialog)
            agent_config["dialog_id"] = dialog.id
            del agent_config["dialog_config"]
        data.agent_config = agent_config

        agent = Agent(**data.model_dump(exclude_none=True))
        agent.id = agent_id
        agent.tenant_id = tenant_id
        agent.created_by = current_user.id
        agent.status = 'active'

        result = (await AgentService.save_or_update_entity(agent)).to_dict()
        dialog = await DialogService.get_or_none(agent_id=agent_id)
        if dialog:
            dia = dialog.to_dict()
            dia["kb_ids"], dia["kb_names"] = await KnowledgebaseService.get_kb_names(dia["kb_ids"])
            result["agent_config"]["dialog_config"] = dia
        return result

    @agent_rt.get("/agent/{agent_id}")
    @transactional
    async def get_agent(self, agent_id: str, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id

        agent = await AgentService.get_agent(agent_id)
        if agent is None:
            raise BusinessError(ServiceErrorCode.AGENT_NOT_FOUND, f"agent_id={agent_id}")

        if agent.tenant_id != tenant_id:
            raise BusinessError(ServiceErrorCode.AGENT_NOT_ALLOWED_OPERATE)

        dialog = await DialogService.get_or_none(agent_id=agent_id)
        if dialog:
            dia = dialog.to_dict()
            dia["kb_ids"], dia["kb_names"] = await KnowledgebaseService.get_kb_names(dia["kb_ids"])
            agent.agent_config["dialog_config"] = dia
        result = agent.to_dict()
        result["local_url"] = f"{app_config.SERVICE_API_URL_BASE}/rag/agent/{agent_id}"
        return result

    @agent_rt.put("/agent/{agent_id}")
    @transactional
    async def update_agent(self, agent_id: str, data: AgentModel, current_user=Depends(login_manager)):
        """Update an existing agent"""
        tenant_id = current_user.current_tenant_id
        tenant = await TenantService.get_by_id(tenant_id)
        if not tenant:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Tenant not found!")

        agent = await AgentService.get_agent(agent_id)
        if agent is None:
            raise BusinessError(ServiceErrorCode.AGENT_NOT_FOUND, f"agent_id={agent_id}")

        if agent.tenant_id != tenant_id:
            raise BusinessError(ServiceErrorCode.AGENT_NOT_ALLOWED_OPERATE)

        if data.name is not None:
            agent.name = data.name
        if data.description is not None:
            agent.description = data.description
        if data.icon is not None:
            agent.icon = data.icon
        if data.status is not None:
            agent.status = data.status
        if data.version is not None:
            agent.version = data.version
        if data.url is not None:
            agent.url = data.url
        if data.documentation_url is not None:
            agent.documentation_url = data.documentation_url
        if data.default_input_modes is not None:
            agent.default_input_modes = data.default_input_modes
        if data.default_output_modes is not None:
            agent.default_output_modes = data.default_output_modes
        if data.authentication is not None:
            agent.authentication = data.authentication
        if data.provider is not None:
            agent.provider = data.provider
        if data.capabilities is not None:
            agent.capabilities = data.capabilities
        if data.skills is not None:
            agent.skills = data.skills

        agent_config = data.agent_config
        if agent_config is not None:
            dialog_id = agent_config.get("dialog_id", None)
            dialog_config = agent_config.get("dialog_config", {})
            if dialog_id and dialog_config:
                kbs = await KnowledgebaseService.find_by_ids(dialog_config.get("kb_ids", []))
                embd_ids = [TenantLLMService.split_model_name_and_factory(kb.embd_id)[0] for kb in
                            kbs]  # remove vendor suffix for comparison
                embd_count = len(set(embd_ids))
                if embd_count > 1:
                    raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR,
                                        description=f'Datasets use different embedding models: {[kb.embd_id for kb in kbs]}"')

                dialog = DialogService.make_dialog(dialog_config, tenant)
                dialog.id = dialog_id
                dialog.agent_id = agent_id
                await DialogService.save_or_update_entity(dialog)

                del agent_config["dialog_config"]
            agent.agent_config = agent_config

        agent.updated_by = current_user.id

        result = (await AgentService.save_or_update_entity(agent)).to_dict()
        dialog = await DialogService.get_or_none(agent_id=agent_id)
        if dialog:
            dia = dialog.to_dict()
            dia["kb_ids"], dia["kb_names"] = await KnowledgebaseService.get_kb_names(dia["kb_ids"])
            result["agent_config"]["dialog_config"] = dia
        return result

    @agent_rt.delete("/agent/{agent_id}")
    @transactional
    async def delete_agent(self, agent_id: str, current_user=Depends(login_manager)):
        """Delete an agent"""
        tenant_id = current_user.current_tenant_id
        agent = await AgentService.get_agent(agent_id)

        if agent and agent.tenant_id == tenant_id:
            await DialogService.filter_delete([Dialog.agent_id == agent_id])
            await APIKeyService.filter_delete([APIToken.agent_id == agent_id])
            await AgentService.delete_by_id(agent_id)
            return {"result": "success"}
        else:
            raise BusinessError(ServiceErrorCode.AGENT_NOT_ALLOWED_OPERATE)

    @agent_rt.post("/agent/{agent_id}")
    @transactional
    async def process_request(self, request: Request, agent_id: str, data: A2AModel):
        agent = await AgentService.get_agent(agent_id)
        if agent is None:
            raise BusinessError(ServiceErrorCode.AGENT_NOT_FOUND, f"Agent not found, agent_id={agent_id}")

        if agent.status != "active":
            return {"status": 403}

        dialog_id = agent.agent_config['dialog_id']
        if dialog_id is None:
            # 从dialogs表格查找
            dialog = await DialogService.get_or_none(agent_id=agent_id)
            if dialog is not None:
                dialog_id = dialog.id

        if dialog_id is None:
            raise BusinessError(ServiceErrorCode.NOT_FOUND, f"Dialog not found, dialog_id={dialog_id}")

        if agent.authentication is not None:
            authentication = AgentAuthentication(**agent.authentication)
            apikey = await APIKeyService.get_or_none(agent_id=agent_id)
            if apikey is not None:
                if authentication.schemes is not None:
                    for scheme in authentication.schemes:
                        if scheme == "apiKey":
                            token = request.headers.get('X-API-Key')
                            if not token:
                                raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION,
                                                    "Authorization header is missing")

                            if token != apikey.apikey:
                                raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION,
                                                    f"Authentication error: API key {token} is invalid!")
                            # success
                            break

                        if scheme == "bearer":
                            token = request.headers.get('Authorization')
                            if token:
                                token = token.split()[1]
                            else:
                                raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION,
                                                    "Authorization header is missing")
                            if not token:
                                raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION,
                                                    "Authorization header is missing")

                            if token != apikey.apikey:
                                raise BusinessError(ServiceErrorCode.NO_AUTHORIZATION,
                                                    f"Authentication error: API key {token} is invalid!")
                            # success
                            break

        task_manager = RagAgentTaskManager(agent.id, dialog_id, notification_sender_auth)
        server = A2AServer(agent_id, task_manager)
        return await server.process_request(request)

    @agent_rt.get("/agent/{agent_id}/logs")
    @transactional
    async def get_agent_logs(self, agent_id: str, page: int = 1, page_size: int = 15,
                             orderby: str = "created_at", desc: bool = True, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        agent = await AgentService.get_agent(agent_id)
        if agent is None:
            raise BusinessError(ServiceErrorCode.AGENT_NOT_FOUND, f"agent_id={agent_id}")

        if agent.tenant_id != tenant_id:
            raise BusinessError(ServiceErrorCode.AGENT_NOT_ALLOWED_OPERATE)

        logs, total = await AgentTaskService.find_by_agent_id(agent_id, page, page_size, orderby, desc)
        return {"count": total, "data": logs}

    @agent_rt.get("/agent/{agent_id}/.well-known/jwks.json")
    async def get_jwks(self, agent_id: str):
        return notification_sender_auth.handle_jwks_endpoint()

    @agent_rt.get("/agent/{agent_id}/.well-known/agent.json", response_model=AgentCard)
    @transactional
    async def get_agent_card(self, agent_id: str):
        agent = await AgentService.get_agent(agent_id)
        if agent is None:
            raise BusinessError(ServiceErrorCode.AGENT_NOT_FOUND, f"agent_id={agent_id}")

        agent_card = {
            "name": agent.name,
            "description": agent.description,
            "url": agent.url if agent.url else f"{app_config.SERVICE_API_URL_BASE}/rag/agent/{agent_id}",
            "version": agent.version,
            "capabilities": agent.capabilities,
            "provider": agent.provider,
            "authentication": agent.authentication,
            "skills": agent.skills,
            "documentationUrl": agent.documentation_url
        }

        card = AgentCard(**agent_card)
        if agent.default_input_modes is not None:
            card.defaultInputModes = agent.default_input_modes
        if agent.default_output_modes is not None:
            card.defaultOutputModes = agent.default_output_modes
        return card
