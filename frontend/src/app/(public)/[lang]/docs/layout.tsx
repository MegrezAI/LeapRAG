import { source } from '@/lib/fumadocs/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from './layout.config';
import { getTranslations } from 'next-intl/server';
import { RootProvider } from 'fumadocs-ui/provider';
import { I18nProvider } from 'fumadocs-ui/i18n';
import { defaultLocale, type LanguageEnum, locales } from '@/lib/constants/language';
import { notFound } from 'next/navigation';

export default async function Layout({
  children,
  params
}: {
  params: { lang: string };
  children: ReactNode;
} & { params: Promise<any> }) {
  const { lang } = await params;
  if (!locales.includes(lang as LanguageEnum)) notFound();

  const t = await getTranslations();

  return (
    <I18nProvider
      locale={lang}
      locales={locales.map((locale) => ({ name: t(locale), locale }))}
      translations={{
        ...(await import(`../../../../i18n/locale/docs/${lang}.json`)).default
      }}
    >
      <RootProvider
        theme={{
          enabled: false
        }}
        search={{ enabled: false }}
      >
        <DocsLayout tree={source.pageTree[lang]} {...baseOptions}>
          {children}
        </DocsLayout>
      </RootProvider>
    </I18nProvider>
  );
}
