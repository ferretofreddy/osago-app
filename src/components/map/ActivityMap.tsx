// src/components/map/ActivityMap.tsx
// Componente de mapa para mostrar punto de encuentro de actividades
// Utiliza Leaflet para consistencia con el resto de la app

'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ActivityMapProps {
    lat: number;
    lng: number;
    name: string;
}

export default function ActivityMap({ lat, lng, name }: ActivityMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        // Crear mapa
        map.current = L.map(mapContainer.current).setView([lat, lng], 14);

        // Agregar capa de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map.current);

        // Agregar marcador en el punto de encuentro
        L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAzMiA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2IDJDOC4yNjcgMiAyIDguMjY3IDIgMTZDMiAyNSAxNiA0NiAxNiA0NkMxNiA0NiAzMCAyNSAzMCAxNkMzMCA4LjI2NyAyMy43MzMgMiAxNiAyWiIgZmlsbD0iIzAwNWM1NSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg==',
                iconSize: [32, 48],
                iconAnchor: [16, 48],
                popupAnchor: [0, -48],
            }),
        })
            .addTo(map.current)
            .bindPopup(`<div style="font-size: 12px; font-weight: 600; color: #111c2d;">${name}</div>`);

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [lat, lng, name]);

    return (
        <div
            ref={mapContainer}
            style={{
                width: '100%',
                height: '160px',
                backgroundColor: '#e7eeff',
                borderRadius: '0.5rem',
            }}
        />
    );
}
