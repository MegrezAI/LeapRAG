import RetrievalTest from '@/components/knowledge/retrieval-test';
import { type Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import React from 'react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('Retrieval Test')
  };
}

const RetrievalTestPage = async ({ params }: { params: Promise<{ kbId: string }> }) => {
  const { kbId } = await params;
  return <RetrievalTest kbId={kbId} />;
};

export default RetrievalTestPage;
