#
#  Copyright 2024 The InfiniFlow Authors. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
#
import base64
import datetime
import hashlib
import json
import pickle
import time
import uuid
import requests
import pathlib
import re

from . import file_utils


def string_to_bytes(string):
    return string if isinstance(
        string, bytes) else string.encode(encoding="utf-8")


def bytes_to_string(byte):
    return byte.decode(encoding="utf-8")


def json_loads(src, object_hook=None, object_pairs_hook=None):
    if isinstance(src, bytes):
        src = bytes_to_string(src)
    return json.loads(src, object_hook=object_hook,
                      object_pairs_hook=object_pairs_hook)


def current_timestamp():
    return int(time.time() * 1000)


def timestamp_to_date(timestamp, format_string="%Y-%m-%d %H:%M:%S"):
    if not timestamp:
        timestamp = time.time()
    timestamp = int(timestamp) / 1000
    time_array = time.localtime(timestamp)
    str_date = time.strftime(format_string, time_array)
    return str_date


def date_string_to_timestamp(time_str, format_string="%Y-%m-%d %H:%M:%S"):
    time_array = time.strptime(time_str, format_string)
    time_stamp = int(time.mktime(time_array) * 1000)
    return time_stamp


def serialize_b64(src, to_str=False):
    dest = base64.b64encode(pickle.dumps(src))
    if not to_str:
        return dest
    else:
        return bytes_to_string(dest)


def get_uuid():
    return str(uuid.uuid4())


def to_uuid(s: str) -> str:
    """Convert a string to UUID format. If not UUID, generate MD5 hash and format as UUID.

    Args:
        s: Input string to convert

    Returns:
        UUID string in lowercase (either original UUID or MD5-derived)
    """
    # Check if string matches UUID pattern (case-insensitive)
    if re.fullmatch(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', s, re.IGNORECASE):
        return s.lower()

    # Generate MD5 hash and convert to UUID format
    md5_hash = hashlib.md5(s.encode()).hexdigest()
    return str(uuid.UUID(md5_hash)).lower()


def datetime_format(date_time: datetime.datetime) -> datetime.datetime:
    return datetime.datetime(date_time.year, date_time.month, date_time.day,
                             date_time.hour, date_time.minute, date_time.second)


def get_format_time() -> datetime.datetime:
    return datetime_format(datetime.datetime.now())


def str2date(date_time: str):
    return datetime.datetime.strptime(date_time, '%Y-%m-%d')


def elapsed2time(elapsed):
    seconds = elapsed / 1000
    minuter, second = divmod(seconds, 60)
    hour, minuter = divmod(minuter, 60)
    return '%02d:%02d:%02d' % (hour, minuter, second)


def download_img(url):
    if not url:
        return ""
    response = requests.get(url)
    return "data:" + \
        response.headers.get('Content-Type', 'image/jpg') + ";" + \
        "base64," + base64.b64encode(response.content).decode("utf-8")


def delta_seconds(date_string: str):
    dt = datetime.datetime.strptime(date_string, "%Y-%m-%d %H:%M:%S")
    return (datetime.datetime.now() - dt).total_seconds()


async def duplicate_name(query_func, **kwargs):
    fnm = kwargs["name"]
    objs = await query_func(**kwargs)
    if not objs:
        return fnm
    ext = pathlib.Path(fnm).suffix  # .jpg
    nm = re.sub(r"%s$" % ext, "", fnm)
    r = re.search(r"\(([0-9]+)\)$", nm)
    c = 0
    if r:
        c = int(r.group(1))
        nm = re.sub(r"\([0-9]+\)$", "", nm)
    c += 1
    nm = f"{nm}({c})"
    if ext:
        nm += f"{ext}"

    kwargs["name"] = nm
    return await duplicate_name(query_func, **kwargs)
