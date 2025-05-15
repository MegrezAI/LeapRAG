import Dataset from '@/components/knowledge/dataset';
import { type Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('Dataset')
  };
}

export default async function KnowledgeBaseDatasetPage({
  params
}: {
  params: Promise<{ kbId: string }>;
}) {
  const { kbId } = await params;
  return <Dataset kbId={kbId} />;
}
