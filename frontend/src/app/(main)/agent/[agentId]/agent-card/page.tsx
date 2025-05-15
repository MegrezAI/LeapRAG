import AgentCard from '@/components/agent/agent-card';
import { type Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('Agent Card')
  };
}

export default async function AgentsPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  return (
    <div className="flex flex-col h-full">
      <AgentCard agentId={agentId} />
    </div>
  );
}
