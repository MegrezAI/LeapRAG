import { type Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ApiKeys from '@/components/agent/api';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('API Keys')
  };
}

export default async function AgentApiPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  return (
    <div className="flex flex-col h-full">
      <ApiKeys agentId={agentId} />
    </div>
  );
}
