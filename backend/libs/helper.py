import json
import logging
import re
import subprocess
import time
import uuid
import datetime
from typing import Any, Optional, Union, cast
from models.database import Base
from configs import app_config
from extensions.ext_redis import redis_client
from models.account import Account


def run(script):
    return subprocess.getstatusoutput("source /root/.bashrc && " + script)


def email(email):
    # Define a regex pattern for email addresses
    pattern = r"^[\w\.!#$%&'*+\-/=?^_`{|}~]+@([\w-]+\.)+[\w-]{2,}$"
    # Check if the email matches the pattern
    if re.match(pattern, email) is not None:
        return email

    error = "{email} is not a valid email.".format(email=email)
    raise ValueError(error)


def object_to_json(obj):
    if isinstance(obj, Base):
        data = {}
        for column in obj.__table__.columns:
            value = getattr(obj, column.name)
            if isinstance(value, datetime.datetime):
                value = value.isoformat()
            data[column.name] = value
        return json.dumps(data)
    else:
        return json.dumps(obj)


def json_to_object(json_str):
    return json.loads(json_str)


def extract_remote_ip(request) -> str:
    if request.headers.get("CF-Connecting-IP"):
        return cast(str, request.headers.get("Cf-Connecting-Ip"))
    elif request.headers.getlist("X-Forwarded-For"):
        return cast(str, request.headers.getlist("X-Forwarded-For")[0])
    else:
        return cast(str, request.client.host)


class TokenManager:
    @classmethod
    def generate_token(
            cls,
            token_type: str,
            account: Optional["Account"] = None,
            email: Optional[str] = None,
            additional_data: Optional[dict] = None,
    ) -> str:
        if account is None and email is None:
            raise ValueError("Account or email must be provided")

        account_id = account.id if account else None
        account_email = account.email if account else email

        if account_id:
            old_token = cls._get_current_token_for_account(account_id, token_type)
            if old_token:
                if isinstance(old_token, bytes):
                    old_token = old_token.decode("utf-8")
                cls.revoke_token(old_token, token_type)

        token = str(uuid.uuid4())
        token_data = {"account_id": account_id, "email": account_email, "token_type": token_type}
        if additional_data:
            token_data.update(additional_data)

        expiry_minutes = app_config.model_dump(exclude_none=True).get(f"{token_type.upper()}_TOKEN_EXPIRY_MINUTES")
        if expiry_minutes is None:
            raise ValueError(f"Expiry minutes for {token_type} token is not set")
        token_key = cls._get_token_key(token, token_type)
        expiry_time = int(expiry_minutes * 60)
        redis_client.setex(token_key, expiry_time, json.dumps(token_data))

        if account_id:
            cls._set_current_token_for_account(account_id, token, token_type, expiry_minutes)

        return token

    @classmethod
    def _get_token_key(cls, token: str, token_type: str) -> str:
        return f"{token_type}:token:{token}"

    @classmethod
    def revoke_token(cls, token: str, token_type: str):
        token_key = cls._get_token_key(token, token_type)
        redis_client.delete(token_key)

    @classmethod
    def get_token_data(cls, token: str, token_type: str) -> Optional[dict[str, Any]]:
        key = cls._get_token_key(token, token_type)
        token_data_json = redis_client.get(key)
        if token_data_json is None:
            logging.info(f"{token_type} token {token} not found with key {key}")
            return None
        token_data: Optional[dict[str, Any]] = json.loads(token_data_json)
        return token_data

    @classmethod
    def _get_current_token_for_account(cls, account_id: str, token_type: str) -> Optional[str]:
        key = cls._get_account_token_key(account_id, token_type)
        current_token: Optional[str] = redis_client.get(key)
        return current_token

    @classmethod
    def _set_current_token_for_account(
            cls, account_id: str, token: str, token_type: str, expiry_hours: Union[int, float]
    ):
        key = cls._get_account_token_key(account_id, token_type)
        expiry_time = int(expiry_hours * 60 * 60)
        redis_client.setex(key, expiry_time, token)

    @classmethod
    def _get_account_token_key(cls, account_id: str, token_type: str) -> str:
        return f"{token_type}:account:{account_id}"


class RateLimiter:
    def __init__(self, prefix: str, max_attempts: int, time_window: int):
        self.prefix = prefix
        self.max_attempts = max_attempts
        self.time_window = time_window

    def _get_key(self, email: str) -> str:
        return f"{self.prefix}:{email}"

    def is_rate_limited(self, email: str) -> bool:
        key = self._get_key(email)
        current_time = int(time.time())
        window_start_time = current_time - self.time_window

        redis_client.zremrangebyscore(key, "-inf", window_start_time)
        attempts = redis_client.zcard(key)

        if attempts and int(attempts) >= self.max_attempts:
            return True
        return False

    def increment_rate_limit(self, email: str):
        key = self._get_key(email)
        current_time = int(time.time())

        redis_client.zadd(key, {current_time: current_time})
        redis_client.expire(key, self.time_window * 2)
