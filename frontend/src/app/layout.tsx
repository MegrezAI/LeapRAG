import type { Metadata } from 'next';
import '../styles/globals.css';
import '../styles/markdown.scss';
import 'react-photo-view/dist/react-photo-view.css';

import { ThemeProvider } from '@/lib/providers/next-theme-provider';
import NextIntlProvider from '@/lib/providers/next-intl-provider';
import { type LanguageEnum } from '@/lib/constants/language';
import { getLocale, getMessages } from 'next-intl/server';
import { siteConfig } from '@/lib/constants/common';
import QueryProvider from '@/lib/providers/query-client';
import { Toaster } from '@/components/ui/toaster';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export const metadata: Metadata = {
  title: siteConfig.name,
  description: ''
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  const translations = await getMessages();
  return (
    <html suppressHydrationWarning lang={locale} className="h-full">
      <body className={`h-full select-auto`} data-api-base-url={process.env.SERVICE_API_URL_BASE}>
        <QueryProvider>
          <ThemeProvider>
            <NextIntlProvider locale={locale as LanguageEnum} messages={translations}>
              <NuqsAdapter>{children}</NuqsAdapter>
            </NextIntlProvider>
          </ThemeProvider>
        </QueryProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
