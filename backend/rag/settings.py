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
import os
import logging

DOC_MAXIMUM_SIZE = int(os.environ.get("MAX_CONTENT_LENGTH", 128 * 1024 * 1024))
SVR_QUEUE_NAME = "leap_rag_svr_queue"
SVR_QUEUE_RETENTION = 60 * 60
SVR_QUEUE_MAX_LEN = 1024
SVR_CONSUMER_NAME = "leap_rag_svr_consumer"
SVR_CONSUMER_GROUP_NAME = "leap_rag_svr_consumer_group"
PAGERANK_FLD = "pagerank_fea"
TAG_FLD = "tag_feas"


def print_rag_settings():
    logging.info(f"MAX_CONTENT_LENGTH: {DOC_MAXIMUM_SIZE}")
    logging.info(f"SERVER_QUEUE_MAX_LEN: {SVR_QUEUE_MAX_LEN}")
    logging.info(f"SERVER_QUEUE_RETENTION: {SVR_QUEUE_RETENTION}")
    logging.info(f"MAX_FILE_COUNT_PER_USER: {int(os.environ.get('MAX_FILE_NUM_PER_USER', 0))}")
