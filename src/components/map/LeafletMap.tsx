// src/components/map/LeafletMap.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createClient } from '@/lib/supabase/client';
import { Navigation } from 'lucide-react';

const PUERTO_JIMENEZ_CENTER: [number, number] = [8.5333, -83.3167];

function LocateUserControl() {
    const map = useMap();
    // Ref para saber si el componente sigue montado
    const mountedRef = useRef(true);

    const locateUser = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // ✅ No hacer nada si el mapa ya fue desmontado
                    if (!mountedRef.current) return;

                    const { latitude, longitude } = position.coords;
                    map.setView([latitude, longitude], 15, { animate: true });

                    const userIcon = L.divIcon({
                        className: 'custom-user-marker',
                        html: `
                            <div style="
                                background-color: #005c55;
                                width: 18px;
                                height: 18px;
                                border-radius: 50%;
                                border: 3px solid white;
                                box-shadow: 0 0 0 2px #005c55, 0 2px 8px rgba(0,0,0,0.3);
                            "></div>
                        `,
                        iconSize: [18, 18],
                        iconAnchor: [9, 9],
                    });

                    L.marker([latitude, longitude], { icon: userIcon })
                        .addTo(map)
                        .bindPopup('Tu ubicación');
                },
                (error) => {
                    console.warn('Geolocalización denegada:', error);
                }
            );
        }
    };

    // Auto-localizar al cargar — con cleanup
    useEffect(() => {
        mountedRef.current = true;
        locateUser();

        return () => {
            // ✅ Marcar como desmontado para cancelar callbacks pendientes
            mountedRef.current = false;
        };
    }, [map]);

    // Botón de localizar como control de Leaflet
    useEffect(() => {
        const LocateButton = L.Control.extend({
            onAdd: () => {
                const btn = L.DomUtil.create('button', 'locate-button');
                btn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                    </svg>
                `;
                btn.style.cssText = `
                    width: 48px;
                    height: 48px;
                    background: white;
                    border: 1px solid #E2E8F0;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    color: #005c55;
                    transition: all 0.2s;
                `;
                btn.onmouseover = () => {
                    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    btn.style.transform = 'scale(1.05)';
                };
                btn.onmouseout = () => {
                    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    btn.style.transform = 'scale(1)';
                };
                L.DomEvent.disableClickPropagation(btn);
                L.DomEvent.on(btn, 'click', () => {
                    locateUser();
                });
                return btn;
            },
        });

        const control = new LocateButton({ position: 'topright' });
        control.addTo(map);

        return () => {
            control.remove();
        };
    }, [map]);

    return null;
}

export default function LeafletMap() {
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    useEffect(() => {
        let cancelled = false; // ✅ Flag para geolocalización del componente padre

        // Fix para iconos de Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        // Geolocalización inicial
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (cancelled) return; // ✅ Verificar antes de setState
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                },
                () => console.warn('Geolocalización no disponible')
            );
        }

        // Cargar negocios
        const fetchBusinesses = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('businesses')
                    .select(`
                        id, name, latitude, longitude,
                        business_categories (
                            categories (
                                id, name_es, name_en, icon, color_hex
                            )
                        )
                    `)
                    .eq('is_active', true)
                    .limit(50);

                if (error) {
                    console.error('Error fetching businesses:', error);
                } else if (data && !cancelled) { // ✅ Verificar antes de setState
                    setBusinesses(data);
                }
            } catch (err) {
                console.error('Unexpected error:', err);
            } finally {
                if (!cancelled) setLoading(false); // ✅ Verificar antes de setState
            }
        };

        fetchBusinesses();

        return () => {
            cancelled = true; // ✅ Cancelar al desmontar
        };
    }, []);

    const createCustomIcon = (category: any) => {
        const color = category?.color_hex || '#005c55';
        const icon = category?.icon || 'map-pin';

        const iconMap: Record<string, string> = {
            'utensils': '🍴',
            'bed': '🛏️',
            'compass': '🧭',
            'car': '🚗',
            'tree': '🌳',
            'pill': '💊',
            'map-pin': '📍',
        };

        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div style="
                    background-color: ${color};
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                ">
                    ${iconMap[icon] || '📍'}
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20],
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh] bg-[#f9f9ff] rounded-xl">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#005c55]" />
            </div>
        );
    }

    return (
        <div className="relative w-full h-[60vh] rounded-xl overflow-hidden shadow-lg border border-[#E2E8F0]">
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

                <LocateUserControl />

                {businesses.map((business) => {
                    const category = business.business_categories?.[0]?.categories;
                    const customIcon = createCustomIcon(category);

                    return (
                        <Marker
                            key={business.id}
                            position={[business.latitude, business.longitude]}
                            icon={customIcon}
                        >
                            <Popup>
                                <div className="p-2 min-w-[200px]">
                                    <h3 className="font-bold text-[#111c2d] text-lg font-['Plus_Jakarta_Sans']">
                                        {business.name}
                                    </h3>
                                    <p className="text-sm text-[#3e4947] mt-1">
                                        {category?.name_es || 'Lugar'}
                                    </p>
                                    <button
                                        onClick={() => window.open(
                                            `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`,
                                            '_blank'
                                        )}
                                        className="mt-2 w-full bg-[#005c55] text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#0f766e] transition-colors"
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