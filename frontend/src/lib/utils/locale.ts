import { createTranslator } from 'next-intl';
import { defaultLocale, type LanguageEnum, locales } from '../constants/language';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import timezone from 'dayjs/plugin/timezone';
import { match as matchLocale } from '@formatjs/intl-localematcher';

dayjs.extend(timezone);
dayjs.locale('zh-Hans');

export const getCurrentLocale = () => {
  if (typeof window !== 'undefined') {
    const cookieValue = document.cookie.split('; ').find((row) => row.startsWith('NEXT_LOCALE='));
    const locale = cookieValue ? cookieValue.split('=')[1] : '';
    return locale as string;
  }
  return '';
};

export const getTranslation = async () => {
  let messages = {};
  let locale = getCurrentLocale();

  if (!locales.includes(locale as LanguageEnum)) {
    locale = defaultLocale;
  }

  const translated = {
    ...(await import(`../../i18n/locale/${locale}.json`)).default,
    ...(await import(`../../i18n/locale/zod/${locale}.json`)).default
  };

  messages = Object.keys(messages).length === 0 ? translated : messages;

  const t = createTranslator({ locale, messages });
  return t;
};

export function formatDate(date: string | Date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

export function calculateUptime(bootAt: string, now: string, t: (key: string) => string): string {
  const start = dayjs(bootAt);
  const end = dayjs(now);
  const diff = end.diff(start);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const dayUnit = t('Day');
  const hourUnit = t('Hour');
  const minuteUnit = t('Minute');

  if (days > 0) {
    return `${days}${dayUnit} ${hours}${hourUnit}`;
  } else if (hours > 0) {
    return `${hours}${hourUnit} ${minutes}${minuteUnit}`;
  } else {
    return `${minutes}${minuteUnit}`;
  }
}

export const getMatchedLocale = (requestedLocales: string[]): string => {
  return matchLocale(requestedLocales, locales, defaultLocale);
};
