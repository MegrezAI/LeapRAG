'use client';

import { useTranslations } from 'next-intl';
import { Bot, Settings, Sparkles } from 'lucide-react';
import { BasicSettings } from './basic-settings';
import { PromptSettings } from './prompt-settings';
import { ModelSettings } from './model-settings';
import { type LucideIcon } from 'lucide-react';
import { type KnowledgeBase } from '@/types/rag/knowledge';
import { FormProvider, useFormContext } from 'react-hook-form';

interface SectionConfig {
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

interface DialogConfigProps {
  isPending?: boolean;
  knowledgeBases?: KnowledgeBase[];
}

export function DialogConfig({ isPending = false, knowledgeBases = [] }: DialogConfigProps) {
  const t = useTranslations();

  const sectionConfigs: SectionConfig[] = [
    {
      label: t('Basic Settings'),
      icon: Settings,
      component: BasicSettings,
      props: { isPending, knowledgeBases }
    },
    {
      label: t('Prompt Settings'),
      icon: Sparkles,
      component: PromptSettings,
      props: { isPending }
    },
    {
      label: t('Model Settings'),
      icon: Bot,
      component: ModelSettings,
      props: { isPending }
    }
  ];

  return (
    <div className="space-y-6">
      {sectionConfigs.map((section) => (
        <div key={section.label} className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <section.icon className="size-4" />
            <h3 className="text-sm font-medium">{section.label}</h3>
          </div>
          <section.component {...section.props} />
        </div>
      ))}
    </div>
  );
}
