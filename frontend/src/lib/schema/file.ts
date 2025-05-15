import { z } from 'zod';
import { FileType } from '@/types/rag/file';

export const createFileSchema = z.object({
  parent_id: z.string().optional(),
  name: z.string(),
  type: z.nativeEnum(FileType).optional()
});

export const renameFileSchema = z.object({
  name: z.string()
});

export const deleteFileSchema = z.object({
  file_ids: z.array(z.string())
});

export const fileUploadSchema = z.object({
  parent_id: z.string().optional(),
  file: z.union([z.instanceof(File), z.array(z.instanceof(File))])
});

export const fileQueryParamsSchema = z.object({
  parent_id: z.string().optional(),
  keywords: z.string().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  orderby: z.string().optional(),
  desc: z.boolean().optional()
});

export type CreateFileSchema = z.infer<typeof createFileSchema>;
export type RenameFileSchema = z.infer<typeof renameFileSchema>;
export type DeleteFileSchema = z.infer<typeof deleteFileSchema>;
export type FileUploadSchema = z.infer<typeof fileUploadSchema>;
export type FileQueryParamsSchema = z.infer<typeof fileQueryParamsSchema>;
