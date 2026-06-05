// src/proxy.ts

import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n/config';

// ← CAMBIO: Usa 'default' en lugar de 'proxy'
export default createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'always',
});

export const config = {
    matcher: ['/', '/(es|en|fr|de|it)/:path*'],
};