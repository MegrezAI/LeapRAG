import { z } from 'zod';

export const apiKeyFormSchema = z.object({
  agent_id: z.string().optional()
});

export type ApiKeyFormSchema = z.infer<typeof apiKeyFormSchema>;
