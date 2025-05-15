export interface Dialog {
  description: string;
  icon: string;
  id: string;
  kb_ids: string[];
  llm_id: string;
  llm_setting: LLMSetting;
  name: string;
  prompt_config: PromptConfig;
  rerank_id: string;
  similarity_threshold: number;
  tenant_id: string;
  top_k: number;
  top_n: number;
  vector_similarity_weight: number;
}

export interface LLMSettings {
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
  max_tokens: number;
}

export interface PromptConfig {
  empty_response: string;
  keyword: boolean;
  parameters: PromptParameter[];
  prologue: string;
  quote: boolean;
  refine_multiturn: boolean;
  system: string;
  tts: boolean;
  use_kg: boolean;
}

interface LLMSetting {
  frequency_penalty: number;
  max_tokens: number;
  presence_penalty: number;
  temperature: number;
  top_p: number;
}

export interface PromptParameter {
  key: string;
  optional: boolean;
}
