from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings

class StorageConfig(BaseSettings):
    STORAGE_TYPE: Literal[
        "opendal",
        "s3",
        "aliyun-oss",
        "azure-blob",
        "baidu-obs",
        "google-storage",
        "huawei-obs",
        "oci-storage",
        "tencent-cos",
        "volcengine-tos",
        "supabase",
        "local",
        "minio",
    ] = Field(
        description="Type of storage to use."
        " Options: 'opendal', '(deprecated) local', 's3', 'aliyun-oss', 'azure-blob', 'baidu-obs', 'google-storage', "
        "'huawei-obs', 'oci-storage', 'tencent-cos', 'volcengine-tos', 'supabase'. Default is 'opendal'.",
        default="opendal",
    )

    STORAGE_LOCAL_PATH: str = Field(
        description="Path for local storage when STORAGE_TYPE is set to 'local'.",
        default="storage",
        deprecated=True,
    )
