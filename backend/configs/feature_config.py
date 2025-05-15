from typing import Annotated, Literal, Optional

from pydantic import (
    Field,
    PositiveInt, PositiveFloat,
)
from pydantic_settings import BaseSettings


class SystemConfig(BaseSettings):
    SERVICE_API_URL_BASE: str = Field(
        description="the service base url",
        default="",
    )

    SERVICE_HTTP_PORT: PositiveInt = Field(
        description="Port number on which the server is listening",
        default=5001,
    )

    SECRET_KEY: str = Field(
        description="Secret key for secure session cookie signing."
                    "Make sure you are changing this key for your deployment with a strong key."
                    "Generate a strong key using `openssl rand -base64 42` or set via the `SECRET_KEY` environment variable.",
        default="",
    )

    RESET_PASSWORD_TOKEN_EXPIRY_MINUTES: PositiveInt = Field(
        description="Duration in minutes for which a password reset token remains valid",
        default=5,
    )

    LOGIN_DISABLED: bool = Field(
        description="Whether to disable login checks",
        default=False,
    )

    ADMIN_API_KEY_ENABLE: bool = Field(
        description="Whether to enable admin api key for authentication",
        default=False,
    )

    ADMIN_API_KEY: Optional[str] = Field(
        description="admin api key for authentication",
        default=None,
    )

    DEBUG: bool = Field(
        description="Whether to enable debug mode.",
        default=False,
    )


class LoginConfig(BaseSettings):
    ENABLE_EMAIL_CODE_LOGIN: bool = Field(
        description="whether to enable email code login",
        default=False,
    )
    ENABLE_EMAIL_PASSWORD_LOGIN: bool = Field(
        description="whether to enable email password login",
        default=True,
    )
    ENABLE_SOCIAL_OAUTH_LOGIN: bool = Field(
        description="whether to enable github/google oauth login",
        default=False,
    )
    EMAIL_CODE_LOGIN_TOKEN_EXPIRY_MINUTES: PositiveInt = Field(
        description="expiry time in minutes for email code login token",
        default=5,
    )
    ALLOW_REGISTER: bool = Field(
        description="whether to enable register",
        default=False,
    )
    ALLOW_CREATE_WORKSPACE: bool = Field(
        description="whether to enable create workspace",
        default=False,
    )


class AccountConfig(BaseSettings):
    ACCOUNT_DELETION_TOKEN_EXPIRY_MINUTES: PositiveInt = Field(
        description="Duration in minutes for which a account deletion token remains valid",
        default=5,
    )
    REFRESH_TOKEN_EXPIRE_DAYS: PositiveFloat = Field(
        description="Expiration time for refresh tokens in days",
        default=30,
    )


class MailConfig(BaseSettings):
    """
    Configuration for email services
    """

    MAIL_TYPE: Optional[str] = Field(
        description="Email service provider type ('smtp' or 'resend'), default to None.",
        default=None,
    )


class FeatureConfig(
    SystemConfig,
    MailConfig,
    LoginConfig,
    AccountConfig,
):
    pass
