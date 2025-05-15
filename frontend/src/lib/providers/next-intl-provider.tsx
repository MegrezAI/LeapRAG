'use client';
import { setUserLocale } from '@/server/actions/locale';
import { NextIntlClientProvider, useTranslations, type AbstractIntlMessages } from 'next-intl';
import React, { useEffect } from 'react';
import { defaultLocale, type LanguageEnum, locales, type Locale } from '../constants/language';
import ZodErrorProvider from './zod-error-provider';
import { getCurrentLocale, getMatchedLocale } from '../utils/locale';

interface NextIntlProviderProps {
  children: React.ReactNode;
  messages?: AbstractIntlMessages;
  locale?: Locale;
}

const NextIntlProvider = ({ children, locale, messages }: NextIntlProviderProps) => {
  const lng = getCurrentLocale();

  useEffect(() => {
    (async () => {
      const matchedLocale = getMatchedLocale([...navigator.languages]);

      if (!lng) {
        await setUserLocale(matchedLocale as Locale);
      } else if (!locales.includes(lng as LanguageEnum)) {
        await setUserLocale(defaultLocale);
      }
    })();
  }, []);
  return (
    <NextIntlClientProvider timeZone="Asia/Shanghai" locale={locale} messages={messages}>
      <ZodErrorProvider>{children}</ZodErrorProvider>
    </NextIntlClientProvider>
  );
};

export default NextIntlProvider;
