import { z } from 'zod';

export const knowledgeSchema = z.object({
  name: z.string().min(1),
  avatar: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  language: z.string().min(1),
  permission: z.string().min(1)
});

export const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1)
});

export type CreateKnowledgeBaseSchema = z.infer<typeof createKnowledgeBaseSchema>;
export type KnowledgeSchema = z.infer<typeof knowledgeSchema>;
