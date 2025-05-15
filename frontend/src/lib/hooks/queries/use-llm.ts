import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getLLMsApi,
  addLLMApi,
  deleteLLMApi,
  getLLMsMapApi,
  updateLLMFactoryApiKeyApi,
  getLLMFactoriesApi,
  deleteLLMFactoryApi
} from '@/api/rag/llm';
import type { LLMBase, LLMFactoryConfig } from '@/types/rag/llm';
import { createQueryKeys } from '@/lib/utils/query';
import { useInvalidateQuery } from './use-base';

const LLM_QUERY_KEYS = createQueryKeys('llms');
const LLM_FACTORY_QUERY_KEYS = createQueryKeys('llm-factories');

export function useLLMs() {
  return useQuery({
    queryKey: LLM_QUERY_KEYS.list(),
    queryFn: getLLMsApi
  });
}
export function useInvalidateLLMs() {
  return useInvalidateQuery(LLM_QUERY_KEYS.list());
}

export function useLLMMap(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: LLM_QUERY_KEYS.all(),
    queryFn: () => getLLMsMapApi(),
    enabled: options?.enabled
  });
}
export function useInvalidateLLMMap() {
  return useInvalidateQuery(LLM_QUERY_KEYS.all());
}

export function useLLMFactories() {
  return useQuery({
    queryKey: LLM_FACTORY_QUERY_KEYS.list(),
    queryFn: getLLMFactoriesApi
  });
}

export function useAddLLM() {
  return useMutation({
    mutationFn: (data: LLMBase) => addLLMApi(data)
  });
}

export function useDeleteLLM() {
  return useMutation({
    mutationFn: (data: { llm_factory: string; llm_name: string }) => deleteLLMApi(data)
  });
}

export function useUpdateLLMFactoryApiKey() {
  return useMutation({
    mutationFn: (data: LLMFactoryConfig) => updateLLMFactoryApiKeyApi(data)
  });
}

export function useDeleteLLMFactory() {
  return useMutation({
    mutationFn: (data: { llm_factory: string }) => deleteLLMFactoryApi(data)
  });
}
