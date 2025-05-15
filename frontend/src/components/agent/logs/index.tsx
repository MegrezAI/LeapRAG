'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { parseAsInteger, useQueryState } from 'nuqs';
import { PAGE_DEFAULT, PAGE_SIZE_DEFAULT } from '@/lib/constants/common';
import LogsTable from './logs-table';
import PageHeader from '@/components/base/page-header';
import { useAgentLogs } from '@/lib/hooks/queries/use-agent';
import { type AgentLog } from '@/types/agent-log';

interface LogsProps {
  agentId: string;
}

export default function Logs({ agentId }: LogsProps) {
  const t = useTranslations();
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(PAGE_DEFAULT));
  const [pageSize] = useQueryState('pageSize', parseAsInteger.withDefault(PAGE_SIZE_DEFAULT));

  const { data: response, isLoading } = useAgentLogs({
    agent_id: agentId,
    page,
    page_size: pageSize
  });

  const data = response?.data ?? [];
  const total = response?.count ?? 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('Logs')} />
      <div className="p-4">
        <LogsTable
          data={data}
          loading={isLoading}
          pagination={{
            page,
            pageSize,
            totalCount: total,
            pageSizeSelectOptions: {
              show: true
            }
          }}
        />
      </div>
    </div>
  );
}
