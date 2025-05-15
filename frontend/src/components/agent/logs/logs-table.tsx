'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/base/data-table';
import { DataTableColumnHeader } from '@/components/base/data-table/table-column-header';
import { type ColumnDef } from '@tanstack/react-table';
import { type AgentLog, type AgentLogMessage } from '@/types/agent-log';
import { Badge } from '@/components/ui/badge';
import { type PaginationWithLinksProps } from '@/components/ui/pagination-with-links';
import { HoverCard } from '@/components/base/hover-card';
import useISOTime from '@/lib/hooks/use-iso-time';
import { MessageSquare, Eye } from 'lucide-react';
import { Tooltip } from '@/components/base/tooltip';
import { Button } from '@/components/ui/button';
import { LogDetailModal } from './log-detail-modal';
import { TASK_STATES, type TaskState } from '@/lib/constants/agent-log';
import { getStateVariant } from '@/lib/utils/agent-log';

interface LogsTableProps {
  data: AgentLog[];
  loading?: boolean;
  pagination?: PaginationWithLinksProps;
}

const LogsTable = ({ data, loading, pagination }: LogsTableProps) => {
  const t = useTranslations();
  const { formatISOString } = useISOTime();
  const [selectedLog, setSelectedLog] = React.useState<AgentLog | null>(null);

  const columns: ColumnDef<AgentLog>[] = [
    {
      accessorKey: 'state',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Status')} />,
      cell: ({ row }) => {
        const state = row.getValue('state') as TaskState;
        return <Badge variant={getStateVariant(state)}>{state}</Badge>;
      },
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'conversation_id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Conversation ID')} />
      ),
      cell: ({ row }) => {
        const history = row.original.history;
        if (!history?.length) return null;
        const firstUserMessage = history.find((msg) => msg.role === 'user');
        return firstUserMessage?.metadata?.conversation_id ? (
          <div title={firstUserMessage.metadata.conversation_id}>
            {firstUserMessage.metadata.conversation_id}
          </div>
        ) : null;
      },
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'message_id',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Message ID')} />,
      cell: ({ row }) => {
        const history = row.original.history;
        if (!history?.length) return null;
        const firstUserMessage = history.find((msg) => msg.role === 'user');
        return firstUserMessage?.metadata?.message_id ? (
          <div title={firstUserMessage.metadata.message_id}>
            {firstUserMessage.metadata.message_id}
          </div>
        ) : null;
      },
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'history',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Message History')} />
      ),
      cell: ({ row }) => {
        const history = row.original.history;
        if (!history?.length) return null;

        const text = history
          .map((msg) => `${msg.role}: ${msg.parts.map((part) => part.text).join(' ')}`)
          .join('\n');
        const truncatedText = text.length > 50 ? text.slice(0, 50) + '...' : text;

        return (
          <HoverCard
            className="w-[700px] max-w-3xl"
            content={
              <div className="space-y-2">
                {history.map((message, index) => (
                  <div key={index} className="flex flex-col">
                    <span className="font-semibold capitalize">{message.role}:</span>
                    <span className="pl-2 break-all whitespace-pre-wrap">
                      {message.parts.map((part) => part.text).join(' ')}
                    </span>
                  </div>
                ))}
              </div>
            }
          >
            <div className="flex items-center gap-2">
              <span className="whitespace-pre-wrap">{truncatedText}</span>
            </div>
          </HoverCard>
        );
      },
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Created At')} />,
      cell: ({ row }) => <div>{formatISOString(row.original.created_at)}</div>,
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Actions')} />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Tooltip content={t('View Details')}>
            <Button variant="ghost" size="icon" onClick={() => setSelectedLog(row.original)}>
              <Eye className="size-4" />
            </Button>
          </Tooltip>
        </div>
      ),
      enableSorting: false,
      enableHiding: false
    }
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(record) => record.id}
        pagination={pagination}
      />
      {selectedLog && (
        <LogDetailModal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          log={selectedLog}
        />
      )}
    </>
  );
};

export default LogsTable;
