// src/components/map/LeafletMap.tsx

'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createClient } from '@/lib/supabase/client';
import { Navigation } from 'lucide-react';

const PUERTO_JIMENEZ_CENTER: [number, number] = [8.5333, -83.3167];

export default function LeafletMap() {
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    useEffect(() => {
        // Fix para iconos de Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        // Geolocalización
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                },
                () => console.warn('Geolocalización denegada')
            );
        }

        // Cargar negocios
        const fetchBusinesses = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('businesses')
                .select(`
          id, name, latitude, longitude,
          business_categories!inner(
            categories(id, icon, color_hex)
          )
        `)
                .eq('is_active', true)
                .limit(50);

            setBusinesses(data || []);
            setLoading(false);
        };

        fetchBusinesses();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh] bg-[#f9f9ff] rounded-xl">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0f766e]"></div>
            </div>
        );
    }

    return (
        <div className="w-full h-[60vh] rounded-xl overflow-hidden shadow-lg border border-[#E2E8F0]">
            <MapContainer
                center={userLocation || PUERTO_JIMENEZ_CENTER}
                zoom={userLocation ? 14 : 13}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {userLocation && (
                    <Marker position={userLocation}>
                        <Popup>Tu ubicación</Popup>
                    </Marker>
                )}

                {businesses.map((business) => {
                    const category = business.business_categories?.[0]?.categories;
                    const color = category?.color_hex || '#0f766e';

                    const customIcon = L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 32],
                        popupAnchor: [0, -32],
                    });

                    return (
                        <Marker
                            key={business.id}
                            position={[business.latitude, business.longitude]}
                            icon={customIcon}
                        >
                            <Popup>
                                <div className="p-2 min-w-[200px]">
                                    <h3 className="font-bold text-[#111c2d] text-lg">{business.name}</h3>
                                    <p className="text-sm text-[#3e4947] mt-1">{category?.name_es || 'Lugar'}</p>
                                    <button
                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`, '_blank')}
                                        className="mt-2 w-full bg-[#0f766e] text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <Navigation size={14} />
                                        Cómo llegar
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}