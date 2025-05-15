import json
import logging
import os
from typing import Optional, List, Dict, Any

from sqlalchemy import select, update, and_, not_, func, delete

from services.common_service import CommonService
from services.utils.file_utils import get_project_base_directory
from rag.llm import EmbeddingModel, CvModel, ChatModel, RerankModel, Seq2txtModel, TTSModel
from models import LLMType
from models import LLM, LLMFactory, TenantLLM, Tenant, Knowledgebase, Document
from models import get_current_session, transactional
from sqlalchemy.dialects.postgresql import insert


class LLMFactoryService(CommonService):
    model = LLMFactory

    @classmethod
    @transactional
    async def init_llm_factory(cls):
        session = get_current_session()
        try:
            stmt = delete(LLM).where((LLM.fid == "MiniMax") | (LLM.fid == "Minimax"))
            await session.execute(stmt)
            stmt = delete(LLM).where(LLM.fid == "cohere")
            await session.execute(stmt)
            stmt = delete(LLMFactory).where(LLMFactory.name == "cohere")
            await session.execute(stmt)
        except Exception:
            pass

        factory_llm_infos = json.load(
            open(
                os.path.join(get_project_base_directory(), "configs", "llm_factories.json"),
                "r",
            )
        )
        for factory_llm_info in factory_llm_infos["factory_llm_infos"]:
            llm_infos = factory_llm_info.pop("llm")
            try:
                stmt = insert(LLMFactory).values(**factory_llm_info)
                stmt = stmt.on_conflict_do_nothing()
                await session.execute(stmt)
            except Exception:
                pass

            stmt = delete(LLM).where(LLM.fid == factory_llm_info["name"])
            await session.execute(stmt)

            for llm_info in llm_infos:
                llm_info["fid"] = factory_llm_info["name"]
                try:
                    stmt = insert(LLM).values(**llm_info)
                    stmt = stmt.on_conflict_do_nothing()
                    await session.execute(stmt)
                except Exception:
                    pass

        stmt = delete(LLMFactory).where(LLMFactory.name == "Local")
        await session.execute(stmt)
        stmt = delete(LLM).where(LLM.fid == "Local")
        await session.execute(stmt)
        stmt = delete(LLM).where(LLM.llm_name == "qwen-vl-max")
        await session.execute(stmt)
        stmt = delete(LLM).where(and_(LLM.fid == "Moonshot", LLM.llm_name == "flag-embedding"))
        await session.execute(stmt)
        stmt = delete(TenantLLM).where(
            and_(TenantLLM.llm_factory == "Moonshot", TenantLLM.llm_name == "flag-embedding"))
        await session.execute(stmt)
        stmt = delete(LLMFactory).where(LLMFactory.name == "QAnything")
        await session.execute(stmt)
        stmt = delete(LLM).where(LLM.fid == "QAnything")
        await session.execute(stmt)

        stmt = update(TenantLLM).where(TenantLLM.llm_factory == "QAnything").values({"llm_factory": "Youdao"})
        await session.execute(stmt)
        stmt = update(TenantLLM).where(TenantLLM.llm_factory == "cohere").values({"llm_factory": "Cohere"})
        await session.execute(stmt)

        stmt = select(TenantLLM.tenant_id).where(TenantLLM.llm_factory == "OpenAI").distinct()
        result = await session.execute(stmt)
        tenant_ids = set(result.scalars().all())

        for tid in tenant_ids:
            stmt = select(TenantLLM).where(and_(TenantLLM.llm_factory == "OpenAI", TenantLLM.tenant_id == tid))
            result = await session.execute(stmt)
            tenant_llm = result.scalars().first()

            if tenant_llm:
                for embedding_model in ["text-embedding-3-small", "text-embedding-3-large"]:
                    try:
                        new_tenant_llm = TenantLLM(
                            tenant_id=tenant_llm.tenant_id,
                            model_type=LLMType.EMBEDDING.value,
                            llm_name=embedding_model,
                            llm_factory=tenant_llm.llm_factory,
                            api_key=tenant_llm.api_key,
                            api_base=tenant_llm.api_base,
                            used_tokens=0
                        )
                        session.add(new_tenant_llm)
                    except Exception:
                        pass

        stmt = select(Knowledgebase.id)
        result = await session.execute(stmt)
        for kb_id in result.scalars().all():
            stmt = select(func.count(Document.id)).where(Document.kb_id == kb_id)
            doc_count = await session.execute(stmt)
            doc_count = doc_count.scalar()
            stmt = update(Knowledgebase).where(Knowledgebase.id == kb_id).values({"doc_num": doc_count})
            await session.execute(stmt)


class LLMService(CommonService):
    model = LLM

    @classmethod
    async def query(cls, **filters) -> List[LLM]:
        session = get_current_session()
        stmt = select(cls.model).filter_by(**filters)
        result = await session.execute(stmt)
        return list(result.scalars().all())


class TenantLLMService(CommonService):
    model = TenantLLM

    @classmethod
    async def get_api_key(cls, tenant_id: str, model_name: str) -> Optional[TenantLLM]:
        mdlnm, fid = cls.split_model_name_and_factory(model_name)
        session = get_current_session()

        if not fid:
            stmt = select(cls.model).filter_by(tenant_id=tenant_id, llm_name=mdlnm)
        else:
            stmt = select(cls.model).filter_by(tenant_id=tenant_id, llm_name=mdlnm, llm_factory=fid)
        result = await session.execute(stmt)
        return result.scalar()

    @classmethod
    async def get_my_llms(cls, tenant_id: str) -> List[Dict[str, Any]]:
        session = get_current_session()
        stmt = select(
            cls.model.llm_factory,
            LLMFactory.logo,
            LLMFactory.tags,
            cls.model.model_type,
            cls.model.llm_name,
            cls.model.used_tokens
        ).join(LLMFactory, cls.model.llm_factory == LLMFactory.name).filter(
            cls.model.tenant_id == tenant_id,
            cls.model.api_key.is_not(None)
        )
        results = await session.execute(stmt)
        return [dict(r) for r in results.mappings().all()]

    @staticmethod
    def split_model_name_and_factory(model_name: str) -> tuple[str, Optional[str]]:
        arr = model_name.split("@")
        if len(arr) < 2:
            return model_name, None
        if len(arr) > 2:
            return "@".join(arr[0:-1]), arr[-1]

        # model name must be xxx@yyy
        try:
            model_factories = \
            json.load(open(os.path.join(get_project_base_directory(), "configs/llm_factories.json"), "r"))[
                "factory_llm_infos"]
            model_providers = set([f["name"] for f in model_factories])
            if arr[-1] not in model_providers:
                return model_name, None
            return arr[0], arr[-1]
        except Exception as e:
            logging.exception(f"TenantLLMService.split_model_name_and_factory got exception: {e}")
        return model_name, None

    @classmethod
    async def get_model_config(cls, tenant_id: str, llm_type: str, llm_name: Optional[str] = None) -> Dict[str, Any]:
        session = get_current_session()
        stmt = select(Tenant).filter_by(id=tenant_id)
        result = await session.execute(stmt)
        tenant = result.scalars().first()
        if not tenant:
            raise LookupError("Tenant not found")

        if llm_type == LLMType.EMBEDDING.value:
            mdlnm = tenant.embd_id if not llm_name else llm_name
        elif llm_type == LLMType.SPEECH2TEXT.value:
            mdlnm = tenant.asr_id
        elif llm_type == LLMType.IMAGE2TEXT.value:
            mdlnm = tenant.img2txt_id if not llm_name else llm_name
        elif llm_type == LLMType.CHAT.value:
            mdlnm = tenant.llm_id if not llm_name else llm_name
        elif llm_type == LLMType.RERANK:
            mdlnm = tenant.rerank_id if not llm_name else llm_name
        elif llm_type == LLMType.TTS:
            mdlnm = tenant.tts_id if not llm_name else llm_name
        else:
            assert False, "LLM type error"

        model_config = await cls.get_api_key(tenant_id, mdlnm)
        mdlnm, fid = cls.split_model_name_and_factory(mdlnm)
        if model_config:
            model_config = model_config.__dict__
        if not model_config:
            if llm_type in [LLMType.EMBEDDING, LLMType.RERANK]:
                if not fid:
                    stmt = select(LLM).filter_by(llm_name=mdlnm)
                else:
                    stmt = select(LLM).filter_by(llm_name=mdlnm, fid=fid)
                llm = (await session.execute(stmt)).scalar()
                if llm and llm.fid in ["Youdao", "FastEmbed", "BAAI"]:
                    model_config = {"llm_factory": llm.fid, "api_key": "", "llm_name": mdlnm, "api_base": ""}
            if not model_config:
                if mdlnm == "flag-embedding":
                    model_config = {"llm_factory": "Tongyi-Qianwen", "api_key": "",
                                    "llm_name": llm_name, "api_base": ""}
                else:
                    if not mdlnm:
                        raise LookupError(f"Type of {llm_type} model is not set.")
                    raise LookupError("Model({}) not authorized".format(mdlnm))
        return model_config

    @classmethod
    async def model_instance(cls, tenant_id: str, llm_type: str,
                             llm_name: Optional[str] = None, lang: str = "Chinese"):
        model_config = await cls.get_model_config(tenant_id, llm_type, llm_name)
        if llm_type == LLMType.EMBEDDING.value:
            if model_config["llm_factory"] not in EmbeddingModel:
                return None
            return EmbeddingModel[model_config["llm_factory"]](
                model_config["api_key"], model_config["llm_name"], base_url=model_config["api_base"])

        if llm_type == LLMType.RERANK:
            if model_config["llm_factory"] not in RerankModel:
                return None
            return RerankModel[model_config["llm_factory"]](
                model_config["api_key"], model_config["llm_name"], base_url=model_config["api_base"])

        if llm_type == LLMType.IMAGE2TEXT.value:
            if model_config["llm_factory"] not in CvModel:
                return None
            return CvModel[model_config["llm_factory"]](
                model_config["api_key"], model_config["llm_name"], lang,
                base_url=model_config["api_base"]
            )

        if llm_type == LLMType.CHAT.value:
            if model_config["llm_factory"] not in ChatModel:
                return None
            return ChatModel[model_config["llm_factory"]](
                model_config["api_key"], model_config["llm_name"], base_url=model_config["api_base"])

        if llm_type == LLMType.SPEECH2TEXT:
            if model_config["llm_factory"] not in Seq2txtModel:
                return None
            return Seq2txtModel[model_config["llm_factory"]](
                key=model_config["api_key"], model_name=model_config["llm_name"],
                lang=lang,
                base_url=model_config["api_base"]
            )
        if llm_type == LLMType.TTS:
            if model_config["llm_factory"] not in TTSModel:
                return None
            return TTSModel[model_config["llm_factory"]](
                model_config["api_key"],
                model_config["llm_name"],
                base_url=model_config["api_base"],
            )
        return None

    @classmethod
    @transactional
    async def increase_usage(cls, tenant_id: str, llm_type: str, used_tokens: int,
                             llm_name: Optional[str] = None) -> int:
        session = get_current_session()
        stmt = select(Tenant).filter_by(id=tenant_id)
        result = await session.execute(stmt)
        tenant = result.scalars().first()
        if not tenant:
            logging.error(f"Tenant not found: {tenant_id}")
            return 0

        llm_map = {
            LLMType.EMBEDDING.value: tenant.embd_id,
            LLMType.SPEECH2TEXT.value: tenant.asr_id,
            LLMType.IMAGE2TEXT.value: tenant.img2txt_id,
            LLMType.CHAT.value: tenant.llm_id if not llm_name else llm_name,
            LLMType.RERANK.value: tenant.rerank_id if not llm_name else llm_name,
            LLMType.TTS.value: tenant.tts_id if not llm_name else llm_name
        }

        mdlnm = llm_map.get(llm_type)
        if mdlnm is None:
            logging.error(f"LLM type error: {llm_type}")
            return 0

        llm_name, llm_factory = cls.split_model_name_and_factory(mdlnm)
        stmt = update(cls.model).where(
            and_(
                cls.model.tenant_id == tenant_id,
                cls.model.llm_name == llm_name,
                cls.model.llm_factory == llm_factory if llm_factory else True
            )
        ).values(
            used_tokens=cls.model.used_tokens + used_tokens
        )
        result = await session.execute(stmt)
        if result.rowcount > 0:
            return result.rowcount

        tl = TenantLLM()
        tl.tenant_id = tenant_id
        tl.model_type = llm_type
        tl.llm_name = llm_name
        tl.llm_factory = llm_factory
        tl.used_tokens = used_tokens
        await TenantLLMService.save_or_update_entity(tl)
        return 1


class LLMBundle:
    def __init__(self, tenant_id: str, llm_type: str, llm_name: Optional[str], mdl, model_config):
        self.tenant_id = tenant_id
        self.llm_type = llm_type
        self.llm_name = llm_name
        self.mdl = mdl
        assert self.mdl, "Can't find model for {}/{}/{}".format(
            tenant_id, llm_type, llm_name)
        self.max_length = model_config.get("max_tokens", 8192)

    @classmethod
    async def create(cls, tenant_id: str, llm_type: str, llm_name: Optional[str] = None, lang: str = "Chinese"):
        mdl = await TenantLLMService.model_instance(tenant_id, llm_type, llm_name, lang=lang)
        model_config = await TenantLLMService.get_model_config(tenant_id, llm_type, llm_name)
        return cls(tenant_id, llm_type, llm_name, mdl, model_config)

    async def encode(self, texts: list):
        embeddings, used_tokens = self.mdl.encode(texts)
        if not await TenantLLMService.increase_usage(self.tenant_id, self.llm_type, used_tokens):
            logging.error(f"LLMBundle.encode can't update token usage for {self.tenant_id} {self.llm_type}")
        return embeddings, used_tokens

    async def encode_queries(self, query: str):
        emd, used_tokens = self.mdl.encode_queries(query)
        if not await TenantLLMService.increase_usage(self.tenant_id, self.llm_type, used_tokens):
            logging.error(
                f"LLMBundle.encode_queries can't update token usage for for {self.tenant_id} {self.llm_type}")
        return emd, used_tokens

    async def similarity(self, query: str, texts: list):
        sim, used_tokens = self.mdl.similarity(query, texts)
        if not await TenantLLMService.increase_usage(self.tenant_id, self.llm_type, used_tokens):
            logging.error(f"LLMBundle.similarity can't update token usage for for {self.tenant_id} {self.llm_type}")
        return sim, used_tokens

    async def describe(self, image, max_tokens=300):
        txt, used_tokens = self.mdl.describe(image, max_tokens)
        if not await TenantLLMService.increase_usage(self.tenant_id, self.llm_type, used_tokens):
            logging.error(f"LLMBundle.describe can't update token usage for for {self.tenant_id} {self.llm_type}")
        return txt

    async def transcription(self, audio):
        txt, used_tokens = self.mdl.transcription(audio)
        if not await TenantLLMService.increase_usage(self.tenant_id, self.llm_type, used_tokens):
            logging.error(
                f"LLMBundle.transcription can't update token usage for for {self.tenant_id} {self.llm_type}")
        return txt

    async def tts(self, text):
        async for chunk in self.mdl.tts(text):
            if isinstance(chunk, int):
                if not await TenantLLMService.increase_usage(self.tenant_id, self.llm_type, chunk, self.llm_name):
                    logging.error(
                        f"LLMBundle.tts can't update token usage for for {self.tenant_id} {self.llm_type} {self.llm_name}")
                return
            yield chunk

    async def chat(self, system, history, gen_conf):
        txt, used_tokens = self.mdl.chat(system, history, gen_conf)
        if isinstance(txt, int) and not await TenantLLMService.increase_usage(self.tenant_id, self.llm_type,
                                                                              used_tokens,
                                                                              self.llm_name):
            logging.error(
                f"LLMBundle.chat can't update token usage for {self.tenant_id} {self.llm_type} {self.llm_name}")
        return txt

    async def chat_streamly(self, system, history, gen_conf):
        for txt in self.mdl.chat_streamly(system, history, gen_conf):
            if isinstance(txt, int):
                if not await TenantLLMService.increase_usage(self.tenant_id, self.llm_type, txt, self.llm_name):
                    logging.error(
                        f"LLMBundle.chat_streamly can't update token usage for {self.tenant_id} {self.llm_type} {self.llm_name}")
                return
            yield txt
