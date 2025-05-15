from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class MinIOStorageConfig(BaseSettings):

    MINIO_USER: Optional[str] = Field(
        description="MINIO_USER",
        default="leapai",
    )

    MINIO_PASSWORD: Optional[str] = Field(
        description="MINIO_PASSWORD",
        default="leapai_minio",
    )

    MINIO_ENDPOINT: Optional[str] = Field(
        description="MINIO_ENDPOINT",
        default="localhost:9000",
    )

    MINIO_BUCKET: Optional[str] = Field(
        description="MINIO_BUCKET",
        default="leapragagent",
    )
