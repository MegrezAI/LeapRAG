import { type CreateKnowledgeBaseSchema } from '@/lib/schema/knowledge/knowledge';
import { GET, POST, PUT, DELETE } from '@/lib/utils/request';
import { type PaginationResponse } from '@/types/helpers';
import { type KnowledgeBase, type GetKnowledgeBasesRequest } from '@/types/rag/knowledge';

const RAG_KB_PREFIX = '/rag/kb';

// 获取知识库列表
export const getKnowledgeBasesApi = (params: GetKnowledgeBasesRequest = {}) =>
  GET<PaginationResponse<KnowledgeBase>>(`${RAG_KB_PREFIX}`, params);

// 创建知识库
export const createKnowledgeBaseApi = (data: CreateKnowledgeBaseSchema) =>
  POST<KnowledgeBase>(`${RAG_KB_PREFIX}`, data);

// 更新知识库
export const updateKnowledgeBaseApi = (id: string, data: Partial<CreateKnowledgeBaseSchema>) =>
  PUT<{ data: KnowledgeBase }>(`${RAG_KB_PREFIX}/${id}`, data);

// 删除知识库
export const deleteKnowledgeBaseApi = (id: string) =>
  DELETE<{ result: string }>(`${RAG_KB_PREFIX}/${id}`);

export const getKnowledgeBaseApi = (id: string) => GET<KnowledgeBase>(`${RAG_KB_PREFIX}/${id}`);
