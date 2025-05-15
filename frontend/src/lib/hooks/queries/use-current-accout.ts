import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '../../utils/query';
import {
  createApiKeyApi,
  getApiKeysApi,
  getCurrentUserApi,
  updateApiKeyApi,
  deleteApiKeyApi,
  getApiKeyApi,
  getApiKeysByAgentIdApi
} from '@/api/account';
import { useInvalidateQuery } from './use-base';
import dayjs from 'dayjs';
import { type Dialog } from '@/types/dialog';
import { type DialogParamsSchema } from '@/lib/schema/dialog';

const QUERY_KEY = createQueryKeys('currentAccount');
const API_QUERY_KEY = createQueryKeys('apiKey');

export function useCurrentAccount() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY.all(),
    queryFn: () => getCurrentUserApi()
  });

  return {
    data,
    isLoading
  };
}

export function useInvalidateCurrentAccount() {
  return useInvalidateQuery(QUERY_KEY.all());
}

export function useApiKeys() {
  return useQuery({
    queryKey: API_QUERY_KEY.list(),
    queryFn: async () => {
      const data = await getApiKeysApi();
      return data.sort((a, b) => dayjs(b.created_at).unix() - dayjs(a.created_at).unix());
    }
  });
}

export function useApiKey(apikey: string) {
  return useQuery({
    queryKey: API_QUERY_KEY.detail(apikey),
    queryFn: async () => {
      const data = await getApiKeyApi(apikey);
      return data;
    },
    enabled: !!apikey
  });
}

export const useInvalidateApiKeys = () => {
  return useInvalidateQuery(API_QUERY_KEY.list());
};

export function useApiKeysByAgentId(agentId: string) {
  return useQuery({
    queryKey: API_QUERY_KEY.detail(agentId),
    queryFn: async () => {
      const data = await getApiKeysByAgentIdApi(agentId);
      return data.sort((a, b) => dayjs(b.created_at).unix() - dayjs(a.created_at).unix());
    },
    enabled: !!agentId
  });
}

export const useInvalidateApiKeysByAgentId = (agentId: string) => {
  return useInvalidateQuery(API_QUERY_KEY.detail(agentId));
};

interface CreateApiKeyParams {
  source: string;
  dialog_id?: string;
  agent_id?: string;
  dialog_config?: {
    kb_ids: string[];
  };
}

export function useCreateApiKey({
  onSuccess,
  onError
}: {
  onSuccess?: (data: { apikey: string }) => void;
  onError?: (error: any) => void;
}) {
  return useMutation({
    mutationFn: (params: CreateApiKeyParams) => createApiKeyApi(params),
    onSuccess,
    onError
  });
}

interface UpdateApiKeyParams {
  apikey: string;
  data: {
    source?: string;
    agent_id: string;
    dialog_id: string;
    dialog_config?: DialogParamsSchema;
  };
}

export function useUpdateApiKey({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) {
  return useMutation({
    mutationFn: ({ apikey, data }: UpdateApiKeyParams) => updateApiKeyApi(apikey, data),
    onSuccess,
    onError
  });
}

export function useDeleteApiKey({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) {
  return useMutation({
    mutationFn: (apikey: string) => deleteApiKeyApi(apikey),
    onSuccess,
    onError
  });
}
