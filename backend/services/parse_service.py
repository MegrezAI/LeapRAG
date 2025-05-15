import re
from concurrent.futures import ThreadPoolExecutor
from models import File, FileType
from models.knowledgebase import ParserType
from services.common_service import CommonService

from services.utils.file_utils import filename_type, get_parser
from rag.app import picture, naive, audio, email


class ParseService(CommonService):
    model = File

    @staticmethod
    async def parse_docs(file_objs, tenant_id):

        def dummy(prog=None, msg=""):
            pass

        FACTORY = {
            ParserType.PICTURE.value: picture,
            ParserType.AUDIO.value: audio,
            ParserType.EMAIL.value: email
        }
        parser_config = {"chunk_token_num": 16096, "delimiter": "\n!?;。；！？", "layout_recognize": "Plain Text"}
        exe = ThreadPoolExecutor(max_workers=12)
        threads = []
        for file in file_objs:
            kwargs = {
                "lang": "English",
                "callback": dummy,
                "parser_config": parser_config,
                "from_page": 0,
                "to_page": 100000,
                "tenant_id": tenant_id
            }
            filetype = filename_type(file.filename)
            blob = await file.read()
            threads.append(
                exe.submit(FACTORY.get(get_parser(filetype, file.filename, ""), naive).chunk, file.filename,
                           blob, **kwargs))

        res = []
        for th in threads:
            res.append("\n".join([ck["content_with_weight"] for ck in th.result()]))

        return "\n\n".join(res)
