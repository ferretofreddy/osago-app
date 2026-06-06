// src/components/map/OsaMap.tsx
// Wrapper con SSR deshabilitado para Leaflet
// No acepta props — LeafletMap gestiona su propio estado internamente

'use client';

import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full w-full bg-[#f9f9ff]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#005c55]" />
        </div>
    ),
});

export default function OsaMap() {
    return <LeafletMap />;
}