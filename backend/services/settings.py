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
import rag.utils.es_conn
import rag.utils
from rag.nlp import search

LIGHTEN = int(os.environ.get('LIGHTEN', "0"))
CHAT_MDL = "deepseek-v3@VolcEngine"
EMBEDDING_MDL = "BAAI/bge-large-zh-v1.5@BAAI"
RERANK_MDL = "BAAI/bge-reranker-v2-m3"
ASR_MDL = "paraformer-realtime-8k-v1@Tongyi-Qianwen"
IMAGE2TEXT_MDL = "qwen-vl-max@Tongyi-Qianwen"
PARSERS = "naive:General,qa:Q&A,manual:Manual,table:Table,paper:Paper,book:Book,laws:Laws,picture:Picture,one:One,audio:Audio,email:Email,tag:Tag"
DATABASE_TYPE = os.getenv("DB_TYPE", 'postgresql')

DOC_ENGINE = None
docStoreConn = None
retrievaler = None


def init_settings():
    global DOC_ENGINE, docStoreConn, retrievaler

    DOC_ENGINE = os.environ.get('DOC_ENGINE', "elasticsearch")
    lower_case_doc_engine = DOC_ENGINE.lower()
    if lower_case_doc_engine == "elasticsearch":
        docStoreConn = rag.utils.es_conn.ESConnection()
    else:
        raise Exception(f"Not supported doc engine: {DOC_ENGINE}")

    retrievaler = search.Dealer(docStoreConn)
