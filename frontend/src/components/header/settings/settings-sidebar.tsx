import { Button } from '@/components/ui/button';
import { type SettingsTab } from './';
import { useTranslations } from 'next-intl';

interface SettingsSidebarProps {
  tabs: readonly {
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
  }[];
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export function SettingsSidebar({ tabs, activeTab, onTabChange }: SettingsSidebarProps) {
  const t = useTranslations();
  return (
    <div className="p-2 pt-6 flex flex-col gap-1">
      <h1 className="text-xl font-semibold mb-6 pl-2">{t('Settings')}</h1>
      <nav className="flex flex-col gap-1">
        {tabs.map((item) => (
          <Button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            variant={activeTab === item.id ? 'secondary' : 'ghost'}
            className="justify-start font-medium"
          >
            <item.icon className="size-4" />
            {item.label}
          </Button>
        ))}
      </nav>
    </div>
  );
}
