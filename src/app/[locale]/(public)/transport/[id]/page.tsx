// src/app/[locale]/(public)/transport/[id]/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, MapPin, Clock, ChevronDown, ChevronUp, MessageCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import PlaceGallery from '@/components/place/PlaceGallery';
// Sin BottomNav — detalle usa back arrow + sticky footer

// ─── Tipos ────────────────────────────────────────────────────
interface Schedule {
    id: string; direction: string;
    departure_time: string;   // raw "HH:MM:SS" de BD
    days_of_week: number[];
    notes: string | null;
}
interface RouteService { id: string; name_es: string; name_en: string; icon: string; }

interface Route {
    id: string; name: string | null;
    point_a_name: string; point_a_lat: number | null; point_a_lng: number | null;
    point_b_name: string; point_b_lat: number | null; point_b_lng: number | null;
    fare_amount: number | null; fare_currency: string; fare_type: string; fare_notes: string | null;
    duration_minutes: number | null; sort_order: number;
    transport_route_schedules: Schedule[];
    transport_route_services: RouteService[];
}

interface PaymentMethod { id: string; name_es: string; }

interface Transport {
    id: string; name: string; description_es: string | null; logo_url: string | null;
    phone: string | null; whatsapp: string | null; email: string | null; website: string | null;
    service_type: string;
    plan: string;  // 'free' | 'premium' | 'destacado'
    transport_modalities: { name_es: string; icon: string; color_hex: string };
    transport_types: { name_es: string; icon: string };
    transport_routes: Route[];
    transport_photos: { url: string; is_primary: boolean; order_index: number }[];
    payment_methods: PaymentMethod[];  // via !transport_payment_methods
}

// ─── Helpers ─────────────────────────────────────────────────

// FIX: formato de hora según locale (igual que places/[id])
// FR, DE, IT → 24h | ES, EN → 12h con a.m./p.m.
function formatTime(raw: string, locale: string): string {
    const [h, m] = raw.split(':').map(Number);
    if (['fr', 'de', 'it'].includes(locale)) {
        return `${h}:${m.toString().padStart(2, '0')}`;
    }
    const p = h >= 12 ? 'p.m.' : 'a.m.';
    return `${(h % 12 || 12).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${p}`;
}

// FIX: mapeo patrón de días → clave i18n en transport.days
// Coincide exactamente con las claves del JSON
const DAY_KEY_MAP: Record<string, string> = {
    '1,2,3,4,5': 'weekdays',
    '6': 'saturday',
    '0': 'sunday',
    '0,6': 'weekend',
    '1,2,3,4,5,6': 'monToSat',
    '0,1,2,3,4,5,6': 'daily',
    '0,5,6': 'friToSun',
};

// Nombres de día cortos para patrones no mapeados (fallback)
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface ScheduleGroup {
    dayKey: string;   // clave i18n — 'weekdays' | 'saturday' | etc.
    dayFallback: string; // texto si la clave no existe
    sortKey: number;
    a_to_b: { rawTime: string; notes?: string }[];
    b_to_a: { rawTime: string; notes?: string }[];
}

function groupSchedules(schedules: Schedule[]): ScheduleGroup[] {
    const map = new Map<string, ScheduleGroup>();
    for (const s of schedules) {
        const sorted = [...s.days_of_week].sort((a, b) => a - b);
        const key = sorted.join(',');
        if (!map.has(key)) {
            const hasWD = sorted.some(d => d >= 1 && d <= 5);
            map.set(key, {
                dayKey: DAY_KEY_MAP[key] ?? '__unknown__',
                dayFallback: sorted.map(d => DAY_SHORT[d] ?? d).join(', '),
                sortKey: hasWD ? 0 : sorted.includes(6) && !sorted.includes(0) ? 1 : 2,
                a_to_b: [],
                b_to_a: [],
            });
        }
        const g = map.get(key)!;
        // Guardar tiempo RAW — se formatea al renderizar con locale
        const e = { rawTime: s.departure_time, notes: s.notes ?? undefined };
        if (s.direction === 'a_to_b') g.a_to_b.push(e);
        else g.b_to_a.push(e);
    }
    for (const g of map.values()) {
        g.a_to_b.sort((a, b) => a.rawTime.localeCompare(b.rawTime));
        g.b_to_a.sort((a, b) => b.rawTime.localeCompare(a.rawTime));
    }
    return [...map.values()].sort((a, b) => a.sortKey - b.sortKey);
}

function isOperatingNow(routes: Route[]): boolean {
    const now = new Date();
    const todayDow = now.getDay();
    const cur = now.getHours() * 60 + now.getMinutes();
    for (const r of routes) {
        for (const s of r.transport_route_schedules) {
            if (!s.days_of_week.includes(todayDow)) continue;
            const [sh, sm] = s.departure_time.split(':').map(Number);
            if (Math.abs(cur - (sh * 60 + sm)) <= 120) return true;
        }
    }
    return false;
}

// ─── Íconos de servicio a bordo ───────────────────────────────
const SERVICE_ICONS: Record<string, React.ReactNode> = {
    shield: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    wifi: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" /></svg>,
    wind: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></svg>,
    users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    umbrella: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" /></svg>,
};

// ─── Tabla de horarios — locale-aware ─────────────────────────
function ScheduleTable({ route }: { route: Route }) {
    const t = useTranslations('transport');
    const locale = useLocale();                          // ← FIX: formato según locale
    const groups = useMemo(() => groupSchedules(route.transport_route_schedules), [route]);
    const hasNotes = route.transport_route_schedules.some(s => s.notes);

    return (
        <div className="mt-4 rounded-xl border border-[#bdc9c6]/40 overflow-hidden bg-white">
            {/* Header con nombres de puntos */}
            <div className="grid grid-cols-2 bg-[#005c55] text-white text-sm font-semibold">
                <div className="px-4 py-2.5 text-center">{route.point_a_name}</div>
                <div className="px-4 py-2.5 text-center border-l border-white/20">{route.point_b_name}</div>
            </div>

            {groups.map((g, gi) => {
                // FIX: usar clave i18n para el día, fallback si no existe
                const dayLabel = g.dayKey !== '__unknown__'
                    ? t(`days.${g.dayKey}` as Parameters<typeof t>[0])
                    : g.dayFallback;

                return (
                    <div key={gi}>
                        {/* Separador de días */}
                        <div className="text-center text-xs font-bold text-[#3e4947] bg-[#f0f7f4]
                                        py-1.5 border-y border-[#bdc9c6]/30 tracking-wide uppercase">
                            {dayLabel}
                        </div>

                        {/* Filas paralelas — FIX: formatear con locale */}
                        {Array.from({ length: Math.max(g.a_to_b.length, g.b_to_a.length) }).map((_, i) => (
                            <div key={i} className={`grid grid-cols-2 text-sm
                                ${i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9ff]'}`}>
                                <div className="px-4 py-2 text-center font-medium text-[#111c2d]">
                                    {g.a_to_b[i] ? formatTime(g.a_to_b[i].rawTime, locale) : '—'}
                                    {g.a_to_b[i]?.notes && <span className="text-[10px] text-[#fea619] ml-1">*</span>}
                                </div>
                                <div className="px-4 py-2 text-center font-medium text-[#111c2d] border-l border-[#bdc9c6]/20">
                                    {g.b_to_a[i] ? formatTime(g.b_to_a[i].rawTime, locale) : '—'}
                                    {g.b_to_a[i]?.notes && <span className="text-[10px] text-[#fea619] ml-1">*</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}

            {hasNotes && (
                <p className="text-[11px] text-[#6e7977] px-4 py-2 bg-[#f9f9ff] border-t border-[#bdc9c6]/20">
                    * {t('scheduleNote')}
                </p>
            )}
        </div>
    );
}

// ─── Tarjeta de ruta colapsable ───────────────────────────────
function RouteCard({ route, isExpanded, onToggle }: {
    route: Route; isExpanded: boolean; onToggle: () => void;
}) {
    const t = useTranslations('transport');
    const fareLabel = route.fare_type === 'fijo' ? t('fareFixed')
        : route.fare_type === 'por_viaje' ? t('perTrip')
            : t('perPerson');

    return (
        <div className={`rounded-xl border overflow-hidden transition-all duration-200
            ${isExpanded
                ? 'border-[#005c55] shadow-md bg-[#f9fffe]'
                : 'border-[#bdc9c6]/40 shadow-sm bg-white'}`}>

            <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#111c2d]">{route.point_a_name}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bdc9c6" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                        <span className="text-base font-bold text-[#111c2d]">{route.point_b_name}</span>
                    </div>
                    {route.duration_minutes && (
                        <span className="text-xs text-[#6e7977] flex items-center gap-1">
                            <Clock style={{ width: 12, height: 12 }} />
                            ~{route.duration_minutes >= 60
                                ? `${Math.floor(route.duration_minutes / 60)}h${route.duration_minutes % 60 > 0 ? ` ${route.duration_minutes % 60}min` : ''}`
                                : `${route.duration_minutes} min`}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {route.fare_amount != null && (
                        <div className="text-right">
                            <p className="text-xl font-bold text-[#005c55]">${route.fare_amount}</p>
                            <p className="text-[10px] text-[#6e7977]">{fareLabel}</p>
                        </div>
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                        ${isExpanded ? 'bg-[#005c55] text-white' : 'bg-[#e7eeff] text-[#3e4947]'}`}>
                        {isExpanded
                            ? <ChevronUp style={{ width: 16, height: 16 }} />
                            : <ChevronDown style={{ width: 16, height: 16 }} />}
                    </div>
                </div>
            </button>

            {isExpanded && (
                <div className="px-4 pb-5">
                    <ScheduleTable route={route} />

                    {(route.point_a_lat || route.point_b_lat) && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                            {route.point_a_lat && (
                                <a href={`https://maps.google.com/?q=${route.point_a_lat},${route.point_a_lng}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-semibold text-[#005c55]
                                              bg-[#e7f5f2] px-3 py-1.5 rounded-full border border-[#005c55]/20
                                              hover:bg-[#d0ede8] transition-colors">
                                    <MapPin style={{ width: 12, height: 12 }} />
                                    {t('viewLocation')} {route.point_a_name}
                                </a>
                            )}
                            {route.point_b_lat && (
                                <a href={`https://maps.google.com/?q=${route.point_b_lat},${route.point_b_lng}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-semibold text-[#005c55]
                                              bg-[#e7f5f2] px-3 py-1.5 rounded-full border border-[#005c55]/20
                                              hover:bg-[#d0ede8] transition-colors">
                                    <MapPin style={{ width: 12, height: 12 }} />
                                    {t('viewLocation')} {route.point_b_name}
                                </a>
                            )}
                        </div>
                    )}

                    {route.transport_route_services.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-semibold text-[#111c2d] mb-3">{t('onboardServices')}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {route.transport_route_services.map(s => (
                                    <div key={s.id}
                                        className="bg-white border border-[#bdc9c6]/40 rounded-xl p-4
                                                    flex flex-col items-center justify-center gap-2 text-center shadow-sm">
                                        <span className="text-[#005c55]">
                                            {SERVICE_ICONS[s.icon] ?? <MapPin width={24} height={24} />}
                                        </span>
                                        <span className="text-sm font-semibold text-[#111c2d] leading-tight">{s.name_es}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {route.fare_notes && (
                        <p className="mt-3 text-xs text-[#6e7977] italic">{route.fare_notes}</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────
export default function TransportDetailPage() {
    const { id } = useParams<{ id: string }>();
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('transport');

    const [transport, setTransport] = useState<Transport | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from('transports')
                .select(`
                    id, name, description_es, logo_url, phone, whatsapp, email, website, service_type, plan,
                    transport_modalities:modality_id ( name_es, icon, color_hex ),
                    transport_types:transport_type_id ( name_es, icon ),
                    transport_routes (
                        id, name, point_a_name, point_a_lat, point_a_lng,
                        point_b_name, point_b_lat, point_b_lng,
                        fare_amount, fare_currency, fare_type, fare_notes,
                        duration_minutes, sort_order,
                        transport_route_schedules ( id, direction, departure_time, days_of_week, notes ),
                        transport_route_services ( id, name_es, name_en, icon )
                    ),
                    transport_photos ( url, is_primary, order_index ),
                    payment_methods!transport_payment_methods ( id, name_es )
                `)
                .eq('id', id)
                .eq('is_active', true)
                .single();

            if (error) console.error('Transport detail error:', error.message);
            if (!cancelled && data) {
                const transportData = data as unknown as Transport;
                setTransport(transportData);
                const first = [...(transportData.transport_routes ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
                if (first) setExpandedRouteId(first.id);
            }
            if (!cancelled) setLoading(false);
        };
        load();
        return () => { cancelled = true; };
    }, [id]);

    const heroPhoto = useMemo(() => {
        const p = transport?.transport_photos ?? [];
        return (p.find(x => x.is_primary) ?? p.sort((a, b) => a.order_index - b.order_index)[0])?.url;
    }, [transport]);

    const sortedRoutes = useMemo(() =>
        [...(transport?.transport_routes ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        [transport]
    );

    const operating = useMemo(() =>
        transport ? isOperatingNow(transport.transport_routes ?? []) : false,
        [transport]
    );

    if (loading) return (
        <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#005c55] border-t-transparent animate-spin" />
        </div>
    );

    if (!transport) return (
        <div className="min-h-screen bg-[#f9f9ff] flex flex-col items-center justify-center gap-3">
            <p className="text-3xl">🚢</p>
            <p className="text-[#3e4947] font-semibold">{t('notFound')}</p>
            <button onClick={() => router.back()}
                className="text-[#005c55] text-sm font-semibold underline">{t('back')}</button>
        </div>
    );

    return (
        <>
            <main className="min-h-screen bg-[#f9f9ff] pb-[100px]">

                {/* Back flotante */}
                <a onClick={() => router.back()}
                    className="fixed top-5 left-5 z-50 w-12 h-12 rounded-full
                              bg-white/80 backdrop-blur-md shadow-sm border border-[#bdc9c6]/30
                              flex items-center justify-center text-[#005c55]
                              cursor-pointer active:scale-95 transition-transform">
                    <ArrowLeft style={{ width: 22, height: 22 }} />
                </a>

                {/* Hero — free: 1 imagen con gradiente | premium/destacado: galería PlaceGallery */}
                {transport.plan === 'free' ? (
                    /* FREE: hero single imagen */
                    <section className="relative w-full h-[397px] min-h-[350px] overflow-hidden bg-[#d8e3fb]">
                        {heroPhoto && (
                            <img src={heroPhoto} alt={transport.name}
                                className="w-full h-full object-cover object-center"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#f9f9ff] via-[#f9f9ff]/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 w-full px-5 pb-6 flex flex-col gap-3">
                            {operating && (
                                <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full w-max
                                                shadow-sm border border-[#bdc9c6]/20">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f766e]" />
                                    <span className="text-xs font-semibold text-[#3e4947]">{t('operatingNow')}</span>
                                </div>
                            )}
                            <h1 className="text-[40px] leading-[48px] font-bold text-[#111c2d]
                                           font-['Plus_Jakarta_Sans'] tracking-[-0.02em] drop-shadow-sm">
                                {transport.name}
                            </h1>
                        </div>
                    </section>
                ) : (
                    /* PREMIUM / DESTACADO: galería con carrusel (igual que places) */
                    <div className="relative px-5 pt-5">
                        <PlaceGallery
                            photos={transport.transport_photos}
                            businessName={transport.name}
                        />
                        {/* Botón back sobre la galería */}
                    </div>
                )}

                <main className="max-w-screen-xl mx-auto px-5 flex flex-col gap-8 -mt-2 relative z-10">
                    {/* Badges: solo Tipo + Métodos de pago (sin Modalidad) */}
                    <div className="flex flex-wrap gap-2">
                        {/* Subcategoría / Tipo */}
                        <span className="bg-[#e7eeff] text-[#005c55] px-3 py-1.5 rounded-full text-xs
                                         font-semibold inline-flex items-center gap-1.5 border border-[#005c55]/20">
                            {transport.transport_types?.name_es}
                        </span>
                        {/* Métodos de pago */}
                        {(transport.payment_methods ?? []).map((pm) => (
                            <span key={pm.id}
                                className="bg-[#f0f3ff] text-[#3e4947] px-3 py-1.5 rounded-full text-xs
                                           font-semibold inline-flex items-center gap-1.5 border border-[#bdc9c6]/50">
                                {pm.name_es}
                            </span>
                        ))}
                    </div>

                    {/* Badge "Operando ahora" para premium (el free lo muestra en el hero overlay) */}
                    {transport.plan !== 'free' && operating && (
                        <div className="inline-flex items-center gap-2 bg-[#f0fdf4] px-3 py-1.5 rounded-full w-max
                                        border border-[#0f766e]/20">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#0f766e]" />
                            <span className="text-xs font-semibold text-[#0f766e]">{t('operatingNow')}</span>
                        </div>
                    )}

                    {/* Título para premium (no va en overlay del hero) */}
                    {transport.plan !== 'free' && (
                        <h1 className="text-[32px] leading-[40px] font-bold text-[#111c2d]
                                       font-['Plus_Jakarta_Sans'] tracking-[-0.01em]">
                            {transport.name}
                        </h1>
                    )}

                    {/* Descripción */}
                    {transport.description_es && (
                        <p className="text-base text-[#3e4947] leading-relaxed">{transport.description_es}</p>
                    )}

                    {/* Rutas */}
                    {sortedRoutes.length > 0 && (
                        <section className="flex flex-col gap-3">
                            <h2 className="text-2xl font-semibold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                                {t('frequentRoutes')}
                            </h2>
                            {sortedRoutes.map(route => (
                                <RouteCard
                                    key={route.id}
                                    route={route}
                                    isExpanded={expandedRouteId === route.id}
                                    onToggle={() => setExpandedRouteId(
                                        expandedRouteId === route.id ? null : route.id
                                    )}
                                />
                            ))}
                        </section>
                    )}
                </main>
            </main>

            {/* Sticky footer */}
            <div className="fixed bottom-0 left-0 w-full bg-[#f9f9ff]/90 backdrop-blur-md
                            border-t border-[#bdc9c6]/30 px-5 py-4 flex gap-4 z-50
                            shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.05)]">
                {transport.whatsapp && (
                    <a href={`https://wa.me/${transport.whatsapp.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-3 px-4 rounded-full border-2 border-[#005c55] text-[#005c55]
                                  font-semibold flex items-center justify-center gap-2
                                  hover:bg-[#f0f3ff] active:scale-95 transition-all">
                        <MessageCircle style={{ width: 20, height: 20 }} />
                        {t('whatsapp')}
                    </a>
                )}
                <button
                    onClick={() => transport.whatsapp
                        ? window.open(`https://wa.me/${transport.whatsapp.replace(/\D/g, '')}`, '_blank')
                        : transport.phone && (window.location.href = `tel:${transport.phone}`)}
                    className="flex-[2] py-3 px-4 rounded-full bg-[#005c55] text-white
                               font-semibold flex items-center justify-center gap-2 shadow-sm
                               hover:bg-[#0f766e] active:scale-95 transition-all">
                    {t('book')}
                    <ArrowRight style={{ width: 20, height: 20 }} />
                </button>
            </div>
        </>
    );
}