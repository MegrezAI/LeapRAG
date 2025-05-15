'use client';

import { useTranslations } from 'next-intl';
import {
  useApiKeysByAgentId,
  useInvalidateApiKeys,
  useDeleteApiKey,
  useInvalidateApiKeysByAgentId
} from '@/lib/hooks/queries/use-current-accout';
import { toast } from 'sonner';
import { CopyIcon, Trash2 } from 'lucide-react';
import SpinLoader from '@/components/base/loader/spin-loader';
import copy from 'copy-to-clipboard';
import { DataTable } from '@/components/base/data-table';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/base/data-table/table-column-header';
import useISOTime from '@/lib/hooks/use-iso-time';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ConfirmModal } from '@/components/base/confirm-modal';
import { type ApiKey } from '@/types/account/apikey';

interface ApiKeyListProps {
  agentId: string;
}

export function ApiKeyList({ agentId }: ApiKeyListProps) {
  const t = useTranslations();
  const { data: apiKeys = [], isLoading } = useApiKeysByAgentId(agentId);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const invalidateApiKeysByAgentId = useInvalidateApiKeysByAgentId(agentId);
  const { formatISOString } = useISOTime();

  const { mutate: deleteApiKey } = useDeleteApiKey({
    onSuccess: () => {
      invalidateApiKeysByAgentId();
      toast.success(t('Deleted Successfully'));
    },
    onError: () => {
      toast.error(t('Delete Failed'));
    }
  });

  const handleCopyApiKey = (apikey: string) => {
    copy(apikey);
    toast.success(t('Copied to clipboard successfully'));
  };

  const handleDeleteApiKey = (apikey: string) => {
    setDeletingKey(apikey);
  };

  const columns: ColumnDef<ApiKey>[] = [
    {
      accessorKey: 'apikey',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('API Key')} />,
      cell: ({ row }) => {
        const apiKey = row.getValue('apikey') as string;
        const maskedKey = `${apiKey.slice(0, 4)}${'.'.repeat(3)}${apiKey.slice(-15)}`;
        return <div className="font-mono">{maskedKey}</div>;
      },
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'agent_id',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Agent Id')} />,
      cell: ({ row }) => {
        return <div className="w-[200px]">{row.getValue('agent_id') || '-'}</div>;
      },
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Created At')} />,
      cell: ({ row }) => {
        const createdAt = row.getValue('created_at') as string;
        return formatISOString(createdAt);
      },
      enableSorting: false,
      enableHiding: false
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Actions')} />,
      cell: ({ row }) => {
        const apikey = row.getValue('apikey') as string;
        return (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-4"
              onClick={() => handleCopyApiKey(apikey)}
            >
              <CopyIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-4"
              onClick={() => handleDeleteApiKey(apikey)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  if (isLoading) {
    return <SpinLoader />;
  }

  return (
    <>
      <DataTable columns={columns} data={apiKeys} loading={isLoading} />
      <ConfirmModal
        isShow={!!deletingKey}
        onConfirm={() => {
          if (deletingKey) {
            deleteApiKey(deletingKey);
          }
          setDeletingKey(null);
        }}
        onCancel={() => setDeletingKey(null)}
        type="destructive"
      />
    </>
  );
}
