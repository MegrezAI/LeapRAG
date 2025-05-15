import { z } from 'zod';

export const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  id: z.string().optional(),
  thumbup: z.boolean().optional(),
  feedback: z.string().optional()
});

export const referenceChunkSchema = z.object({
  id: z.string(),
  content: z.string(),
  document_id: z.string(),
  document_name: z.string(),
  dataset_id: z.string(),
  image_id: z.string().optional(),
  positions: z.array(z.number()).optional()
});

export const referenceSchema = z.object({
  chunks: z.array(referenceChunkSchema),
  doc_aggs: z.array(z.any())
});

export const conversationSchema = z.object({
  id: z.string(),
  dialog_id: z.string(),
  name: z.string(),
  message: z.array(messageSchema),
  reference: z.array(referenceSchema).optional(),
  avatar: z.string().optional(),
  created_at: z.string().optional()
});

export const conversationCreateSchema = z.object({
  name: z.string().optional(),
  dialog_id: z.string()
});

export const conversationCompletionSchema = z.object({
  conversation_id: z.string(),
  messages: z.array(messageSchema),
  stream: z.boolean().optional()
});

export const questionSchema = z.object({
  question: z.string(),
  kb_ids: z.array(z.string())
});

export const ttsSchema = z.object({
  text: z.string()
});

export const thumbUpSchema = z.object({
  message_id: z.string(),
  set: z.boolean(),
  feedback: z.string().optional()
});
