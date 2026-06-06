// src/components/map/LeafletMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createClient } from '@/lib/supabase/client';
import { Navigation } from 'lucide-react';

const PUERTO_JIMENEZ_CENTER: [number, number] = [8.5333, -83.3167];

// ─────────────────────────────────────────────────────────────
// ÍCONO SVG POR NOMBRE DE ÍCONO LUCIDE
// Estilo Google Maps: círculo de color + ícono SVG blanco
// Extensible: agregar nuevas entradas al map cuando se agreguen
// nuevas categorías (tours, actividades, eventos, servicios, POI)
// ─────────────────────────────────────────────────────────────
const ICON_SVG: Record<string, string> = {

    // ── Gastronomía ──────────────────────────────────────────
    'utensils': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
        <path d="M7 2v20"/>
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v7"/>
    </svg>`,

    // ── Hospedaje ────────────────────────────────────────────
    'bed': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 4v16"/>
        <path d="M2 8h18a2 2 0 0 1 2 2v10"/>
        <path d="M2 17h20"/>
        <path d="M6 8v9"/>
    </svg>`,

    // ── Naturaleza / Eco ─────────────────────────────────────
    'tree': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22V12"/>
        <path d="M12 12C10.3 10.3 6.5 9.5 4 11.5L12 3l8 8.5c-2.5-2-6.3-1.2-8 .5z"/>
    </svg>`,

    // ── Servicios ────────────────────────────────────────────
    'pill': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
        <circle cx="18" cy="18" r="3"/><path d="m22 22-1.5-1.5"/>
    </svg>`,

    // ── Tours y Actividades ──────────────────────────────────
    'compass': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="white" stroke="none"/>
    </svg>`,

    // ── Transporte Terrestre — Vehículo ──────────────────────
    'car': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17H5a2 2 0 0 1-2-2V9l3-4h12l3 4v6a2 2 0 0 1-2 2z"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>`,

    // ── Transporte Terrestre — Autobús ───────────────────────
    'bus': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 6v6M15 6v6M2 12h19.6"/>
        <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
        <circle cx="7" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
    </svg>`,

    // ── Transporte Terrestre — Shuttle ───────────────────────
    'truck': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>`,

    // ── Transporte Terrestre — TukTuk / Otros ────────────────
    'zap': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="white" stroke="none"/>
    </svg>`,

    // ── Transporte Terrestre — Porteo / Privado ──────────────
    'briefcase': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="12"/>
    </svg>`,

    // ── Transporte Marítimo — Lancha ─────────────────────────
    'anchor': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="5" r="3"/>
        <line x1="12" y1="22" x2="12" y2="8"/>
        <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
    </svg>`,

    // ── Transporte Marítimo — Catamarán ──────────────────────
    'waves': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    </svg>`,

    // ── Transporte Marítimo — Ferry ──────────────────────────
    'ship': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
        <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
        <path d="M12 10v4"/><path d="M12 2v3"/>
    </svg>`,

    // ── Transporte Marítimo — Lancha colectiva ───────────────
    'users': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,

    // ── Transporte Aéreo ─────────────────────────────────────
    'plane': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 21 4s-2 0-3.5 1.5L14 9 5.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 3.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.1z"/>
    </svg>`,

    // ── Eventos (futuro) ─────────────────────────────────────
    'calendar': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>`,

    // ── Actividades (futuro) ─────────────────────────────────
    'activity': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
    </svg>`,

    // ── Punto de interés / default ───────────────────────────
    'map-pin': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
    </svg>`,
};

// ─────────────────────────────────────────────────────────────
// Función única de marcador — misma para negocios y transportes
// Estilo Google Maps: círculo de color + ícono SVG blanco
// ─────────────────────────────────────────────────────────────
function createMarkerIcon(iconName: string, color: string): L.DivIcon {
    const svg = ICON_SVG[iconName] || ICON_SVG['map-pin'];
    return L.divIcon({
        className: 'osago-marker',
        html: `<div style="
            background-color:${color};
            width:40px;height:40px;border-radius:50%;
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.30),0 0 0 1px rgba(0,0,0,0.06);
            display:flex;align-items:center;justify-content:center;
            transition:transform 0.15s;">
            ${svg}
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24],
    });
}

// ─── Control de localización (sin cambios) ────────────────────
function LocateUserControl() {
    const map = useMap();
    const mountedRef = useRef(true);

    const locateUser = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (!mountedRef.current) return;
                    const { latitude, longitude } = position.coords;
                    map.setView([latitude, longitude], 15, { animate: true });
                    const userIcon = L.divIcon({
                        className: 'user-location-marker',
                        html: `<div style="
                            background-color:#005c55;width:18px;height:18px;
                            border-radius:50%;border:3px solid white;
                            box-shadow:0 0 0 2px #005c55,0 2px 8px rgba(0,0,0,0.3);">
                        </div>`,
                        iconSize: [18, 18], iconAnchor: [9, 9],
                    });
                    L.marker([latitude, longitude], { icon: userIcon })
                        .addTo(map).bindPopup('Tu ubicación');
                },
                (error) => console.warn('Geolocalización denegada:', error)
            );
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        locateUser();
        return () => { mountedRef.current = false; };
    }, [map]);

    useEffect(() => {
        const LocateButton = L.Control.extend({
            onAdd: () => {
                const btn = L.DomUtil.create('button', 'locate-button');
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>`;
                btn.style.cssText = `width:48px;height:48px;background:white;border:1px solid #E2E8F0;
                    border-radius:50%;display:flex;align-items:center;justify-content:center;
                    cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);color:#005c55;transition:all 0.2s;`;
                btn.onmouseover = () => { btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; btn.style.transform = 'scale(1.05)'; };
                btn.onmouseout = () => { btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; btn.style.transform = 'scale(1)'; };
                L.DomEvent.disableClickPropagation(btn);
                L.DomEvent.on(btn, 'click', () => locateUser());
                return btn;
            },
        });
        const control = new LocateButton({ position: 'topright' });
        control.addTo(map);
        return () => { control.remove(); };
    }, [map]);

    return null;
}

// ─── Tipos ────────────────────────────────────────────────────
interface ActivityPoint {
    activityId: string; activityName: string;
    difficulty: string; icon: string; color: string;
    lat: number; lng: number;
    meetingPointName: string; priceFrom?: number;
}

interface TransportPoint {
    transportId: string; transportName: string;
    tipo: string; typeIcon: string; color: string;
    lat: number; lng: number;
    pointName: string; routeName: string; fare?: number;
}

// ─── Componente principal ─────────────────────────────────────
export default function LeafletMap() {
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [transportPoints, setTransportPoints] = useState<TransportPoint[]>([]);
    const [activityPoints, setActivityPoints] = useState<ActivityPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    useEffect(() => {
        let cancelled = false;

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        navigator.geolocation?.getCurrentPosition(
            pos => { if (!cancelled) setUserLocation([pos.coords.latitude, pos.coords.longitude]); },
            () => console.warn('Geolocalización no disponible')
        );

        const fetchData = async () => {
            try {
                const supabase = createClient();
                const [bResult, tResult, aResult] = await Promise.all([
                    supabase
                        .from('businesses')
                        .select(`
                            id, name, latitude, longitude,
                            business_categories ( categories ( id, name_es, icon, color_hex ) )
                        `)
                        .eq('is_active', true)
                        .limit(50),

                    supabase
                        .from('transports')
                        .select(`
                            id, name, service_type, latitude, longitude,
                            transport_modalities:modality_id ( icon, color_hex ),
                            transport_types:transport_type_id ( name_es, icon ),
                            transport_routes (
                                point_a_name, point_a_lat, point_a_lng,
                                point_b_name, point_b_lat, point_b_lng,
                                fare_amount, sort_order
                            )
                        `)
                        .eq('is_active', true),
                    supabase
                        .from('activities')
                        .select(`
                            id, name, difficulty, price_from,
                            meeting_point_name, meeting_point_lat, meeting_point_lng
                        `)
                        .eq('is_active', true)
                        .not('meeting_point_lat', 'is', null),
                ]);

                if (!cancelled) {
                    setBusinesses(bResult.data ?? []);

                    const points: TransportPoint[] = [];
                    const seen = new Set<string>();

                    for (const tr of (tResult.data ?? []) as any[]) {
                        const color = tr.transport_modalities?.color_hex || '#6366F1';
                        const typeIcon = tr.transport_types?.icon || 'car';
                        const tipo = tr.transport_types?.name_es || '';
                        const routes = [...(tr.transport_routes ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);

                        if (tr.service_type === 'zona' && tr.latitude && tr.longitude) {
                            points.push({
                                transportId: tr.id, transportName: tr.name,
                                tipo, typeIcon, color, lat: +tr.latitude, lng: +tr.longitude,
                                pointName: tr.name, routeName: 'Zona de servicio'
                            });
                        } else {
                            for (const r of routes) {
                                const routeName = `${r.point_a_name} – ${r.point_b_name}`;
                                const fare = r.fare_amount ? +r.fare_amount : undefined;
                                if (r.point_a_lat) {
                                    const key = `${r.point_a_lat},${r.point_a_lng}`;
                                    if (!seen.has(key)) {
                                        seen.add(key);
                                        points.push({
                                            transportId: tr.id, transportName: tr.name,
                                            tipo, typeIcon, color, lat: +r.point_a_lat, lng: +r.point_a_lng,
                                            pointName: r.point_a_name, routeName, fare
                                        });
                                    }
                                }
                                if (r.point_b_lat) {
                                    const key = `${r.point_b_lat},${r.point_b_lng}`;
                                    if (!seen.has(key)) {
                                        seen.add(key);
                                        points.push({
                                            transportId: tr.id, transportName: tr.name,
                                            tipo, typeIcon, color, lat: +r.point_b_lat, lng: +r.point_b_lng,
                                            pointName: r.point_b_name, routeName, fare
                                        });
                                    }
                                }
                            }
                        }
                    }
                    setTransportPoints(points);

                    // Actividades — marcadores en meeting point
                    const DIFF_COLORS: Record<string, string> = {
                        facil: '#065F46', moderado: '#92400E', dificil: '#9F1239', extremo: '#991B1B'
                    };
                    const DIFF_BG: Record<string, string> = {
                        facil: '#D1FAE5', moderado: '#FEF3C7', dificil: '#FFE4E6', extremo: '#FEE2E2'
                    };
                    const actPts: ActivityPoint[] = ((aResult.data ?? []) as any[])
                        .filter(a => a.meeting_point_lat && a.meeting_point_lng)
                        .map(a => ({
                            activityId: a.id,
                            activityName: a.name,
                            difficulty: a.difficulty,
                            icon: 'compass',
                            color: DIFF_BG[a.difficulty] || '#D1FAE5',
                            lat: +a.meeting_point_lat,
                            lng: +a.meeting_point_lng,
                            meetingPointName: a.meeting_point_name ?? a.name,
                            priceFrom: a.price_from ?? undefined,
                        }));
                    setActivityPoints(actPts);
                }
            } catch (err) {
                console.error('Unexpected error:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh] bg-[#f9f9ff] rounded-xl">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#005c55]" />
            </div>
        );
    }

    const getLocale = () =>
        typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'es' : 'es';

    return (
        <div className="relative w-full h-[60vh] rounded-xl overflow-hidden shadow-lg border border-[#E2E8F0]">
            <MapContainer
                center={userLocation || PUERTO_JIMENEZ_CENTER}
                zoom={userLocation ? 14 : 11}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                <LocateUserControl />

                {/* ── Marcadores de negocios ── */}
                {businesses.map((business) => {
                    const category = business.business_categories?.[0]?.categories;
                    return (
                        <Marker
                            key={business.id}
                            position={[business.latitude, business.longitude]}
                            icon={createMarkerIcon(category?.icon || 'map-pin', category?.color_hex || '#005c55')}
                        >
                            <Popup>
                                <div className="p-2 min-w-[200px]">
                                    <p className="text-[10px] font-bold uppercase tracking-wide mb-1"
                                        style={{ color: category?.color_hex || '#005c55' }}>
                                        {category?.name_es || 'Lugar'}
                                    </p>
                                    <h3 className="font-bold text-[#111c2d] text-base font-['Plus_Jakarta_Sans']">
                                        {business.name}
                                    </h3>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => { window.location.href = `/${getLocale()}/places/${business.id}`; }}
                                            className="flex-1 bg-[#e7eeff] text-[#005c55] py-1.5 rounded-lg
                                                       text-xs font-semibold hover:bg-[#d8e3fb] transition-colors">
                                            Ver detalle
                                        </button>
                                        <button
                                            onClick={() => window.open(
                                                `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`, '_blank'
                                            )}
                                            className="flex-1 bg-[#005c55] text-white py-1.5 rounded-lg
                                                       text-xs font-semibold flex items-center justify-center gap-1
                                                       hover:bg-[#0f766e] transition-colors">
                                            <Navigation size={11} />
                                            Cómo llegar
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* ── Marcadores de actividades (meeting point) ── */}
                {activityPoints.map((ap, idx) => {
                    const icon = createMarkerIcon(ap.icon, '#10B981');
                    return (
                        <Marker key={`ap-${ap.activityId}-${idx}`}
                            position={[ap.lat, ap.lng]} icon={icon}>
                            <Popup>
                                <div className="p-2 min-w-[200px]">
                                    <p className="text-[10px] font-bold uppercase tracking-wide mb-1"
                                        style={{ color: '#065F46' }}>
                                        Tour / Actividad
                                    </p>
                                    <h3 className="font-bold text-[#111c2d] text-base font-['Plus_Jakarta_Sans']">
                                        {ap.activityName}
                                    </h3>
                                    <p className="text-xs text-[#3e4947] mt-0.5">
                                        📍 {ap.meetingPointName}
                                        {ap.priceFrom ? ` · Desde $${ap.priceFrom}` : ''}
                                    </p>
                                    <button
                                        onClick={() => { window.location.href = `/${getLocale()}/activities/${ap.activityId}`; }}
                                        className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold
                                                   text-white flex items-center justify-center gap-1.5 transition-colors
                                                   bg-[#10B981] hover:bg-[#059669]">
                                        <Navigation size={11} />
                                        Ver actividad
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* ── Marcadores de transporte ── */}
                {transportPoints.map((tp, idx) => (
                    <Marker
                        key={`tp-${tp.transportId}-${idx}`}
                        position={[tp.lat, tp.lng]}
                        icon={createMarkerIcon(tp.typeIcon, tp.color)}
                    >
                        <Popup>
                            <div className="p-2 min-w-[200px]">
                                <p className="text-[10px] font-bold uppercase tracking-wide mb-1"
                                    style={{ color: tp.color }}>
                                    {tp.tipo}
                                </p>
                                <h3 className="font-bold text-[#111c2d] text-base font-['Plus_Jakarta_Sans']">
                                    {tp.transportName}
                                </h3>
                                <p className="text-xs text-[#3e4947] mt-0.5">📍 {tp.pointName}</p>
                                <p className="text-xs text-[#6e7977]">
                                    {tp.routeName}{tp.fare ? ` · $${tp.fare}/persona` : ''}
                                </p>
                                <button
                                    onClick={() => { window.location.href = `/${getLocale()}/transport/${tp.transportId}`; }}
                                    className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold
                                               text-white flex items-center justify-center gap-1.5 transition-colors"
                                    style={{ backgroundColor: tp.color }}>
                                    <Navigation size={11} />
                                    Ver servicio
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}