import type { I18nConfig } from 'fumadocs-core/i18n';

export type Locale = `${LanguageEnum}`;
export type LangMapType = Record<keyof typeof LanguageEnum, string>;

export enum LanguageEnum {
  'en-US' = 'en-US',
  'zh-Hans' = 'zh-Hans'
}

export const locales = Object.values(LanguageEnum);

export const defaultLocale: Locale = 'en-US';

export const docsI18n: I18nConfig = {
  defaultLanguage: defaultLocale,
  languages: locales
};
