'use client';
import { ArrowLeft, Bot, Library, Orbit, SquareTerminal } from 'lucide-react';
import React from 'react';
import AccountMenu from './account-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { Separator } from '../ui/separator';
import LeapRAGIcon from '../icon/leap-rag-icon';
import MobileMenu from './mobile-menu';

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();

  const tabs = [
    {
      icon: <Library className="size-4" />,
      value: 'knowledge',
      label: t('Knowledge'),
      link: '/knowledge'
    },
    {
      icon: <SquareTerminal className="size-4" />,
      value: 'agents',
      label: t('Agents'),
      link: '/agents',
      children: ['/agent']
    }
  ];

  const showTabs = tabs.some(
    (tab) =>
      pathname.startsWith(tab.link) || tab.children?.some((child) => pathname.startsWith(child))
  );

  const activeTab = tabs.find(
    (tab) =>
      pathname.startsWith(tab.link) || tab.children?.some((child) => pathname.startsWith(child))
  );

  return (
    <div
      className={
        'sticky top-0 z-30 flex w-full bg-background items-center justify-between px-2 min-h-[56px] border-b border-muted flex-shrink-0'
      }
    >
      <LeapRAGIcon size="md" className="hidden sm:block" />
      {showTabs && (
        <>
          <div className="hidden sm:flex items-center gap-6">
            <Tabs defaultValue={activeTab?.link}>
              <TabsList>
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.link}
                    value={tab.link}
                    asChild
                    className="data-[state=active]:text-primary"
                  >
                    <Link href={tab.link}>
                      <div className="flex items-center gap-2 px-2 ">
                        {tab.icon}
                        {tab.label}
                      </div>
                    </Link>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <MobileMenu tabs={tabs} />
        </>
      )}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-normal">
        {!showTabs && (
          <>
            <Button variant="outline" className="h-8" onClick={() => router.back()}>
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">{t('Back')}</span>
            </Button>
            <Separator orientation="vertical" className="h-4" />
          </>
        )}
        <AccountMenu />
      </div>
    </div>
  );
};

export default Header;
