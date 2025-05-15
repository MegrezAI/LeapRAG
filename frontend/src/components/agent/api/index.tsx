'use client';

import { useTranslations } from 'next-intl';
import { ApiKeyList } from './api-key-list';
import { CreateApiKeyModal } from './create-api-key-modal';
import PageHeader from '@/components/base/page-header';
import { useApiKeys, useApiKeysByAgentId } from '@/lib/hooks/queries/use-current-accout';

interface ApiKeysProps {
  agentId: string;
}

export default function ApiKeys({ agentId }: ApiKeysProps) {
  const t = useTranslations();
  const { data: apiKeys = [] } = useApiKeysByAgentId(agentId);
  const hasApiKeys = apiKeys.length > 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('API Keys')}>
        <CreateApiKeyModal agentId={agentId} hasApiKeys={hasApiKeys} />
      </PageHeader>
      <div className="p-4">
        <ApiKeyList agentId={agentId} />
      </div>
    </div>
  );
}
