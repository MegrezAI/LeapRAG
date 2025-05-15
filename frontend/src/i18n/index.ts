import { defaultLocale, type LanguageEnum, locales } from '@/lib/constants/language';
import { getUserLocale } from '@/server/actions/locale';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // Provide a static locale, fetch a user setting,
  // read from `cookies()`, `headers()`, etc.

  let locale = await getUserLocale();
  if (!locales.includes(locale as LanguageEnum)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: {
      ...(await import(`./locale/${locale}.json`)).default,
      ...(await import(`./locale/zod/${locale}.json`)).default
    }
  };
});
