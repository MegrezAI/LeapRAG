import PageHeader from '@/components/base/page-header';
import Configuration from '@/components/knowledge/configuration';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Save, Settings2 } from 'lucide-react';
import { type Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('Configuration')
  };
}

export default async function KnowledgeBaseSettingsPage({
  params
}: {
  params: Promise<{ kbId: string }>;
}) {
  const t = await getTranslations();
  const { kbId } = await params;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('Configuration')} />

      <Configuration kbId={kbId} />
    </div>
  );
}
