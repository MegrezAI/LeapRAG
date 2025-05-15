import { z } from 'zod';

export const chunkSchema = z.object({
  chunk_id: z.string(),
  content_with_weight: z.string(),
  doc_id: z.string(),
  docnm_kwd: z.string(),
  important_kwd: z.array(z.string()),
  question_kwd: z.array(z.string()),
  image_id: z.string(),
  available_int: z.number(),
  positions: z.array(z.array(z.number())).min(0)
});

export const chunkListSchema = z.object({
  doc_id: z.string(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  available_int: z.number().optional(),
  keywords: z.string().optional()
});

export const operationChunksSchema = z.object({
  chunk_ids: z.array(z.string()),
  doc_id: z.string(),
  available_int: z.number().optional()
});

export const chunkRetrievalTestSchema = z.object({
  page: z.number(),
  page_size: z.number(),
  kb_ids: z.array(z.string()),
  doc_ids: z.array(z.string()).optional(),
  top_k: z.number().optional(),
  use_kg: z.boolean().optional(),
  similarity_threshold: z.number().optional(),
  vector_similarity_weight: z.number().optional(),
  question: z.string().min(1),
  rerank_id: z.string().optional(),
  keyword: z.boolean().optional(),
  highlight: z.boolean().optional()
});

export type ChunkListSchema = z.infer<typeof chunkListSchema>;
export type OperationChunksSchema = z.infer<typeof operationChunksSchema>;
export type ChunkRetrievalTestSchema = z.infer<typeof chunkRetrievalTestSchema>;
