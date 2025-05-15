import { GET, POST, PUT, DELETE } from '@/lib/utils/request';
import {
  type LLMFactoryConfig,
  type LLMBase,
  type MyLLMFactory,
  type LLMFactoryInfo,
  type LLMMap
} from '@/types/rag/llm';

const RAG_LLM_PREFIX = '/rag/llm';

export const getLLMsApi = () => GET<MyLLMFactory>(`${RAG_LLM_PREFIX}`);

export const addLLMApi = (data: LLMBase) => POST<{ result: string }>(`${RAG_LLM_PREFIX}`, data);

export const deleteLLMApi = (data: { llm_factory: string; llm_name: string }) =>
  DELETE<{ result: string }>(`${RAG_LLM_PREFIX}`, data);

export const getLLMsMapApi = (modelType?: string) =>
  GET<LLMMap>(`${RAG_LLM_PREFIX}/list`, { model_type: modelType });

export const updateLLMFactoryApiKeyApi = (data: LLMFactoryConfig) =>
  PUT<{ result: string }>(`${RAG_LLM_PREFIX}/factories`, data);

export const getLLMFactoriesApi = () =>
  GET<Record<string, LLMFactoryInfo>>(`${RAG_LLM_PREFIX}/factories`);

export const deleteLLMFactoryApi = (data: { llm_factory: string }) =>
  DELETE<{ result: string }>(`${RAG_LLM_PREFIX}/factories`, data);
