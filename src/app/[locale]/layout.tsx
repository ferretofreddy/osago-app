// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/lib/i18n/config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'OsaGo - Guía Turística Virtual',
    description: 'Tu guía virtual en la Península de Osa, Costa Rica',
};

// Componente cliente mínimo que setea lang en <html>
// Evita hydration mismatch sin necesitar html/body anidados
function SetHtmlLang({ locale }: { locale: string }) {
    // Solo se ejecuta en cliente — no emite markup
    if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
        document.documentElement.className = 'bg-[#f9f9ff] text-[#111c2d] antialiased';
    }
    return null;
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    if (!locales.includes(locale as any)) {
        notFound();
    }

    const messages = await getMessages();

    return (
        <NextIntlClientProvider messages={messages}>
            <SetHtmlLang locale={locale} />
            {children}
        </NextIntlClientProvider>
    );
}
