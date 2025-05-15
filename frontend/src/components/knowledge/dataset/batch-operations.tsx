'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/base/confirm-modal';
import { DropdownMenuButton } from '@/components/base/dropdown-menu-button';
import { CheckCircle2, Trash2, XCircle, Play, Square } from 'lucide-react';

interface BatchOperationsProps {
  selectedCount: number;
  onDelete: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onParse: (isRunning: boolean) => void;
}

export function BatchOperations({
  selectedCount,
  onDelete,
  onEnable,
  onDisable,
  onParse
}: BatchOperationsProps) {
  const t = useTranslations();
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

  const handleDelete = () => {
    onDelete();
    setShowDeleteAlert(false);
  };

  const batchOperationItems = [
    {
      label: t('Enable'),
      icon: <CheckCircle2 className="size-4" />,
      onClick: onEnable
    },
    {
      label: t('Disable'),
      icon: <XCircle className="size-4" />,
      onClick: onDisable
    },
    {
      label: t('Parse'),
      icon: <Play className="size-4" />,
      onClick: () => onParse(false)
    },
    {
      label: t('Cancel'),
      icon: <XCircle className="size-4" />,
      onClick: () => onParse(true)
    },
    {
      type: 'separator' as const
    },
    {
      label: t('Delete'),
      icon: <Trash2 className="size-4" />,
      onClick: () => setShowDeleteAlert(true)
    }
  ];

  return (
    <>
      <DropdownMenuButton
        triggerContent={
          <span>
            {t('Batch Operations')}
            {selectedCount > 0 && ` (${selectedCount})`}
          </span>
        }
        buttonProps={{ variant: 'outline', size: 'sm' }}
        items={batchOperationItems}
      />
      <ConfirmModal
        isShow={showDeleteAlert}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteAlert(false)}
        title={t('Delete Files')}
        description={t('Are you sure you want to delete these files?')}
        type="destructive"
        showConfirm
        showCancel
      />
    </>
  );
}
