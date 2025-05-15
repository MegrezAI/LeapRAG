import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getChunksApi,
  getChunkByIdApi,
  updateChunkAvailableApi,
  deleteChunksApi,
  retrievalTestApi
} from '@/api/chunk';
import type {
  ChunkListSchema,
  OperationChunksSchema,
  ChunkRetrievalTestSchema
} from '@/lib/schema/knowledge/chunk';
import { useInvalidateQuery } from './queries/use-base';
import { createQueryKeys } from '../utils/query';

const QUERY_KEY = createQueryKeys('chunks');

export function useChunks(params: ChunkListSchema) {
  const { data, isLoading, error } = useQuery({
    queryKey: [...QUERY_KEY.list(), params],
    queryFn: () => getChunksApi(params),
    enabled: !!params.doc_id
  });

  return {
    chunks: data?.chunks || [],
    total: data?.total || 0,
    doc: data?.doc,
    isLoading,
    error
  };
}

export function useChunk({
  chunkId,
  docId,
  enabled = true
}: {
  chunkId: string;
  docId: string;
  enabled?: boolean;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY.detail(chunkId),
    queryFn: () => getChunkByIdApi({ chunkId, docId }),
    enabled: enabled && !!chunkId && !!docId
  });

  return {
    chunk: data,
    isLoading,
    error
  };
}

export function useDeleteChunks({
  onSuccess,
  onError
}: {
  onSuccess: () => void;
  onError: (error: any) => void;
}) {
  return useMutation({
    mutationFn: (params: OperationChunksSchema) => deleteChunksApi(params),
    onSuccess: onSuccess,
    onError
  });
}

export function useInvalidateChunks() {
  return useInvalidateQuery(QUERY_KEY.list());
}

export function useUpdateChunkAvailable({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) {
  return useMutation({
    mutationFn: (params: OperationChunksSchema) => updateChunkAvailableApi(params),
    onSuccess,
    onError
  });
}

export function useRetrievalTest() {
  return useMutation({
    mutationFn: (params: ChunkRetrievalTestSchema) => retrievalTestApi(params)
  });
}
