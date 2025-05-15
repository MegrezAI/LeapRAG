import { type Dialog } from '../dialog';

export interface KnowledgeBase {
  id: string;
  avatar?: string;
  tenant_id: string;
  name: string;
  language: string;
  description?: string;
  embd_id: string;
  permission: string;
  created_by: string;
  doc_num: number;
  token_num: number;
  chunk_num: number;
  similarity_threshold: number;
  vector_similarity_weight: number;
  parser_id: string;
  parser_config: Parserconfig;
  pagerank: number;
  dialogs: Dialog[];
  status: string;
  created_at: string;
  updated_at: string;
}

interface Parserconfig {
  pages: number[][];
}

export interface GetKnowledgeBasesRequest {
  keywords?: string;
  page?: number;
  page_size?: number;
  parser_id?: string;
  orderby?: string;
  desc?: boolean;
}
