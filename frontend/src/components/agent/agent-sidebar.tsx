'use client';

import * as React from 'react';
import { Bot, IdCard, ScrollText, Settings } from 'lucide-react';
import AgentInfo from '@/components/agent/agent-info';
import { useTranslations } from 'next-intl';
import { NavigationSidebar } from '@/components/base/detail-layout/navigation-sidebar';

interface AgentSidebarProps {
  agentId: string;
  className?: string;
  collapsible?: 'offcanvas' | 'icon' | 'none';
}

export function AgentSidebar({ agentId, className, collapsible }: AgentSidebarProps) {
  const t = useTranslations();
  const menus = [
    {
      name: t('Configuration'),
      path: 'agent-configuration',
      icon: Settings
    },
    {
      name: t('Agent Card'),
      path: 'agent-card',
      icon: IdCard
    },
    {
      name: t('API Keys'),
      path: 'api',
      icon: Bot
    },
    {
      name: t('Logs'),
      path: 'logs',
      icon: ScrollText
    }
  ];

  return (
    <NavigationSidebar
      headerComponent={<AgentInfo agentId={agentId} />}
      menus={menus}
      basePath="agent"
      id={agentId}
      className={className}
      collapsible={collapsible}
    />
  );
}
