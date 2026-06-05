// src/components/map/OsaMap.tsx

'use client';

import dynamic from 'next/dynamic';

// Carga dinámica con SSR deshabilitado
const LeafletMap = dynamic(() => import('./LeafletMap'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-[60vh] bg-[#f9f9ff] rounded-xl border border-[#E2E8F0]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0f766e]"></div>
        </div>
    ),
});

export default function OsaMap() {
    return <LeafletMap />;
}