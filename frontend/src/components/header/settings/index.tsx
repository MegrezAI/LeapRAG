'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { SettingsAccount } from './account';
import { SettingsLanguage } from './account/settings-language';
import { SettingsSidebar } from './settings-sidebar';
import { SettingsModelProvider } from './model-provider';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { Box, Link, LucideLanguages, User } from 'lucide-react';

export type SettingsTab = 'account' | 'language' | 'models';

interface SettingsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function SettingsModal({ open, setOpen }: SettingsModalProps) {
  const t = useTranslations();
  const settingsTabs = {
    account: {
      id: 'account' as const,
      label: t('Account'),
      component: SettingsAccount,
      icon: User
    },
    models: {
      id: 'models' as const,
      label: t('Model Provider'),
      component: SettingsModelProvider,
      icon: Box
    },
    language: {
      id: 'language' as const,
      label: t('Language'),
      component: SettingsLanguage,
      icon: LucideLanguages
    }
  } as const;
  const [activeTab, setActiveTab] = useState<keyof typeof settingsTabs>('account');

  const tabsArray = Object.entries(settingsTabs).map(([id, config]) => ({
    id: id as keyof typeof settingsTabs,
    label: config.label,
    icon: config.icon
  }));

  const TabComponent = settingsTabs[activeTab].component;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[1000px] p-0 gap-0" maskClosable={false}>
        <DialogHeader className="sr-only">
          <DialogTitle></DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[220px_1fr] h-[700px]">
          <SettingsSidebar tabs={tabsArray} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="p-6 overflow-y-auto">
            <TabComponent headerTitle={settingsTabs[activeTab].label} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
