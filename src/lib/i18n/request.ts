// src/lib/i18n/request.ts

import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale;
    if (!locale || !['es', 'en', 'fr', 'de', 'it'].includes(locale)) {
        locale = defaultLocale;
    }

    const msgs = (await import(`../../messages/${locale}.json`)).default;

    return {
        locale,
        messages: msgs,
        // include available namespaces to avoid "Missing namespace" errors
        namespaces: Object.keys(msgs)
    };
});