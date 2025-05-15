'use client';

import * as React from 'react';
import { File, FileSearch2, MessageSquare, Settings } from 'lucide-react';
import KnowledgeInfo from './knowledge-info';
import { useTranslations } from 'next-intl';
import { NavigationSidebar } from '@/components/base/detail-layout/navigation-sidebar';

interface KnowledgeSidebarProps {
  kbId: string;
  className?: string;
  collapsible?: 'offcanvas' | 'icon' | 'none';
}

export function KnowledgeSidebar({ kbId, className, collapsible }: KnowledgeSidebarProps) {
  const t = useTranslations();
  const menus = [
    {
      name: t('Dataset'),
      path: 'dataset',
      icon: File
    },
    {
      name: t('Configuration'),
      path: 'configuration',
      icon: Settings
    },
    {
      name: t('Retrieval Test'),
      path: 'retrieval-test',
      icon: FileSearch2
    },
    {
      name: t('Chat'),
      path: 'chat',
      icon: MessageSquare
    }
  ];

  return (
    <NavigationSidebar
      headerComponent={<KnowledgeInfo kbId={kbId} />}
      menus={menus}
      basePath="knowledge"
      id={kbId}
      className={className}
      collapsible={collapsible}
    />
  );
}
