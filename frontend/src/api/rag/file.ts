import { GET, POST, PUT, DELETE } from '@/lib/utils/request';
import {
  type CreateFileSchema,
  type RenameFileSchema,
  type DeleteFileSchema,
  type FileQueryParamsSchema
} from '@/lib/schema/file';
import { type File } from '@/types/rag/file';
import { type PaginationResponse } from '@/types/helpers';

const FILE_PREFIX = '/rag/file';

export const fileApi = {
  /**
   * 获取文件列表
   */
  getFiles: (params: FileQueryParamsSchema): Promise<PaginationResponse<File>> => {
    return GET(FILE_PREFIX, { params });
  },

  /**
   * 获取单个文件信息
   */
  getFileInfo: (fileId: string): Promise<{ file: File; parents: File[] }> => {
    return GET(`${FILE_PREFIX}/${fileId}`);
  },

  /**
   * 创建文件/文件夹
   */
  createFile: (data: CreateFileSchema): Promise<File> => {
    return POST(FILE_PREFIX, data);
  },

  /**
   * 重命名文件/文件夹
   */
  renameFile: (fileId: string, data: RenameFileSchema): Promise<{ result: string }> => {
    return PUT(`${FILE_PREFIX}/${fileId}`, data);
  },

  /**
   * 删除文件/文件夹
   */
  deleteFiles: (data: DeleteFileSchema): Promise<{ result: string; count: number }> => {
    return DELETE(FILE_PREFIX, { data });
  },

  /**
   * 上传文件
   */
  uploadFiles: (formData: FormData): Promise<File[]> => {
    return PUT(FILE_PREFIX, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * 下载文件
   */
  downloadFile: (fileId: string): Promise<Blob> => {
    return GET(`${FILE_PREFIX}/${fileId}/download`, {
      responseType: 'blob'
    });
  }
};
