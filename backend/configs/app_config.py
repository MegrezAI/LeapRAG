from typing import Optional

from pydantic import Field, PositiveFloat
from pydantic_settings import SettingsConfigDict

from .es_config import ESConfig
from .feature_config import FeatureConfig
from .redis_config import RedisConfig
from .database_config import DatabaseConfig
from .storage.aliyun_oss_storage_config import AliyunOSSStorageConfig
from .storage.amazon_s3_storage_config import S3StorageConfig
from .storage.azure_blob_storage_config import AzureBlobStorageConfig
from .storage.baidu_obs_storage_config import BaiduOBSStorageConfig
from .storage.google_cloud_storage_config import GoogleCloudStorageConfig
from .storage.huawei_obs_storage_config import HuaweiCloudOBSStorageConfig
from .storage.minio_storage_config import MinIOStorageConfig
from .storage.oci_storage_config import OCIStorageConfig
from .storage.opendal_storage_config import OpenDALStorageConfig
from .storage.supabase_storage_config import SupabaseStorageConfig
from .storage.tencent_cos_storage_config import TencentCloudCOSStorageConfig
from .storage.volcengine_tos_storage_config import VolcengineTOSStorageConfig
from .storage_config import StorageConfig


class AppConfig(DatabaseConfig,
                RedisConfig,
                ESConfig,
                FeatureConfig,
                StorageConfig,
                MinIOStorageConfig,
                AliyunOSSStorageConfig,
                AzureBlobStorageConfig,
                BaiduOBSStorageConfig,
                GoogleCloudStorageConfig,
                HuaweiCloudOBSStorageConfig,
                OCIStorageConfig,
                OpenDALStorageConfig,
                S3StorageConfig,
                SupabaseStorageConfig,
                TencentCloudCOSStorageConfig,
                VolcengineTOSStorageConfig,
                ):
    model_config = SettingsConfigDict(
        # read from dotenv format config file
        env_file=".env",
        env_file_encoding="utf-8",
        # ignore extra attributes
        extra="ignore",
    )
