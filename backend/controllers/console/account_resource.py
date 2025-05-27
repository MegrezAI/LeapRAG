from datetime import datetime, UTC

from fastapi import APIRouter, Depends, Request
from fastapi_utils.cbv import cbv
from pydantic import BaseModel
from starlette import status
from itsdangerous import URLSafeTimedSerializer
from extensions.ext_login import login_manager
from models import Account, transactional, APIToken
from services.account_loader import AccountLoader
from services.account_service import RegisterService, AccountService, TenantService
from libs.base_error import BusinessError
from typing import cast, Optional
from libs.helper import extract_remote_ip
from services.api_service import APIKeyService
from services.dialog_service import DialogService
from services.knowledgebase_service import KnowledgebaseService
from services.service_error_code import ServiceErrorCode
from services.billing_service import BillingService
import pytz

from fastapi.security import OAuth2PasswordRequestForm
from services.utils import get_uuid

account_rt = APIRouter(prefix="/console")


class RegisterModel(BaseModel):
    email: str
    name: str
    password: str


class LoginModel(BaseModel):
    email: str
    password: str
    remember_me: bool = None
    invite_token: str = None
    language: str = None


class RefreshTokenModel(BaseModel):
    refresh_token: str


class ApiKeyModel(BaseModel):
    source: str
    dialog_id: str = None
    agent_id: str = None


class AccountNameModel(BaseModel):
    username: str


class AccountAvatarModel(BaseModel):
    avatar: str


class AccountInterfaceLanguageModel(BaseModel):
    interface_language: str


class AccountInterfaceThemeModel(BaseModel):
    interface_theme: str


class AccountTimezoneModel(BaseModel):
    timezone: str


class AccountPasswordModel(BaseModel):
    password: str
    new_password: str
    repeat_new_password: str


class AccountDeleteModel(BaseModel):
    token: str
    code: str


class AccountDeleteUpdateFeedbackModel(BaseModel):
    email: str
    feedback: str


class AccountInfoModel(BaseModel):
    id: str = None
    username: str = None
    email: str = None
    status: str = None
    avatar: Optional[str] = None
    interface_language: str = None
    interface_theme: str = None
    timezone: str = None
    last_login_at: Optional[datetime] = None


class TenantInfoModel(BaseModel):
    name: str = None
    asr_id: str = None
    rerank_id: str = None
    embd_id: str = None
    img2txt_id: str = None
    llm_id: str = None
    parser_ids: str = None


@cbv(account_rt)
class AccountRoute:
    @account_rt.post("/account/token")
    @transactional
    async def token(self, request: Request, data: OAuth2PasswordRequestForm = Depends()):
        email = data.username
        password = data.password
        account = await AccountService.authenticate(email, password)
        tenants = await TenantService.get_join_tenants(account)
        if len(tenants) == 0:
            return {
                "result": "fail",
                "data": "workspace not found, please contact system admin to invite you to join in a workspace",
            }

        token_pair = await AccountService.login(account=account, ip_address=extract_remote_ip(request))
        AccountService.reset_login_error_rate_limit(email)
        return {"access_token": token_pair.access_token, "token_type": "bearer"}

    @account_rt.get("/account/current-account")
    async def current_account(self, current_user=Depends(login_manager)) -> dict:
        user_dict = current_user.to_dict()

        tenant_info = await TenantService.get_current_tenant_by_account(current_user)
        tenant_dict = tenant_info.to_dict()

        return {"account": AccountInfoModel(**user_dict), "tenant_info": TenantInfoModel(**tenant_dict)}

    @account_rt.post("/account/register", status_code=status.HTTP_201_CREATED)
    @transactional
    async def register(self, request: Request, data: RegisterModel):
        accounts = await AccountService.query(username=data.name)
        if len(accounts) > 0:
            raise BusinessError(error_code=ServiceErrorCode.DUPLICATED_NAME, description="Duplicated user name")

        accounts = await AccountService.query(email=data.email)
        if len(accounts) > 0:
            raise BusinessError(error_code=ServiceErrorCode.DUPLICATED_EMAIL, description="Duplicated email")

        await RegisterService.register(
            email=data.email, name=data.name, password=data.password, ip_address=extract_remote_ip(request)
        )
        return {"result": "success"}

    @account_rt.post("/account/login")
    @transactional
    async def login(self, request: Request, data: LoginModel):
        email = data.email
        password = data.password
        account = await AccountService.authenticate(email, password)
        tenants = await TenantService.get_join_tenants(account)
        if len(tenants) == 0:
            return {
                "result": "fail",
                "data": "workspace not found, please contact system admin to invite you to join in a workspace",
            }

        token_pair = await AccountService.login(account=account, ip_address=extract_remote_ip(request))
        AccountService.reset_login_error_rate_limit(email)
        return {"result": "success", "data": token_pair.model_dump(exclude_none=True)}

    @account_rt.post('/account/refresh-token')
    @transactional
    async def refresh_token(self, data: RefreshTokenModel):
        refresh_token = data.refresh_token
        new_token_pair = await AccountService.refresh_token(refresh_token)
        return new_token_pair.model_dump(exclude_none=True)

    @account_rt.get("/account/logout")
    async def logout(self, current_user=Depends(login_manager)):
        if current_user is None:
            return {"result": "success"}
        await AccountService.logout(account=current_user)
        return {"result": "success"}

    @account_rt.post("/account/set-tenant-info")
    @transactional
    async def set_tenant_info(self, data: TenantInfoModel, current_user=Depends(login_manager)):
        await TenantService.update_by_id(current_user.current_tenant_id, data.model_dump(exclude_none=True))
        return {"result": "success"}

    @account_rt.post("/account/apikey")
    @transactional
    async def create_apikey(self, data: ApiKeyModel, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        tenant = await TenantService.get_by_id(tenant_id)
        if not tenant:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Tenant not found!")

        t = APIToken()
        t.tenant_id = tenant_id
        t.agent_id = data.agent_id
        serializer = URLSafeTimedSerializer(tenant_id)
        t.apikey = "leapai-" + serializer.dumps(get_uuid(), salt=tenant_id)[2:34]
        t.source = data.source
        t.dialog_id = data.dialog_id

        key_info = (await APIKeyService.save_or_update_entity(t)).to_dict()
        if data.dialog_id is not None:
            dialog = await DialogService.get_by_id(data.dialog_id)
            if dialog:
                dia = dialog.to_dict()
                dia["kb_ids"], dia["kb_names"] = await KnowledgebaseService.get_kb_names(dia["kb_ids"])
                key_info["dialog_config"] = dia
        return key_info

    @account_rt.get("/account/apikey")
    async def get_apikey(self, agent_id: str = None, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        if agent_id:
            return await APIKeyService.query(agent_id=agent_id)
        else:
            return await APIKeyService.query(tenant_id=tenant_id)

    @account_rt.get("/account/apikey/{apikey}")
    async def get_apikey_info(self, apikey: str, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        t = await APIKeyService.get_or_none(tenant_id=tenant_id, apikey=apikey)
        if t is None or t.dialog_id is None:
            return t
        key_info = t.to_dict()
        dialog = await DialogService.get_by_id(t.dialog_id)
        if dialog:
            dia = dialog.to_dict()
            dia["kb_ids"], dia["kb_names"] = await KnowledgebaseService.get_kb_names(dia["kb_ids"])
            key_info["dialog_config"] = dia
        return key_info

    @account_rt.put("/account/apikey/{apikey}")
    @transactional
    async def update_apikey(self, apikey: str, data: ApiKeyModel, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        t = await APIKeyService.get(tenant_id=tenant_id, apikey=apikey)
        t.source = data.source
        t.dialog_id = data.dialog_id
        return (await APIKeyService.save_or_update_entity(t)).to_dict()

    @account_rt.delete("/account/apikey/{apikey}")
    @transactional
    async def delete_apikey(self, apikey: str, current_user=Depends(login_manager)):
        tenant_id = current_user.current_tenant_id
        t = await APIKeyService.get_or_none(tenant_id=tenant_id, apikey=apikey)
        if t is None:
            return 0
        return await APIKeyService.filter_delete([APIToken.tenant_id == tenant_id, APIToken.apikey == apikey])

    @account_rt.post("/account/username")
    @transactional
    async def update_username(self, data: AccountNameModel, current_user=Depends(login_manager)):
        username = data.username
        accounts = await AccountService.query(username=username)
        if len(accounts) > 0:
            raise BusinessError(error_code=ServiceErrorCode.DUPLICATED_NAME)

        if len(username) < 3 or len(username) > 30:
            raise ValueError("Account name must be between 3 and 30 characters.")

        await AccountService.update_by_id(current_user.id, {"username": username})
        current_user = await AccountLoader.load_user_mem(current_user.id)
        tenant_info = await TenantService.get_current_tenant_by_account(current_user)
        return {
            "account": AccountInfoModel(**current_user.to_dict()),
            "tenant_info": TenantInfoModel(**tenant_info.to_dict())
        }

    @account_rt.post("/account/avatar")
    @transactional
    async def update_avatar(self, data: AccountAvatarModel, current_user=Depends(login_manager)):
        await AccountService.update_by_id(current_user.id, {"avatar": data.avatar})
        current_user = await AccountLoader.load_user_mem(current_user.id)
        tenant_info = await TenantService.get_current_tenant_by_account(current_user)
        return {
            "account": AccountInfoModel(**current_user.to_dict()),
            "tenant_info": TenantInfoModel(**tenant_info.to_dict())
        }

    @account_rt.post("/account/interface-language")
    @transactional
    async def update_interface_language(self, data: AccountInterfaceLanguageModel, current_user=Depends(login_manager)):
        language = data.interface_language
        await AccountService.update_by_id(current_user.id, {"interface_language": language})
        current_user = await AccountLoader.load_user_mem(current_user.id)
        tenant_info = await TenantService.get_current_tenant_by_account(current_user)
        return {
            "account": AccountInfoModel(**current_user.to_dict()),
            "tenant_info": TenantInfoModel(**tenant_info.to_dict())
        }

    @account_rt.post("/account/interface-theme")
    @transactional
    async def update_interface_theme(self, data: AccountInterfaceThemeModel, current_user=Depends(login_manager)):
        theme = data.interface_theme
        await AccountService.update_by_id(current_user.id, {"interface_theme": theme})
        current_user = await AccountLoader.load_user_mem(current_user.id)
        tenant_info = await TenantService.get_current_tenant_by_account(current_user)
        return {
            "account": AccountInfoModel(**current_user.to_dict()),
            "tenant_info": TenantInfoModel(**tenant_info.to_dict())
        }

    @account_rt.post("/account/timezone")
    @transactional
    async def update_timezone(self, data: AccountTimezoneModel, current_user=Depends(login_manager)):
        timezone = data.timezone
        if timezone not in pytz.all_timezones:
            raise BusinessError(error_code=ServiceErrorCode.ARGUMENT_ERROR, description="Invalid timezone string.")

        await AccountService.update_by_id(current_user.id, {"timezone": timezone})
        current_user = await AccountLoader.load_user_mem(current_user.id)
        tenant_info = await TenantService.get_current_tenant_by_account(current_user)
        return {
            "account": AccountInfoModel(**current_user.to_dict()),
            "tenant_info": TenantInfoModel(**tenant_info.to_dict())
        }

    @account_rt.post("/account/password")
    @transactional
    async def update_password(self, data: AccountPasswordModel, current_user=Depends(login_manager)):
        if data.new_password != data.repeat_new_password:
            raise BusinessError(error_code=ServiceErrorCode.REPEAT_PASSWORD_NOT_MATCH)

        await AccountService.update_account_password(current_user, data.password, data.new_password)
        return {"result": "success"}

    @account_rt.get("/account/integrate")
    @transactional
    async def get_integrate(self, request: Request, current_user=Depends(login_manager)):
        account_integrates = await AccountService.get_account_integrate(current_user.id)

        base_url = f"{request.url.scheme}://{request.url.hostname}"
        print(f"base_url={base_url}")
        oauth_base_path = "/api/console/account/oauth"
        providers = ["github", "google"]

        integrate_data = []
        for provider in providers:
            existing_integrate = next((ai for ai in account_integrates if ai.provider == provider), None)
            if existing_integrate:
                integrate_data.append(
                    {
                        "id": existing_integrate.id,
                        "provider": provider,
                        "created_at": existing_integrate.created_at,
                        "is_bound": True,
                        "link": None,
                    }
                )
            else:
                integrate_data.append(
                    {
                        "id": None,
                        "provider": provider,
                        "created_at": None,
                        "is_bound": False,
                        "link": f"{base_url}{oauth_base_path}/{provider}",
                    }
                )

        return integrate_data

    @account_rt.get("/account/delete-verify")
    async def get_delete_verify(self, current_user=Depends(login_manager)):
        token, code = await AccountService.generate_account_deletion_verification_code(current_user)
        await AccountService.send_account_deletion_verification_email(current_user, code)
        return token

    @account_rt.post("/account/delete")
    async def delete_account(self, data: AccountDeleteModel, current_user=Depends(login_manager)):
        if not AccountService.verify_account_deletion_code(data.token, data.code):
            raise BusinessError(error_code=ServiceErrorCode.INVALID_ACCOUNT_DELETE_CODE)

        await AccountService.delete_account(current_user)
        return {"result": "success"}

    @account_rt.post("/account/delete-update-feedback")
    async def update_delete_feedback(self, data: AccountDeleteUpdateFeedbackModel, current_user=Depends(login_manager)):
        await BillingService.update_account_deletion_feedback(data.email, data.feedback)
        return {"result": "success"}
