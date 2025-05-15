'use client';

import * as React from 'react';
import { UploadModal } from '@/components/upload-modal';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/base/page-header';
import { useTranslations } from 'next-intl';
import { Upload } from 'lucide-react';
import { DatasetTable } from './dataset-table';
import { BatchOperations } from './batch-operations';
import { DocumentParserType, DocumentParseRunningStatus } from '@/lib/constants/rag/knowledge';
import { useSearchParams } from 'next/navigation';
import { PAGE_DEFAULT, PAGE_SIZE_DEFAULT } from '@/lib/constants/common';
import {
  useDocuments,
  useUploadDocument,
  useUpdateDocument,
  useDeleteDocument,
  useDeleteDocuments,
  useParseDocuments,
  useDownloadDocument,
  useInvalidateDocuments
} from '@/lib/hooks/queries/use-document';
import { Document } from '@/types/rag/document';
import { toast } from 'sonner';
import { parseAsInteger, useQueryState } from 'nuqs';
import { UploadModalWithParser } from './upload-modal-with-parser';

export default function Dataset({ kbId }: { kbId: string }) {
  const t = useTranslations();
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<string[]>([]);
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(PAGE_DEFAULT));
  const [pageSize] = useQueryState('pageSize', parseAsInteger.withDefault(PAGE_SIZE_DEFAULT));
  const [currentParserType, setCurrentParserType] = React.useState<DocumentParserType>(
    DocumentParserType.Naive
  );
  const { data: response, isLoading } = useDocuments({ kbId, page, pageSize });
  const invalidateDocuments = useInvalidateDocuments();
  const data = response?.data || [];
  const count = response?.count || 0;

  const { mutateAsync: uploadDocument } = useUploadDocument({
    kbId
  });

  const { mutateAsync: updateDocument } = useUpdateDocument({
    onSuccess: () => {
      invalidateDocuments();
    },
    onError: () => {
      toast.error(t('Update Failed'));
    }
  });
  const { mutateAsync: deleteDocument } = useDeleteDocument({
    onSuccess: () => {
      invalidateDocuments();
      toast.success(t('Deleted Successfully'));
    },
    onError: () => {
      toast.error(t('Delete Failed'));
    }
  });
  const { mutateAsync: deleteDocuments } = useDeleteDocuments({
    onSuccess: () => {
      invalidateDocuments();
      toast.success(t('Deleted Successfully'));
    },
    onError: () => {
      toast.error(t('Delete Failed'));
    }
  });
  const { mutateAsync: parseDocuments } = useParseDocuments({
    onSuccess: () => {
      invalidateDocuments();
    }
  });
  const { mutateAsync: downloadDocument } = useDownloadDocument({});

  const handleUpload = async (files: File[], parserType: DocumentParserType) => {
    setCurrentParserType(parserType);
    const uploadedDocs = await uploadDocument({ files, parserId: parserType });
    if (uploadedDocs) {
      if (uploadedDocs.err && uploadedDocs.err.length > 0) {
        uploadedDocs.err.forEach((error) => {
          // toast.error(error);
        });
        throw new Error();
      }

      try {
        const docIds = uploadedDocs.data.map((doc) => doc.id);
        await parseDocuments({
          docIds,
          isRunning: false,
          needDelete: false
        });
      } catch (error) {
        toast.error(t('Operation Failed'));
      } finally {
        setCurrentParserType(DocumentParserType.Naive);
      }
    }
  };

  const handleRenameDocument = (docId: string, name: string) => {
    updateDocument({ doc_id: docId, name });
    toast.success(t('Updated Successfully'));
  };

  const handleStatusChange = async (docId: string, enabled: boolean) => {
    try {
      await updateDocument({ doc_id: docId, status: enabled ? '1' : '0' });
      toast.success(t('Updated Successfully'));
    } catch (error) {
      toast.error(t('Update Failed'));
      throw error;
    }
  };

  const handleBatchEnable = async (docIds: string[]) => {
    try {
      await Promise.all(docIds.map((docId) => updateDocument({ doc_id: docId, status: '1' })));
      toast.success(t('Updated Successfully'));
    } catch (error) {
      toast.error(t('Update Failed'));
      throw error;
    }
  };

  const handleBatchDisable = async (docIds: string[]) => {
    try {
      await Promise.all(docIds.map((docId) => updateDocument({ doc_id: docId, status: '0' })));
      toast.success(t('Updated Successfully'));
    } catch (error) {
      toast.error(t('Update Failed'));
      throw error;
    }
  };

  const handleParseDocuments = async (
    docIds: string[],
    isRunning: boolean,
    needDelete: boolean
  ) => {
    toast.promise(parseDocuments({ docIds, isRunning, needDelete }), {
      loading: t('Operating'),
      success: () => {
        return t('Operation Successfully');
      }
    });
  };

  const handleUploadSuccess = () => {
    invalidateDocuments();
  };

  const handleParse = (docId: string, isRunning: boolean, needDelete: boolean) => {
    handleParseDocuments([docId], isRunning, needDelete);
  };

  const filterDocumentsByParseStatus = (isRunning: boolean) => {
    return data
      .filter(
        (item) =>
          selectedRowKeys.includes(item.id) &&
          (isRunning
            ? item.run === DocumentParseRunningStatus.RUNNING
            : item.run !== DocumentParseRunningStatus.RUNNING)
      )
      .map((item) => item.id);
  };

  const handleBatchParse = (isRunning: boolean) => {
    const filteredDocIds = filterDocumentsByParseStatus(isRunning);
    if (filteredDocIds.length > 0) {
      handleParseDocuments(filteredDocIds, isRunning, false);
    }
  };

  const handleDownload = (docId: string, fileName: string) => {
    downloadDocument({ docId, fileName });
  };

  const handleDelete = (docIds: string[]) => {
    deleteDocuments(docIds);
    setSelectedRowKeys([]);
    setPage(PAGE_DEFAULT);
  };

  const handleMetadataUpdate = async (docId: string, metadata: string) => {
    try {
      await updateDocument({
        doc_id: docId,
        meta: JSON.parse(metadata)
      });
      toast.success(t('Updated Successfully'));
    } catch (error) {
      toast.error(t('Update Failed'));
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('Dataset')}>
        <div className="flex gap-2">
          {selectedRowKeys.length > 0 && (
            <BatchOperations
              selectedCount={selectedRowKeys.length}
              onDelete={() => handleDelete(selectedRowKeys)}
              onEnable={() => handleBatchEnable(selectedRowKeys)}
              onDisable={() => handleBatchDisable(selectedRowKeys)}
              onParse={handleBatchParse}
            />
          )}
          <UploadModalWithParser
            maxFiles={10}
            maxSizeMB={50}
            onUpload={handleUpload}
            onSuccess={handleUploadSuccess}
            onError={(error) => {
              console.error('Upload failed:', error);
            }}
            trigger={
              <Button variant="outline" size={'sm'}>
                <Upload className="size-4" />
                <span>{t('Upload Files')}</span>
              </Button>
            }
          />
        </div>
      </PageHeader>
      <div className="p-4">
        <DatasetTable
          data={data}
          loading={isLoading}
          selectedRowKeys={selectedRowKeys}
          onSelectedRowKeysChange={setSelectedRowKeys}
          onDelete={(docId) => deleteDocument(docId)}
          onRename={handleRenameDocument}
          onStatusChange={handleStatusChange}
          onParse={handleParse}
          onDownload={handleDownload}
          onMetadataUpdate={handleMetadataUpdate}
          pagination={{
            page,
            pageSize,
            totalCount: count,
            pageSizeSelectOptions: {
              show: true
            }
          }}
        />
      </div>
    </div>
  );
}
