import { type LLMProvider, type LLMTypeEnum } from '@/lib/constants/rag/llm';

export interface LLMBase {
  llm_factory: string;
  model_type: LLMTypeEnum;
  llm_name: string;
  api_base?: string;
  api_key?: string;
  max_tokens?: number;
}

export interface LLMListItem {
  name: string;
  type: string;
  used_token: number;
}

export type MyLLMFactory = Record<
  LLMProvider,
  {
    llm: LLMListItem[];
    tags: string;
  }
>;

export interface LLMFactoryInfo {
  create_date: string;
  create_time: number;
  logo: string;
  model_types: string[];
  name: LLMProvider;
  status: string;
  tags: string;
  update_date: string;
  update_time: number;
}

export interface LLMFactoryConfig {
  llm_factory: string;
  api_key: string;
  base_url?: string;
}

export type LLMMap = Record<string, LLMMapInfo[]>;

interface LLMMapInfo {
  llm_name: string;
  model_type: string;
  fid: string;
  max_tokens: number;
  tags: string;
  status: string;
  created_at: string;
  updated_at: string;
  available: boolean;
}
