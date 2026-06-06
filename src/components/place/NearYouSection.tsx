// src/components/place/NearYouSection.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import PlaceCard from './PlaceCard';

// ─── Tipos ────────────────────────────────────────────────────
interface Category { id: string; name_es: string; icon: string; color_hex: string; }
interface Business {
    id: string; name: string; latitude: number; longitude: number;
    business_categories: { categories: Category }[];
    business_photos: { url: string; is_primary: boolean }[];
}

interface TransportRoute {
    point_a_name: string; point_a_lat: number | null; point_a_lng: number | null;
    point_b_name: string; point_b_lat: number | null; point_b_lng: number | null;
    fare_amount: number | null; fare_type: string; sort_order: number;
}
interface Transport {
    id: string; name: string; logo_url: string | null;
    service_type: string; latitude: number | null; longitude: number | null;
    transport_types: { name_es: string };
    transport_modalities: { color_hex: string };
    transport_routes: TransportRoute[];
    // Calculado en cliente
    distanceKm?: number;
    closestPointName?: string;
}

interface ActivityItem {
    id: string; name: string;
    difficulty: string;
    duration_minutes: number | null;
    price_from: number | null;
    meeting_point_lat: number | null; meeting_point_lng: number | null;
    meeting_point_name: string | null;
    activity_photos: { url: string; is_primary: boolean }[];
    activity_tags: { name_es: string }[];
    distanceKm?: number;
}

interface NearYouSectionProps {
    userLocation?: [number, number] | null;
}

// ─── Helpers ─────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function getTransportIcon(type?: string) {
    if (!type) return '🚍';
    const t = type.toLowerCase();
    if (t.includes('bus') || t.includes('ómnibus') || t.includes('coach')) return '🚌';
    if (t.includes('train') || t.includes('tren')) return '🚆';
    if (t.includes('ferry') || t.includes('barco') || t.includes('ship')) return '⛴️';
    if (t.includes('tram') || t.includes('tranv')) return '🚋';
    if (t.includes('taxi')) return '🚕';
    return '🚍';
}

// ─── Componente ───────────────────────────────────────────────
export default function NearYouSection({ userLocation }: NearYouSectionProps) {
    const t = useTranslations('home');
    const tTrans = useTranslations('transport');
    const tAct = useTranslations('activities');
    const locale = useLocale();
    const router = useRouter();

    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [transports, setTransports] = useState<Transport[]>([]);
    const [actItems, setActItems] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'lugares' | 'transportes' | 'actividades'>('lugares');

    // Estándares visuales para consistencia entre cards
    const CARD_WIDTH = 220;
    const CARD_BG = '#f9f9ff';
    const CARD_BORDER = '1px solid rgba(189,201,198,0.3)';
    const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.08)';
    const IMAGE_HEIGHT_TRANSPORT = 80;
    const IMAGE_HEIGHT_ACTIVITY = 100;

    useEffect(() => {
        let cancelled = false;
        const fetch = async () => {
            setLoading(true);
            const supabase = createClient();

            const [bRes, tRes, aRes] = await Promise.all([
                // Negocios (query original intacta)
                supabase
                    .from('businesses')
                    .select(`
                        id, name, latitude, longitude,
                        business_categories ( categories ( id, name_es, icon, color_hex ) ),
                        business_photos ( url, is_primary )
                    `)
                    .eq('is_active', true)
                    .limit(10),

                // Transportes
                supabase
                    .from('transports')
                    .select(`
                        id, name, logo_url, service_type, latitude, longitude,
                        transport_types:transport_type_id ( name_es ),
                        transport_modalities:modality_id ( color_hex ),
                        transport_routes (
                            point_a_name, point_a_lat, point_a_lng,
                            point_b_name, point_b_lat, point_b_lng,
                            fare_amount, fare_type, sort_order
                        )
                    `)
                    .eq('is_active', true),

                // Actividades
                supabase
                    .from('activities')
                    .select(`
                        id, name, difficulty, duration_minutes, price_from,
                        meeting_point_lat, meeting_point_lng, meeting_point_name,
                        activity_photos ( url, is_primary ),
                        activity_tags!activity_tag_assignments ( name_es )
                    `)
                    .eq('is_active', true),
            ]);

            if (!cancelled) {
                // Calcular distancia mínima para cada transporte
                const transWithDist: Transport[] = ((tRes.data ?? []) as any[]).map(tr => {
                    let minDist = Infinity;
                    let closestPoint = tr.name;

                    if (userLocation) {
                        const pts: { lat: number; lng: number; name: string }[] = [];
                        if (tr.latitude && tr.longitude)
                            pts.push({ lat: +tr.latitude, lng: +tr.longitude, name: tr.name });
                        for (const r of tr.transport_routes ?? []) {
                            if (r.point_a_lat) pts.push({ lat: +r.point_a_lat, lng: +r.point_a_lng, name: r.point_a_name });
                            if (r.point_b_lat) pts.push({ lat: +r.point_b_lat, lng: +r.point_b_lng, name: r.point_b_name });
                        }
                        for (const p of pts) {
                            const d = haversineKm(userLocation[0], userLocation[1], p.lat, p.lng);
                            if (d < minDist) { minDist = d; closestPoint = p.name; }
                        }
                    }

                    return {
                        ...tr,
                        distanceKm: isFinite(minDist) ? minDist : undefined,
                        closestPointName: closestPoint,
                    } as Transport;
                });

                // Ordenar por distancia
                transWithDist.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

                setBusinesses(bRes.data?.map((b: any) => ({
                    id: b.id, name: b.name,
                    latitude: b.latitude, longitude: b.longitude,
                    business_categories: b.business_categories || [],
                    business_photos: b.business_photos || [],
                })) ?? []);
                setTransports(transWithDist);

                // Actividades con distancia al meeting point
                const actWithDist: ActivityItem[] = ((aRes.data ?? []) as any[]).map(a => {
                    let dist = Infinity;
                    if (userLocation && a.meeting_point_lat && a.meeting_point_lng) {
                        dist = haversineKm(userLocation[0], userLocation[1],
                            +a.meeting_point_lat, +a.meeting_point_lng);
                    }
                    return { ...a, distanceKm: isFinite(dist) ? dist : undefined };
                });
                actWithDist.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
                setActItems(actWithDist);
                setLoading(false);
            }
        };
        fetch();
        return () => { cancelled = true; };
    }, [userLocation]);

    // ── Cálculo de distancia para negocios ────────────────────
    const calcDist = (lat: number, lng: number) =>
        userLocation ? haversineKm(userLocation[0], userLocation[1], lat, lng) : 0;

    if (loading) {
        return (
            <div style={{
                backgroundColor: '#ffffff', borderTopLeftRadius: 12, borderTopRightRadius: 12,
                boxShadow: '0 -8px 24px rgba(15,118,110,0.08)', borderTop: '1px solid #E2E8F0',
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
                    <div style={{ width: 48, height: 6, backgroundColor: '#bdc9c6', borderRadius: 9999 }} />
                </div>
                <div style={{ padding: '0 20px 24px' }}>
                    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{
                                flexShrink: 0, width: 220, height: 200,
                                backgroundColor: '#e7eeff', borderRadius: 8
                            }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (businesses.length === 0 && transports.length === 0) return null;

    return (
        <div style={{
            backgroundColor: '#ffffff', borderTopLeftRadius: 12, borderTopRightRadius: 12,
            boxShadow: '0 -8px 24px rgba(15,118,110,0.08)', borderTop: '1px solid #E2E8F0',
            display: 'flex', flexDirection: 'column',
            paddingBottom: 88, // espacio para la barra inferior fija
        }}>
            {/* Grabber */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8, cursor: 'grab', flexShrink: 0 }}>
                <div style={{ width: 48, height: 6, backgroundColor: '#bdc9c6', borderRadius: 9999 }} />
            </div>

            {/* Header con tabs */}
            <div style={{ padding: '0 20px 0', flexShrink: 0 }}>
                {/* Tabs: Lugares | Transportes */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2E8F0', marginBottom: 12 }}>
                    <button
                        onClick={() => setActiveTab('lugares')}
                        style={{
                            padding: '8px 0', marginRight: 20, background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                            color: activeTab === 'lugares' ? '#005c55' : '#6e7977',
                            borderBottom: activeTab === 'lugares' ? '2px solid #005c55' : '2px solid transparent',
                            transition: 'all 0.15s',
                        }}
                    >
                        {t('nearYou')}
                    </button>
                    {transports.length > 0 && (
                        <button
                            onClick={() => setActiveTab('transportes')}
                            style={{
                                padding: '8px 0', marginRight: 20, background: 'none', border: 'none',
                                cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                                color: activeTab === 'transportes' ? '#005c55' : '#6e7977',
                                borderBottom: activeTab === 'transportes' ? '2px solid #005c55' : '2px solid transparent',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tTrans('pageTitle')}
                        </button>
                    )}
                    {actItems.length > 0 && (
                        <button
                            onClick={() => setActiveTab('actividades')}
                            style={{
                                padding: '8px 0', background: 'none', border: 'none',
                                cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                                color: activeTab === 'actividades' ? '#10B981' : '#6e7977',
                                borderBottom: activeTab === 'actividades' ? '2px solid #10B981' : '2px solid transparent',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tAct('pageTitle')}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tab Lugares (original intacto) ── */}
            {activeTab === 'lugares' && (
                <div style={{
                    display: 'flex', overflowX: 'auto', gap: 16,
                    padding: '0 20px 24px', scrollSnapType: 'x mandatory',
                    msOverflowStyle: 'none', scrollbarWidth: 'none', flexGrow: 1,
                }} className="hide-scrollbar">
                    {businesses.map(business => {
                        const category = business.business_categories?.[0]?.categories;
                        const primaryPhoto = business.business_photos?.find(p => p.is_primary) || business.business_photos?.[0];
                        const dist = calcDist(business.latitude, business.longitude);

                        return (
                            <div key={business.id} style={{ scrollSnapAlign: 'start', flexShrink: 0, width: CARD_WIDTH }}>
                                <div style={{ width: '100%' }}>
                                    <PlaceCard
                                        id={business.id}
                                        name={business.name}
                                        category={category?.name_es || 'Lugar'}
                                        categoryIcon={category?.icon || 'map-pin'}
                                        categoryColor={category?.color_hex || '#005c55'}
                                        distance={formatDist(dist)}
                                        imageUrl={primaryPhoto?.url}
                                        onClick={() => router.push(`/${locale}/places/${business.id}`)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Tab Transportes ── */}
            {activeTab === 'transportes' && (
                <div style={{
                    display: 'flex', overflowX: 'auto', gap: 16,
                    padding: '0 20px 24px', scrollSnapType: 'x mandatory',
                    msOverflowStyle: 'none', scrollbarWidth: 'none', flexGrow: 1,
                }} className="hide-scrollbar">
                    {transports.map(tr => {
                        const bestRoute = [...(tr.transport_routes ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
                        const accentColor = tr.transport_modalities?.color_hex || '#0EA5E9';

                        return (
                            <div key={tr.id} style={{ scrollSnapAlign: 'start', flexShrink: 0, width: CARD_WIDTH }}>
                                <div
                                    onClick={() => router.push(`/${locale}/transport/${tr.id}`)}
                                    style={{
                                        width: '100%', backgroundColor: CARD_BG, borderRadius: 8,
                                        border: CARD_BORDER, overflow: 'hidden',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                        boxShadow: CARD_SHADOW,
                                    }}
                                >
                                    {/* Imagen / logo */}
                                    <div style={{
                                        height: IMAGE_HEIGHT_TRANSPORT, backgroundColor: `${accentColor}18`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 36, position: 'relative',
                                    }}>
                                        {tr.logo_url ? (
                                            <img src={tr.logo_url} alt={tr.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                            <span>⚓</span>
                                        )}
                                        {/* Badge tipo */}
                                        <span style={{
                                            position: 'absolute', top: 8, left: 8,
                                            backgroundColor: accentColor, color: 'white',
                                            fontSize: 10, fontWeight: 700, padding: '2px 8px',
                                            borderRadius: 9999,
                                        }}>
                                            {tr.transport_types?.name_es}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <h3 style={{
                                            margin: 0, fontSize: 14, fontWeight: 600,
                                            color: '#111c2d', fontFamily: "'Inter', sans-serif",
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {tr.name}
                                        </h3>

                                        {/* Ruta principal */}
                                        {bestRoute && (
                                            <p style={{ margin: 0, fontSize: 11, color: '#3e4947' }}>
                                                {bestRoute.point_a_name} → {bestRoute.point_b_name}
                                                {bestRoute.fare_amount ? ` · $${bestRoute.fare_amount}` : ''}
                                            </p>
                                        )}

                                        {/* Distancia — solo texto (sin badge/icon) */}
                                        <div style={{ marginTop: 8 }}>
                                            <span style={{
                                                fontSize: 12,
                                                lineHeight: '16px',
                                                letterSpacing: '0.02em',
                                                fontFamily: "'Inter', sans-serif",
                                                fontWeight: 500,
                                                color: '#005c55'
                                            }}>{tr.distanceKm !== undefined ? formatDist(tr.distanceKm) : ''}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* ── Tab Actividades ── */}
            {activeTab === 'actividades' && (
                <div style={{
                    display: 'flex', overflowX: 'auto', gap: 16,
                    padding: '0 20px 24px', scrollSnapType: 'x mandatory',
                    msOverflowStyle: 'none', scrollbarWidth: 'none', flexGrow: 1,
                }} className="hide-scrollbar">
                    {actItems.map(a => {
                        const photo = a.activity_photos?.find(p => p.is_primary) ?? a.activity_photos?.[0];
                        const DIFF_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
                            facil: { bg: '#D1FAE5', text: '#065F46', icon: '✓' },
                            moderado: { bg: '#FEF3C7', text: '#92400E', icon: '🚶' },
                            dificil: { bg: '#FFE4E6', text: '#9F1239', icon: '⛰' },
                            extremo: { bg: '#FEE2E2', text: '#991B1B', icon: '⚠' },
                        };
                        const diff = DIFF_CONFIG[a.difficulty] ?? DIFF_CONFIG.facil;

                        return (
                            <div key={a.id} style={{ scrollSnapAlign: 'start', flexShrink: 0, width: CARD_WIDTH }}>
                                <div
                                    onClick={() => router.push(`/${locale}/activities/${a.id}`)}
                                    style={{
                                        width: '100%', backgroundColor: CARD_BG, borderRadius: 8,
                                        border: CARD_BORDER, overflow: 'hidden',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                        boxShadow: CARD_SHADOW,
                                    }}
                                >
                                    {/* Imagen */}
                                    <div style={{
                                        height: IMAGE_HEIGHT_ACTIVITY, position: 'relative', overflow: 'hidden',
                                        backgroundColor: '#d8e3fb'
                                    }}>
                                        {photo?.url
                                            ? <img src={photo.url} alt={a.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                            : <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                height: '100%', fontSize: 32
                                            }}>🌿</div>
                                        }
                                        <span style={{
                                            position: 'absolute', top: 8, right: 8,
                                            backgroundColor: diff.bg, color: diff.text,
                                            fontSize: 10, fontWeight: 700, padding: '2px 8px',
                                            borderRadius: 9999
                                        }}>
                                            {diff.icon} {tAct(`difficulty_${a.difficulty}` as Parameters<typeof tAct>[0])}
                                        </span>
                                    </div>
                                    {/* Info */}
                                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <h3 style={{
                                            margin: 0, fontSize: 13, fontWeight: 600, color: '#111c2d',
                                            fontFamily: "'Inter', sans-serif", lineHeight: '1.3'
                                        }}>
                                            {a.name}
                                        </h3>
                                        {a.duration_minutes && (
                                            <p style={{ margin: 0, fontSize: 11, color: '#3e4947' }}>
                                                ⏱ {a.duration_minutes >= 60
                                                    ? `${Math.floor(a.duration_minutes / 60)}h`
                                                    : `${a.duration_minutes}min`}
                                                {a.price_from ? ` · $${a.price_from}/persona` : ''}
                                            </p>
                                        )}
                                        {/* Distancia — solo texto (sin badge/icon) */}
                                        <div style={{ marginTop: 8 }}>
                                            <span style={{
                                                fontSize: 12,
                                                lineHeight: '16px',
                                                letterSpacing: '0.02em',
                                                fontFamily: "'Inter', sans-serif",
                                                fontWeight: 500,
                                                color: '#005c55'
                                            }}>{a.distanceKm !== undefined ? formatDist(a.distanceKm) : ''}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}