from .account import (
    Account,
    Tenant,
    TenantAccountJoin,
    AccountIntegrate,
    InvitationCode,
    TenantPluginPermission,
    AccountStatus,
    TenantStatus,
    TenantAccountRole,
    TenantAccountJoinRole
)

from .agent import (
    Agent,
    AgentLog,
    AgentTask
)

from .conversation import (
    Dialog,
    Conversation
)

from .llm import (
    LLM,
    LLMFactory,
    TenantLLM
)

from .knowledgebase import (
    Task,
    Knowledgebase,
    Document,
    File,
    File2Document,
)

from .api_key import (
    APIKey,
    API4Conversation,
)

from .database import Base, transactional, get_current_session

from enum import Enum
from enum import IntEnum
from strenum import StrEnum

__all__ = [
    'transactional',
    'get_current_session',
    'StatusEnum',
    'LLMType',
    'FileSource',
    'FileType',
    'TaskStatus',
    'Account',
    'Tenant',
    "Agent",
    "AgentLog",
    "AgentTask",
    'TenantAccountJoin',
    'AccountIntegrate',
    'InvitationCode',
    'TenantPluginPermission',
    'AccountStatus',
    'TenantStatus',
    'TenantAccountRole',
    'TenantAccountJoinRole',
    'Dialog',
    'Conversation',
    'LLM',
    'LLMFactory',
    'TenantLLM',
    'Task',
    'Knowledgebase',
    'Document',
    'File',
    'File2Document',
    'APIKey',
    'API4Conversation'
]


class StatusEnum(Enum):
    VALID = "1"
    INVALID = "0"


class TenantPermission(StrEnum):
    ME = 'me'
    TEAM = 'team'


class SerializedType(IntEnum):
    PICKLE = 1
    JSON = 2


class FileType(StrEnum):
    PDF = 'pdf'
    DOC = 'doc'
    VISUAL = 'visual'
    AURAL = 'aural'
    VIRTUAL = 'virtual'
    FOLDER = 'folder'
    OTHER = "other"


class LLMType(StrEnum):
    CHAT = 'chat'
    EMBEDDING = 'embedding'
    SPEECH2TEXT = 'speech2text'
    IMAGE2TEXT = 'image2text'
    RERANK = 'rerank'
    TTS = 'tts'


class ChatStyle(StrEnum):
    CREATIVE = 'Creative'
    PRECISE = 'Precise'
    EVENLY = 'Evenly'
    CUSTOM = 'Custom'


class TaskStatus(StrEnum):
    UNSTART = "0"
    RUNNING = "1"
    CANCEL = "2"
    DONE = "3"
    FAIL = "4"


class FileSource(StrEnum):
    LOCAL = ""
    KNOWLEDGEBASE = "knowledgebase"
    S3 = "s3"


class CanvasType(StrEnum):
    ChatBot = "chatbot"
    DocBot = "docbot"


KNOWLEDGEBASE_FOLDER_NAME = ".knowledgebase"
