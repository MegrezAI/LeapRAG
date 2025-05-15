import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getKnowledgeBasesApi,
  createKnowledgeBaseApi,
  updateKnowledgeBaseApi,
  deleteKnowledgeBaseApi,
  getKnowledgeBaseApi
} from '@/api/rag/knowledge';
import { type GetKnowledgeBasesRequest, type KnowledgeBase } from '@/types/rag/knowledge';
import { type CreateKnowledgeBaseSchema } from '@/lib/schema/knowledge/knowledge';
import { createQueryKeys } from '@/lib/utils/query';
import { useInvalidateQuery, useInfiniteQueryList } from './use-base';
import { PAGE_SIZE_DEFAULT } from '@/lib/constants/common';

const QUERY_KEYS = createQueryKeys('knowledge');

export const useKnowledgeBases = (params: GetKnowledgeBasesRequest) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.list(), params],
    queryFn: () => getKnowledgeBasesApi(params)
  });
};

export const useKnowledgeBase = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => getKnowledgeBaseApi(id),
    enabled: !!id
  });
};

export const useCreateKnowledgeBase = ({
  onSuccess,
  onError
}: {
  onSuccess?: (data: KnowledgeBase) => void;
  onError?: (error: any) => void;
}) => {
  return useMutation({
    mutationFn: (data: CreateKnowledgeBaseSchema) => createKnowledgeBaseApi(data),
    onSuccess,
    onError
  });
};

export const useSetKnowledgeBaseQueryData = () => {
  const queryClient = useQueryClient();

  return (id: string, updater: (oldData: KnowledgeBase | undefined) => KnowledgeBase) => {
    queryClient.setQueryData<KnowledgeBase>(QUERY_KEYS.detail(id), updater);
  };
};

export const useUpdateKnowledgeBase = ({
  onSuccess,
  onError
}: {
  onSuccess?: (
    response: KnowledgeBase,
    variables: { id: string; data: CreateKnowledgeBaseSchema }
  ) => void;
  onError?: (error: unknown) => void;
}) => {
  return useMutation<KnowledgeBase, unknown, { id: string; data: CreateKnowledgeBaseSchema }>({
    mutationFn: async ({ id, data }) => {
      const response = await updateKnowledgeBaseApi(id, data);
      return response.data;
    },
    onSuccess,
    onError
  });
};

export const useDeleteKnowledgeBase = ({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) => {
  return useMutation({
    mutationFn: (id: string) => deleteKnowledgeBaseApi(id),
    onSuccess,
    onError
  });
};

export const useInvalidateKnowledgeBases = () => {
  return useInvalidateQuery(QUERY_KEYS.list());
};

export const useInvalidateKnowledgeBase = (id: string) => {
  return useInvalidateQuery(QUERY_KEYS.detail(id));
};

export const useInfiniteKnowledgeBases = (params: GetKnowledgeBasesRequest = {}) => {
  return useInfiniteQueryList<KnowledgeBase, GetKnowledgeBasesRequest>({
    queryKey: [...QUERY_KEYS.list(), 'infinite', params],
    queryFn: getKnowledgeBasesApi,
    params,
    pageSize: PAGE_SIZE_DEFAULT
  });
};
