// src/app/[locale]/layout.tsx

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/lib/i18n/config';
import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
    title: 'OsaGo - Guía Turística Virtual',
    description: 'Tu guía virtual en la Península de Osa, Costa Rica',
};

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const { locale } = await params;

    if (!locales.includes(locale as any)) {
        notFound();
    }

    const messages = await getMessages();

    return (
        <html lang={locale} data-scroll-behavior="smooth">
            <body className="bg-[#f9f9ff] text-[#111c2d] antialiased">
                <NextIntlClientProvider messages={messages}>
                    {children}
                </NextIntlClientProvider>
            </body>
        </html>
    );
}