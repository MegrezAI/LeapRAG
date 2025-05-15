'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/base/data-table';
import { DataTableColumnHeader } from '@/components/base/data-table/table-column-header';
import { type ColumnDef } from '@tanstack/react-table';
import { type Document } from '@/types/rag/document';
import { Button } from '@/components/ui/button';
import {
  Circle,
  CircleX,
  Download,
  FileJson,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  RefreshCcw,
  Trash2
} from 'lucide-react';
import { DropdownMenuButton } from '@/components/base/dropdown-menu-button';
import { ConfirmModal } from '@/components/base/confirm-modal';
import { RenameDocumentModal } from './rename-document-modal';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DocumentParseRunningStatus } from '@/lib/constants/rag/knowledge';
import { Tooltip } from '@/components/base/tooltip';
import { type PaginationWithLinksProps } from '@/components/ui/pagination-with-links';
import SvgIcon from '@/components/icon/svg-Icon';
import { getExtension } from '@/lib/utils/document';
import Link from 'next/link';
import { HoverCard } from '@/components/base/hover-card';
import useISOTime from '@/lib/hooks/use-iso-time';
import SetMetadataModal from './set-metadata-modal';

const StatusMap: Record<
  DocumentParseRunningStatus,
  {
    icon: React.ReactNode;
    label: string;
  }
> = {
  [DocumentParseRunningStatus.IDLE]: {
    icon: <PlayCircle className="size-4" />,
    label: 'Parse'
  },
  [DocumentParseRunningStatus.RUNNING]: {
    icon: <RefreshCcw className="size-4 animate-spin" />,
    label: 'Cancel'
  },
  [DocumentParseRunningStatus.CANCEL]: {
    icon: <RefreshCcw className="size-4" />,
    label: 'Retry'
  },
  [DocumentParseRunningStatus.DONE]: {
    icon: <RefreshCcw className="size-4" />,
    label: 'Retry'
  },
  [DocumentParseRunningStatus.FAIL]: {
    icon: <RefreshCcw className="size-4" />,
    label: 'Retry'
  }
};

interface OperationCellProps {
  row: any;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onParse?: (id: string, isRunning: boolean, canStop: boolean) => void;
  onDownload?: (id: string, fileName: string) => void;
  onMetadataUpdate?: (id: string, metadata: string) => void;
}

function OperationCell({
  row,
  onDelete,
  onRename,
  onParse,
  onDownload,
  onMetadataUpdate
}: OperationCellProps) {
  const t = useTranslations();
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);
  const [showRenameModal, setShowRenameModal] = React.useState(false);
  const [showSetMetadataModal, setShowSetMetadataModal] = React.useState(false);
  const status = row.getValue('run') as DocumentParseRunningStatus;
  const isRunning = status === DocumentParseRunningStatus.RUNNING;
  const chunkNum = row.getValue('chunk_num') as number;
  const needDelete = chunkNum > 0;

  const menuItems = [
    {
      label: t(StatusMap[status].label),
      icon:
        status === DocumentParseRunningStatus.RUNNING ? (
          <CircleX className="size-4" />
        ) : (
          <PlayCircle className="size-4" />
        ),
      onClick: () => onParse?.(row.original.id, isRunning, needDelete),
      disabled: false
    },
    {
      label: t('Download'),
      icon: <Download className="size-4" />,
      onClick: () => onDownload?.(row.original.id, row.original.name)
    },
    {
      label: t('Rename'),
      icon: <Pencil className="size-4" />,
      onClick: () => setShowRenameModal(true)
    },
    {
      label: t('Setting Metadata'),
      icon: <FileJson className="size-4" />,
      onClick: () => setShowSetMetadataModal(true)
    },
    {
      label: t('Delete'),
      icon: <Trash2 className="size-4" />,
      onClick: () => setShowDeleteAlert(true)
    }
  ];

  const handleDeleteConfirm = () => {
    onDelete(row.original.id);
    setShowDeleteAlert(false);
  };

  const handleRename = (newName: string) => {
    onRename(row.original.id, newName);
  };

  const handleSetMetadata = (metadata: string) => {
    onMetadataUpdate?.(row.original.id, metadata);
    setShowSetMetadataModal(false);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenuButton items={menuItems} buttonProps={{ size: 'sm' }} />
      <ConfirmModal
        isShow={showDeleteAlert}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteAlert(false)}
        title={t('Delete File')}
        description={t('Are you sure you want to delete this file?')}
        type="destructive"
        showConfirm
        showCancel
      />
      <RenameDocumentModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        onRename={handleRename}
        initialName={row.original.name}
      />
      <SetMetadataModal
        isOpen={showSetMetadataModal}
        onClose={setShowSetMetadataModal}
        onOk={handleSetMetadata}
        metadata={row.original.meta_fields}
      />
    </div>
  );
}

interface DatasetTableProps {
  data: Document[];
  loading?: boolean;
  selectedRowKeys: string[];
  onSelectedRowKeysChange: (keys: string[]) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onStatusChange: (id: string, enabled: boolean) => void;
  onParse?: (id: string, isRunning: boolean, canStop: boolean) => void;
  onDownload?: (id: string, fileName: string) => void;
  onMetadataUpdate?: (id: string, metadata: string) => void;
  pagination?: PaginationWithLinksProps;
}

export function DatasetTable({
  data,
  loading,
  selectedRowKeys,
  onSelectedRowKeysChange,
  onDelete,
  onRename,
  onStatusChange,
  onParse,
  onDownload,
  onMetadataUpdate,
  pagination
}: DatasetTableProps) {
  const t = useTranslations();
  const { formatISOString } = useISOTime();

  const columns: ColumnDef<Document>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
      cell: ({ row }) => (
        <div className="min-w-[100px] max-w-full flex items-center gap-2">
          {row.original.thumbnail ? (
            <div className="relative size-6">
              <img
                src={row.original.thumbnail}
                className="size-6 rounded-sm"
                alt={row.original.name}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <SvgIcon
                name={`file-icon/${getExtension(row.original.name)}`}
                width={24}
                className="hidden absolute top-0 left-0"
              />
            </div>
          ) : (
            <SvgIcon name={`file-icon/${getExtension(row.original.name)}`} width={24}></SvgIcon>
          )}
          <Tooltip content={row.getValue('name')}>
            <Link
              href={`/knowledge/${row.original.kb_id}/dataset/${row.original.id}`}
              className="truncate text-primary "
            >
              {row.getValue('name')}
            </Link>
          </Tooltip>
        </div>
      ),
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'chunk_num',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Chunks')} />,
      cell: ({ row }) => <div className="w-[80px]">{row.getValue('chunk_num')}</div>,
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Upload Date')} />,
      cell: ({ row }) => (
        <div className="w-[150px]">{formatISOString(row.original.created_at)}</div>
      ),
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'parser_id',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Parser')} />,
      cell: ({ row }) => <div className="w-[100px]">{t(row.getValue('parser_id'))}</div>,
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Enabled')} />,
      cell: ({ row }) => (
        <div className="w-[80px]">
          <Switch
            checked={row.getValue('status') === '1'}
            onCheckedChange={(checked) => onStatusChange(row.original.id, checked)}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'run',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Parsing Status')} />,
      cell: ({ row }) => {
        const status = row.getValue('run') as DocumentParseRunningStatus;

        const progress = (row.original.progress * 100).toFixed(2);
        const processBeginAt = row.original.process_begin_at
          ? new Date(row.original.process_begin_at).toLocaleString()
          : '';

        const processDuration = `${row.original.process_duration.toFixed(2)}s`;
        const progressMsg = row.original.progress_msg || '';

        let variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' = 'default';
        switch (status) {
          case DocumentParseRunningStatus.IDLE: // 未解析
            variant = 'secondary';
            break;
          case DocumentParseRunningStatus.RUNNING: // 解析中
            variant = 'default';
            break;
          case DocumentParseRunningStatus.CANCEL: // 取消
            variant = 'warning';
            break;
          case DocumentParseRunningStatus.DONE: // 成功
            variant = 'success';
            break;
          case DocumentParseRunningStatus.FAIL: // 失败
            variant = 'destructive';
            break;
        }

        const tooltipContent = (
          <div className="space-y-1">
            {processBeginAt && (
              <div>
                <span className="font-semibold">{t('Start Time')}: </span>
                {processBeginAt}
              </div>
            )}
            {processDuration && (
              <div>
                <span className="font-semibold">{t('Duration')}: </span>
                <span className="font-normal">{processDuration}</span>
              </div>
            )}
            {progressMsg && (
              <>
                <span className="font-semibold">{t('Processing Log')}: </span>
                <pre className="mt-1 whitespace-pre-wrap text-xs">
                  {progressMsg.replace(/^\n/, '')}
                </pre>
              </>
            )}
          </div>
        );

        return (
          <div className="w-[125px]">
            {status === DocumentParseRunningStatus.IDLE ? (
              <Badge variant={variant} className="capitalize gap-1 cursor-default">
                <span>{t(`Document Parsing Status${status}`)}</span>
              </Badge>
            ) : (
              <HoverCard content={tooltipContent} className="max-h-96 overflow-auto w-[400px]">
                <Badge variant={variant} className="capitalize gap-1">
                  <div className="flex items-center gap-1">
                    {status === DocumentParseRunningStatus.RUNNING && StatusMap[status].icon}
                    {status === DocumentParseRunningStatus.RUNNING && <span>{progress}%</span>}
                    <span>{t(`Document Parsing Status${status}`)}</span>
                  </div>
                </Badge>
              </HoverCard>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Actions')} />,
      cell: ({ row }) => (
        <OperationCell
          row={row}
          onDelete={onDelete}
          onRename={onRename}
          onParse={onParse}
          onDownload={onDownload}
          onMetadataUpdate={onMetadataUpdate}
        />
      ),
      enableSorting: false,
      enableHiding: false
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(record) => record.id}
      rowSelection={{
        selectedRowKeys,
        onChange: onSelectedRowKeysChange
      }}
      pagination={pagination}
    />
  );
}
