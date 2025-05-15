import { DELETE, GET, PUT, POST } from '@/lib/utils/request';
import type { Chunk, ChunkListResponse, ChunkRetrievalTestResponse } from '@/types/chunk';
import type {
  ChunkListSchema,
  OperationChunksSchema,
  ChunkRetrievalTestSchema
} from '@/lib/schema/knowledge/chunk';

const CHUNK_PREFIX = '/rag/chunk';

export const getChunksApi = async (params: ChunkListSchema) => {
  return GET<ChunkListResponse>(`${CHUNK_PREFIX}`, params);
};

export const getChunkByIdApi = async ({ chunkId, docId }: { chunkId: string; docId: string }) => {
  return GET<Chunk>(`${CHUNK_PREFIX}/${docId}/${chunkId}`);
};

export const updateChunkAvailableApi = async (params: OperationChunksSchema) => {
  return PUT<Chunk>(`${CHUNK_PREFIX}`, params);
};

export const deleteChunksApi = async (params: OperationChunksSchema) => {
  return DELETE(`${CHUNK_PREFIX}`, params);
};

export const retrievalTestApi = async (params: ChunkRetrievalTestSchema) => {
  return POST<ChunkRetrievalTestResponse>(`${CHUNK_PREFIX}/retrieval-test`, params);
};
