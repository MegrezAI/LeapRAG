from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, APIKeyHeader
from starlette import status
from configs import app_config
from libs.base_error import BaseErrorCode
from services.account_loader import AccountLoader
from fastapi_login import LoginManager
from starlette.responses import JSONResponse


class NotAuthenticatedException(Exception):
    pass


# these two argument are mandatory
def not_authenticated_handler(request, exc):
    return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED,
                        content={'error_code': BaseErrorCode.UNAUTHORIZED, 'message': "unauthorized"})


login_manager = LoginManager(app_config.SECRET_KEY,
                             token_url='/api/console/account/token',
                             not_authenticated_exception=NotAuthenticatedException)


@login_manager.user_loader()
async def load_user(user_id: str):
    return await AccountLoader.load_user_mem(user_id=user_id)


async def jwt_auth(auth: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))):
    return await login_manager.get_current_user(auth.credentials) if auth else None


async def key_auth(api_key=Depends(APIKeyHeader(name='X-API-Key', auto_error=False))):
    return await AccountLoader.load_api_token(api_key) if api_key else None


async def jwt_or_key_auth(jwt_result=Depends(jwt_auth), key_result=Depends(key_auth)):
    if jwt_result:
        return jwt_result

    if key_result:
        user_id = await AccountLoader.load_user_id(key_result.tenant_id)
        if user_id:
            return await AccountLoader.load_user_mem(user_id=user_id)

    raise NotAuthenticatedException()


def init_app(app):
    app.add_exception_handler(NotAuthenticatedException, not_authenticated_handler)
