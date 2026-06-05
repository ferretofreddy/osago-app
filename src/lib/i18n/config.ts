// src/lib/i18n/config.ts

export const locales = ['es', 'en', 'fr', 'de', 'it'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';