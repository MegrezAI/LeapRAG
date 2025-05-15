import { z } from 'zod';

export const renameDocumentSchema = z.object({
  name: z.string().min(1)
});

export type RenameDocumentSchema = z.infer<typeof renameDocumentSchema>;
