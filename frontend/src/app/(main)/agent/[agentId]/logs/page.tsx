import { type Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Logs from '@/components/agent/logs';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('Logs')
  };
}

export default async function AgentLogsPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  return (
    <div className="flex flex-col h-full">
      <Logs agentId={agentId} />
    </div>
  );
}
