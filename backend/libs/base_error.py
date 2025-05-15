from typing import Optional
from enum import Enum

class BaseErrorCode(str, Enum):
    UNKNOWN = "unknown"
    INVALID_PARAMETER = "invalid_parameter"
    QUOTA_EXCEEDED = "quota_exceeded"
    RATE_LIMIT_ERROR = "rate_limit_error"
    UNAUTHORIZED = "unauthorized"

class BusinessError(Exception):
    error_code: BaseErrorCode = BaseErrorCode.UNKNOWN
    data: Optional[dict] = None
    description: str = None

    def __init__(self, error_code: str, description: str = None, data: Optional[dict] = None):
        super().__init__(description)
        self.data = data
        self.error_code = error_code
        self.description = description
        
class QuotaExceededError(BusinessError):
    """
    Custom exception raised when the quota for a provider has been exceeded.
    """
    description = "Quota Exceeded"

    def __init__(self, description: str = None, data: Optional[dict] = None):
        super().__init__(error_code=BaseErrorCode.QUOTA_EXCEEDED, description=description, data=data)

class RateLimitError(BusinessError):
    """Raised when the Invoke returns rate limit error."""

    description = "Rate Limit Error"

    def __init__(self, description: str = None, data: Optional[dict] = None):
        super().__init__(error_code=BaseErrorCode.RATE_LIMIT_ERROR, description=description, data=data)
