// src/app/[locale]/(public)/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import NearYouSection from '@/components/place/NearYouSection';
import BottomNav from '@/components/layout/BottomNav';
import { Search, Compass } from 'lucide-react';

// Carga dinámica del mapa (solo cliente)
const OsaMap = dynamic(() => import('@/components/map/OsaMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[60vh] bg-[#e7eeff] rounded-xl animate-pulse" />
    ),
});

export default function HomePage() {
    const t = useTranslations('home');
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                },
                () => console.warn('Geolocalización no disponible')
            );
        }
    }, []);

    return (
        <>
            <main className="min-h-screen bg-[#f9f9ff] pb-24">
                {/* Header */}
                <header className="sticky top-0 z-50 bg-[#f9f9ff]/95 backdrop-blur-sm border-b border-[#E2E8F0]">
                    <div className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Compass className="w-7 h-7 text-[#005c55]" />
                            <h1 className="text-2xl font-bold text-[#005c55] font-['Plus_Jakarta_Sans']">
                                OsaGo
                            </h1>
                        </div>
                        <button className="p-2 rounded-lg hover:bg-[#e7eeff] transition-colors">
                            <Search className="w-6 h-6 text-[#111c2d]" />
                        </button>
                    </div>
                </header>

                {/* Mapa */}
                <section className="px-5 py-6">
                    <OsaMap />
                </section>

                {/* Sección "Cerca de ti" con bottom sheet */}
                <NearYouSection userLocation={userLocation} />

            </main>

            {/* Bottom Navigation — fuera del main para evitar stacking context */}
            <BottomNav />
        </>
    );
}