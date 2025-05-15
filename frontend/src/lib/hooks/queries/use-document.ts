import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deleteDocumentApi,
  deleteDocumentsApi,
  getDocumentsApi,
  updateDocumentApi,
  uploadDocumentApi,
  parseDocumentApi,
  downloadDocumentApi,
  getDocumentApi
} from '@/api/rag/document';
import { type AxiosProgressEvent } from 'axios';
import {
  type DocumentParams,
  type Document,
  type DocumentUploadResponse
} from '@/types/rag/document';
import { DocumentParseRunningStatus } from '@/lib/constants/rag/knowledge';
import { downloadFileFromBlob } from '@/lib/utils/file';
import { createQueryKeys } from '@/lib/utils/query';
import { useInvalidateQuery } from './use-base';

const QUERY_KEYS = createQueryKeys('datasets');

interface useDocumentProps {
  kbId: string;
  page?: number;
  pageSize?: number;
}

export const useDocuments = ({ kbId, page, pageSize }: useDocumentProps) => {
  const pollingInterval = 10000;

  return useQuery({
    queryKey: [...QUERY_KEYS.list(), kbId, page, pageSize],
    queryFn: () => getDocumentsApi({ kb_id: kbId, page, page_size: pageSize }),
    enabled: !!kbId,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasRunningDoc = data?.data?.some(
        (doc: Document) => doc.run === DocumentParseRunningStatus.RUNNING
      );
      return hasRunningDoc ? pollingInterval : false;
    }
  });
};

export const useUploadDocument = ({
  kbId,
  onSuccess,
  onError
}: {
  kbId: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) => {
  return useMutation({
    mutationFn: async (params: {
      files: File[];
      onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
      parserId: string;
    }) => {
      return uploadDocumentApi({
        kbId,
        files: params.files,
        parser_id: params.parserId,
        onUploadProgress: params.onUploadProgress
      });
    },
    onSuccess,
    onError
  });
};

export const useInvalidateDocuments = () => {
  return useInvalidateQuery(QUERY_KEYS.list());
};

export const useInvalidateDocument = (docId: string) => {
  return useInvalidateQuery(QUERY_KEYS.detail(docId));
};

export const useUpdateDocument = ({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) => {
  return useMutation({
    mutationFn: (params: DocumentParams) => updateDocumentApi(params),
    onSuccess,
    onError
  });
};

export const useDeleteDocument = ({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) => {
  return useMutation({
    mutationFn: (docId: string) => deleteDocumentApi(docId),
    onSuccess,
    onError
  });
};

export const useDeleteDocuments = ({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) => {
  return useMutation({
    mutationFn: (docIds: string[]) => deleteDocumentsApi({ doc_ids: docIds }),
    onSuccess,
    onError
  });
};

export const useParseDocuments = ({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) => {
  return useMutation({
    mutationFn: ({
      docIds,
      isRunning,
      needDelete
    }: {
      docIds: string[];
      isRunning: boolean;
      needDelete: boolean;
    }) =>
      parseDocumentApi({
        docIds,
        run: isRunning ? DocumentParseRunningStatus.CANCEL : DocumentParseRunningStatus.RUNNING,
        stop: needDelete
      }),
    onSuccess,
    onError
  });
};

export const useDownloadDocument = ({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) => {
  return useMutation({
    mutationFn: async ({ docId, fileName }: { docId: string; fileName: string }) => {
      const response = await downloadDocumentApi(docId);
      downloadFileFromBlob(response, fileName);
    },
    onSuccess,
    onError
  });
};

export const useDocument = (docId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.detail(docId),
    queryFn: () => getDocumentApi(docId),
    enabled: !!docId
  });
};
