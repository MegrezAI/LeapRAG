import { type DocumentParseRunningStatus } from '@/lib/constants/rag/knowledge';
import { GET, POST, PUT, DELETE } from '@/lib/utils/request';
import { type OperationResponse, type PaginationResponse } from '@/types/helpers';
import type {
  Document,
  DocumentParams,
  DocumentsParams,
  DocumentUploadResponse
} from '@/types/rag/document';
import { type AxiosProgressEvent } from 'axios';

const RAG_DOCUMENT_PREFIX = '/rag/document';

export const getDocumentsApi = async (params: DocumentsParams) => {
  return GET<PaginationResponse<Document>>(`${RAG_DOCUMENT_PREFIX}`, params);
};

export const createDocumentApi = async (data: { kb_id: string }) => {
  return POST(`${RAG_DOCUMENT_PREFIX}`, data);
};

export const getDocumentApi = async (docId: string) => {
  return GET<Document>(`${RAG_DOCUMENT_PREFIX}/${docId}`);
};

export const uploadDocumentApi = async (data: {
  kbId: string;
  files: File[];
  parser_id: string;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
}): Promise<DocumentUploadResponse> => {
  const formData = new FormData();

  formData.append('kb_id', data.kbId);
  formData.append('parser_id', data.parser_id);
  data.files.forEach((file) => {
    formData.append('file', file);
  });

  const response = await PUT<DocumentUploadResponse>(`${RAG_DOCUMENT_PREFIX}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response;
};

export const updateDocumentApi = async (data: DocumentParams) => {
  const { doc_id, ...rest } = data;
  return PUT(`${RAG_DOCUMENT_PREFIX}/${doc_id}`, rest);
};

export const deleteDocumentsApi = async (data: { doc_ids: string[] }) => {
  return DELETE(`${RAG_DOCUMENT_PREFIX}`, data);
};

export const deleteDocumentApi = async (docId: string) => {
  return DELETE(`${RAG_DOCUMENT_PREFIX}/${docId}`);
};

export const downloadDocumentApi = async (docId: string) => {
  return GET<Blob>(
    `${RAG_DOCUMENT_PREFIX}/${docId}/download`,
    {},
    {
      responseType: 'blob'
    }
  );
};

export const renameDocumentApi = async (docId: string, data: { name: string }) => {
  return PUT(`${RAG_DOCUMENT_PREFIX}/${docId}`, data);
};

export const parseDocumentApi = async ({
  docIds,
  run,
  stop = false
}: {
  docIds: string[];
  run: DocumentParseRunningStatus;
  stop: boolean;
}) => {
  return POST(`${RAG_DOCUMENT_PREFIX}/run`, {
    doc_ids: docIds,
    run: String(run),
    stop
  });
};
