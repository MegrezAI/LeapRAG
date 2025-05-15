import { type Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import KnowledgeBaseChat from '@/components/knowledge/chat';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('Chat')
  };
}
interface KnowledgeBaseChatPageProps {
  params: Promise<{ kbId: string; dialogId: string }>;
}

export default async function KnowledgeBaseChatPage({ params }: KnowledgeBaseChatPageProps) {
  const { kbId } = await params;
  return <KnowledgeBaseChat kbId={kbId} />;
}
