// src/app/[locale]/(public)/explore/page.tsx
// Vista EXPLORAR — Mapa interactivo + NearYou

'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import NearYouSection from '@/components/place/NearYouSection';
import BottomNav from '@/components/layout/BottomNav';
import { Search, Compass, Globe } from 'lucide-react';

// Mapa solo en cliente (SSR deshabilitado — Leaflet requiere window)
// OsaMap NO recibe props — LeafletMap maneja su propio GPS internamente
const OsaMap = dynamic(() => import('@/components/map/OsaMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[#e7eeff] animate-pulse" />
    ),
});

export default function ExplorePage() {
    const locale = useLocale();
    const router = useRouter();
    // userLocation solo para NearYouSection (cálculo de distancias)
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                () => console.warn('Geolocalización no disponible')
            );
        }
    }, []);

    return (
        <>
            <main className="h-screen flex flex-col bg-[#f9f9ff] overflow-hidden">

                {/* ── Header ── */}
                <header className="shrink-0 z-40 bg-[#f9f9ff] border-b border-[#E2E8F0] shadow-sm">
                    <div className="flex items-center justify-between px-5 h-16 max-w-7xl mx-auto">
                        {/* Logo — vuelve al menú principal */}
                        <button
                            onClick={() => router.push(`/${locale}`)}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <Compass style={{ width: 28, height: 28, color: '#005c55' }} />
                            <h1 className="text-2xl font-bold text-[#005c55] font-['Plus_Jakarta_Sans'] tracking-tight">
                                OsaGo
                            </h1>
                        </button>
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

                {/* ── Mapa (ocupa todo el espacio restante) ── */}
                {/* LeafletMap ya tiene botón GPS propio (LocateUserControl) */}
                <div className="relative flex-grow overflow-hidden">
                    <OsaMap />
                </div>

                {/* ── NearYou bottom sheet ── */}
                {/* userLocation aquí solo calcula distancias en las cards */}
                <NearYouSection userLocation={userLocation} />

            </main>

            <BottomNav />
        </>
    );
}