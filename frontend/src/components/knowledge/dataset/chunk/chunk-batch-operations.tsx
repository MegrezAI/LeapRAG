'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/base/confirm-modal';
import { DropdownMenuButton } from '@/components/base/dropdown-menu-button';
import { CheckCircle2, Trash2, XCircle, CheckSquare, Square } from 'lucide-react';
import { deleteChunksApi, updateChunkAvailableApi } from '@/api/chunk';
import { toast } from 'sonner';

interface ChunkBatchOperationsProps {
  selectedChunks: string[];
  docId: string;
  onSuccess: () => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

export function ChunkBatchOperations({
  selectedChunks,
  docId,
  onSuccess,
  onSelectAll,
  isAllSelected
}: ChunkBatchOperationsProps) {
  const t = useTranslations();
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

  const handleDelete = async () => {
    try {
      await deleteChunksApi({
        chunk_ids: selectedChunks,
        doc_id: docId
      });
      toast.success(t('Deleted Successfully'));
      onSuccess();
    } catch (error) {
      toast.error(t('Delete Failed'));
    }
  };

  const handleUpdateAvailable = async (available_int: number) => {
    if (selectedChunks.length === 0) {
      toast.warning(t('Please select at least one item'));
      return;
    }
    try {
      await updateChunkAvailableApi({
        chunk_ids: selectedChunks,
        doc_id: docId,
        available_int
      });
      toast.success(t('Operation Successfully'));
      onSuccess();
    } catch (error) {
      toast.error(t('Operation Failed'));
    }
  };

  const batchOperationItems = [
    {
      label: isAllSelected ? t('Deselect All') : t('Select All'),
      icon: isAllSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />,
      onClick: onSelectAll
    },

    {
      label: t('Enable'),
      icon: <CheckCircle2 className="size-4" />,
      onClick: () => handleUpdateAvailable(1)
    },
    {
      label: t('Disable'),
      icon: <XCircle className="size-4" />,
      onClick: () => handleUpdateAvailable(0)
    },
    {
      type: 'separator' as const
    },
    {
      label: t('Delete'),
      icon: <Trash2 className="size-4" />,
      onClick: () => {
        if (selectedChunks.length === 0) {
          toast.warning(t('Please select at least one item'));
          return;
        }
        setShowDeleteAlert(true);
      }
    }
  ];

  return (
    <>
      <DropdownMenuButton
        triggerContent={
          <span>
            {t('Batch Operations')}
            {selectedChunks.length > 0 && ` (${selectedChunks.length})`}
          </span>
        }
        buttonProps={{
          variant: 'outline',
          size: 'sm'
        }}
        items={batchOperationItems}
      />
      <ConfirmModal
        isShow={showDeleteAlert}
        onConfirm={() => {
          handleDelete();
          setShowDeleteAlert(false);
        }}
        onCancel={() => setShowDeleteAlert(false)}
        title={t('Delete Chunks')}
        description={t('Are you sure you want to delete these chunks?')}
        type="destructive"
        showConfirm
        showCancel
      />
    </>
  );
}
