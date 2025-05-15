import { z } from 'zod';

export const tenantInfoSchema = z.object({
  name: z.string().min(1),
  llm_id: z.string().min(1),
  embd_id: z.string().min(1),
  img2txt_id: z.string().min(1),
  asr_id: z.string().min(1),
  rerank_id: z.string().min(1),
  tts_id: z.string().optional()
});

export type TenantInfoParams = z.infer<typeof tenantInfoSchema>;
