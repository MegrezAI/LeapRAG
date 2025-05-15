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
    logged_in_account = await AccountLoader.load_user_mem(user_id=user_id)
    return logged_in_account


def init_app(app):
    app.add_exception_handler(NotAuthenticatedException, not_authenticated_handler)
