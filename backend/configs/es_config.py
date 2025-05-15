from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class ESConfig(BaseSettings):
    """
    Configuration settings for ES connection
    """

    ES_HOSTS: str = Field(
        description="Hostname or IP address of the ES hosts",
        default="localhost",
    )

    ES_USERNAME: Optional[str] = Field(
        description="Username for ES authentication (if required)",
        default=None,
    )

    ES_PASSWORD: Optional[str] = Field(
        description="Password for ES authentication (if required)",
        default=None,
    )
