'use client';
import useSystemStatus from '../../lib/hooks/queries/use-system';
import { calculateUptime } from '@/lib/utils/locale';
import { Database, Server, Clock, HardDrive } from 'lucide-react';
import { StatusCard } from './status-card';
import { SummaryCard } from './summary-card';
import { DocEngineCard } from './doc-engine-card';
import { TaskExecutorCard } from './task-executor-card';
import { useTranslations } from 'next-intl';
import SpinLoader from '../base/loader/spin-loader';
import EmptyState from '../base/empty-state';

export default function SystemStatusDashboard() {
  const { data, isLoading } = useSystemStatus();
  const t = useTranslations();

  if (isLoading) {
    return <SpinLoader />;
  }

  if (!data) {
    return <EmptyState title={t('System Status')} />;
  }

  const executorId = Object.keys(data.task_executor_heartbeats)[0];
  const heartbeats = data.task_executor_heartbeats[executorId];
  const latestHeartbeat = heartbeats[heartbeats.length - 1];
  const firstHeartbeat = heartbeats[0];
  const uptime = calculateUptime(firstHeartbeat.boot_at ?? '', latestHeartbeat.now, t);

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('System Status')}</h1>
        </div>

        {/* 状态卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            title={t('Database')}
            icon={Database}
            status={data.database.status}
            name={data.database.database}
            elapsed={Number(data.database.elapsed)}
          />
          <StatusCard
            title={t('Document Engine')}
            icon={Server}
            status={data.doc_engine.status}
            name={data.doc_engine.type}
            elapsed={Number(data.doc_engine.elapsed)}
            extraInfo={`${t('Nodes')}: ${data.doc_engine.number_of_nodes}`}
          />
          <StatusCard
            title={t('Cache')}
            icon={Clock}
            status={data.redis.status}
            name="redis"
            elapsed={Number(data.redis.elapsed)}
          />
          <StatusCard
            title={t('Storage')}
            icon={HardDrive}
            status={data.storage.status}
            name={data.storage.storage}
            elapsed={Number(data.storage.elapsed)}
          />
        </div>

        {/* 系统摘要卡片 */}
        <SummaryCard
          uptime={uptime}
          completedTasks={latestHeartbeat.done}
          failedTasks={latestHeartbeat.failed}
        />

        {/* 文档引擎状态卡片 */}
        <DocEngineCard data={data.doc_engine} />

        {/* 任务执行器状态卡片 */}
        <TaskExecutorCard executorId={executorId} heartbeats={heartbeats} />
      </div>
    </div>
  );
}
