// src/app/[locale]/(public)/page.tsx
// HOME — Menú Principal "Discover Osa"
// Dinámico: lee categorías desde Supabase y enruta según category.type

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import { Search, Globe } from 'lucide-react';

// Iconos Lucide mapeados a los iconos de la BD
import {
    Utensils, Bed, TreePine, Wrench, Compass, Car, MapPin,
} from 'lucide-react';

interface Category {
    id: string;
    name_es: string;
    name_en: string;
    icon: string;
    color_hex: string;
    type: string; // 'place' | 'activity' | 'transport'
}

// Mapa de íconos Lucide por nombre
const ICON_MAP: Record<string, React.ReactNode> = {
    'utensils': <Utensils style={{ width: 28, height: 28 }} />,
    'bed': <Bed style={{ width: 28, height: 28 }} />,
    'tree': <TreePine style={{ width: 28, height: 28 }} />,
    'pill': <Wrench style={{ width: 28, height: 28 }} />,
    'compass': <Compass style={{ width: 28, height: 28 }} />,
    'car': <Car style={{ width: 28, height: 28 }} />,
};

// Color de fondo del ícono (10% opacidad del color de la categoría)
// y color del blob decorativo (blur de fondo)
function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Ruta destino según el tipo de categoría
function getCategoryHref(category: Category, locale: string): string {
    switch (category.type) {
        case 'transport': return `/${locale}/transport`;
        case 'activity': return `/${locale}/activities`;
        default: return `/${locale}/places/category/${category.name_es.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`;
    }
}

export default function HomePage() {
    const t = useTranslations('home');
    const locale = useLocale();
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const fetch = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('categories')
                    .select('id, name_es, name_en, icon, color_hex, type')
                    .order('name_es');

                if (!cancelled && !error && data) {
                    setCategories(data);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetch();
        return () => { cancelled = true; };
    }, []);

    return (
        <>
            <main className="min-h-screen bg-[#f9f9ff] pb-24">

                {/* ── Header ── */}
                <header className="sticky top-0 z-40 bg-[#f9f9ff] border-b border-[#E2E8F0] w-full">
                    <div className="flex items-center justify-between px-5 h-16 max-w-7xl mx-auto">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <Compass style={{ width: 28, height: 28, color: '#005c55' }} />
                            <h1 className="text-2xl font-bold text-[#005c55] font-['Plus_Jakarta_Sans'] tracking-tight">
                                OsaGo
                            </h1>
                        </div>
                        {/* Acciones */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => router.push(`/${locale}/search`)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e7eeff] transition-colors"
                                aria-label="Buscar"
                            >
                                <Search style={{ width: 22, height: 22, color: '#3e4947' }} />
                            </button>
                            <button
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e7eeff] transition-colors"
                                aria-label="Idioma"
                            >
                                <Globe style={{ width: 22, height: 22, color: '#3e4947' }} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* ── Hero text ── */}
                <div className="px-5 pt-8 pb-6 max-w-7xl mx-auto">
                    <h2 className="text-[40px] leading-[48px] font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] tracking-[-0.02em] mb-2">
                        {t('discoverTitle')}
                    </h2>
                    <p className="text-lg text-[#3e4947] leading-7 max-w-xl">
                        {t('discoverSubtitle')}
                    </p>
                </div>

                {/* ── Bento Grid de Categorías ── */}
                <div className="px-5 max-w-7xl mx-auto">
                    {loading ? (
                        // Skeleton
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div
                                    key={i}
                                    className="h-40 rounded-xl bg-[#e7eeff] animate-pulse"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {categories.map((cat) => {
                                const href = getCategoryHref(cat, locale);
                                const iconColor = cat.color_hex;
                                const iconBg = hexToRgba(cat.color_hex, 0.12);
                                const blobColor = hexToRgba(cat.color_hex, 0.08);
                                const IconEl = ICON_MAP[cat.icon] || <MapPin style={{ width: 28, height: 28 }} />;

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => router.push(href)}
                                        className="group relative flex flex-col justify-between p-6 bg-white rounded-xl border border-[#bdc9c6]/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden min-h-[160px] text-left"
                                    >
                                        {/* Blob decorativo */}
                                        <div
                                            className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-150"
                                            style={{ backgroundColor: blobColor }}
                                        />

                                        {/* Ícono */}
                                        <div
                                            className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full mb-4"
                                            style={{
                                                backgroundColor: iconBg,
                                                color: iconColor,
                                            }}
                                        >
                                            {IconEl}
                                        </div>

                                        {/* Texto */}
                                        <div className="relative z-10">
                                            <h3 className="text-2xl font-semibold text-[#111c2d] font-['Plus_Jakarta_Sans'] leading-8 group-hover:text-[#005c55] transition-colors">
                                                {cat.name_es}
                                            </h3>
                                            <p className="text-base text-[#3e4947] mt-1 leading-6">
                                                {cat.name_en}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

            </main>

            {/* BottomNav fuera del main */}
            <BottomNav />
        </>
    );
}