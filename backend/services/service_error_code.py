from enum import Enum


class ServiceErrorCode(str, Enum):
    # 安装相关错误
    ALREADY_SETUP = "already_setup"
    NOT_SETUP = "not_setup"
    NOT_INIT_VALIDATED = "not_init_validated"
    INIT_VALIDATE_FAILED = "init_validate_failed"
    DUPLICATED_NAME = "duplicated_name"
    DUPLICATED_EMAIL = "duplicated_email"

    # 文件相关错误
    FILE_TOO_LARGE = "file_too_large"
    UNSUPPORTED_FILE_TYPE = "unsupported_file_type"
    TOO_MANY_FILES = "too_many_files"
    NO_FILE_UPLOADED = "no_file_uploaded"

    REPEAT_PASSWORD_NOT_MATCH = "repeat_password_not_match"
    CURRENT_PASSWORD_INCORRECT = "current_password_incorrect"
    INVALID_INVITATION_CODE = "invalid_invitation_code"
    INVALID_ACCOUNT_DELETE_CODE = "invalid_account_delete_code"

    ACCOUNT_BANNED = "account_banned"
    ACCOUNT_REGISTER_ERROR = "account_register_error"
    ACCOUNT_LOGIN_ERROR = "account_login_error"
    ACCOUNT_PASSWORD_ERROR = "account_password_error"

    ACCOUNT_NOT_LINK_TENANT = "account_not_link_tenant"
    ALREADY_ACTIVATE = "already_activate"
    ACCOUNT_NOT_FOUND = "account_not_found"
    ACCOUNT_IN_FREEZE = "account_in_freeze"

    # 租户相关错误
    LINK_ACCOUNT_INTEGRATE_ERROR = "link_account_integrate_error"
    TENANT_NOT_FOUND = "tenant_not_found"
    ACCOUNT_ALREADY_IN_TENANT = "account_already_in_tenant"

    # 权限相关错误
    INVALID_ACTION = "invalid_action"
    CANNOT_OPERATE_SELF = "cannot_operate_self"
    NO_PERMISSION = "no_permission"
    MEMBER_NOT_IN_TENANT = "member_not_in_tenant"
    ROLE_ALREADY_ASSIGNED = "role_already_assigned"

    # 限制相关错误
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    WORKSPACE_NOT_ALLOWED_CREATE_ERROR = "workspace_not_allowed_create_error"
    WORKSPACE_NOT_FOUND_ERROR = "workspace_not_found_error"

    # 邮件相关错误
    EMAIL_SEND_IP_LIMIT = "email_send_ip_limit"
    EMAIL_CODE_ERROR = "email_code_error"
    EMAIL_CODE_LOGIN_LIMIT = "email_code_login_limit"
    EMAIL_CODE_LOGIN_RATE_LIMIT_EXCEEDED = "email_code_login_rate_limit_exceeded"
    EMAIL_CODE_ACCOUNT_DELETION_RATE_LIMIT_EXCEEDED = "email_code_account_deletion_rate_limit_exceeded"
    EMAIL_PASSWORD_RESET_LIMIT = "email_password_reset_limit"

    # 认证相关错误
    UNAUTHORIZED_AND_FORCE_LOGOUT = "unauthorized_and_force_logout"
    AUTH_FAILED = "auth_failed"
    INVALID_EMAIL = "invalid_email"
    PASSWORD_MISMATCH = "password_mismatch"
    INVALID_OR_EXPIRED_TOKEN = "invalid_or_expired_token"
    PASSWORD_RESET_RATE_LIMIT_EXCEEDED = "password_reset_rate_limit_exceeded"
    EMAIL_OR_PASSWORD_MISMATCH = "email_or_password_mismatch"

    # 应用相关错误
    AGENT_NOT_FOUND = "agent_not_found"
    AGENT_NOT_ALLOWED_OPERATE = "agent_not_allowed_operate"

    # rag相关错误
    INVALID_NAME = "invalid_name"
    NOT_FOUND = "not_found"
    DOWNLOAD_ERROR = "download_error"
    FILE_NOT_FOUND = "file_not_found"
    ARGUMENT_ERROR = "argument_error"
    FOLDER_NOT_FOUND = "folder_not_found"
    MAX_FILE_NUM_PER_USER = "max_file_num_per_user"
    NOT_SUPPORT = "not_support"
    NO_AUTHORIZATION = "no_authorization"
    INVALID_LLM = "invalid_llm"
