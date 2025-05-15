import { z } from 'zod';

export const promptParameterSchema = z.object({
  key: z.string(),
  optional: z.boolean()
});

export const llmSetting = z.object({
  temperature: z.number(),
  top_p: z.number(),
  presence_penalty: z.number(),
  frequency_penalty: z.number(),
  max_tokens: z.number()
});

export const dialogConfigSchema = z.object({
  empty_response: z.string().optional(),
  system: z.string().optional(),
  quote: z.boolean().optional(),
  keyword: z.boolean().optional(),
  tts: z.boolean().optional(),
  refine_multiturn: z.boolean().optional(),
  use_kg: z.boolean().optional(),
  parameters: z.array(promptParameterSchema).optional(),
  prologue: z.string().optional()
});

export const dialogParamsSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  kb_ids: z.array(z.string()).refine((data) => data.length > 0, {
    params: { i18n: 'validation.select_knowledge_base_first' }
  }),
  top_n: z.number().min(1).max(20).default(6).optional(),
  llm_setting: llmSetting.optional(),
  similarity_threshold: z.number().min(0).max(1).default(0.1).optional(),
  vector_similarity_weight: z.number().min(0).max(1).default(0.3).optional(),
  rerank_id: z.string().optional(),
  language: z.string().optional(),
  llm_id: z.string().optional(),
  prompt_config: dialogConfigSchema.optional()
});

export type DialogConfigSchema = z.infer<typeof dialogConfigSchema>;
export type DialogParamsSchema = z.infer<typeof dialogParamsSchema>;
