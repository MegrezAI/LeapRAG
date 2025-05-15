import logging
from collections.abc import Generator

from minio import Minio, S3Error
from io import BytesIO
from configs import app_config
from extensions.storage.base_storage import BaseStorage


class MinIOStorage(BaseStorage):
    """Implementation for Aliyun OSS storage."""

    def __init__(self):
        super().__init__()
        self.bucket_name = app_config.MINIO_BUCKET
        self.client = Minio(app_config.MINIO_ENDPOINT,
                            access_key=app_config.MINIO_USER,
                            secret_key=app_config.MINIO_PASSWORD,
                            secure=False)

    def save(self, filename, binary):
        if not self.client.bucket_exists(self.bucket_name):
            self.client.make_bucket(self.bucket_name)
        self.client.put_object(self.bucket_name, filename, BytesIO(binary), len(binary))

    def load_once(self, filename: str) -> bytes:
        obj = self.client.get_object(self.bucket_name, filename)
        data: bytes = obj.read()
        return data

    def load_stream(self, filename: str) -> Generator:
        obj = self.client.get_object(self.bucket_name, filename)
        while chunk := obj.read(4096):
            yield chunk

    def download(self, filename: str, target_filepath):
        self.client.fget_object(self.bucket_name, filename, target_filepath)

    def exists(self, filename: str):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                return False
            return self.client.stat_object(self.bucket_name, filename)
        except S3Error as e:
            if e.code in ["NoSuchKey", "NoSuchBucket", "ResourceNotFound"]:
                return False
        except Exception:
            logging.exception(f"obj_exist {self.bucket_name}/{filename} got exception")
            return False

    def delete(self, filename: str):
        self.client.remove_object(self.bucket_name, filename)
