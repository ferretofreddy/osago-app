// src/app/[locale]/(public)/transport/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Compass, SlidersHorizontal, X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import TransportCard from '@/components/transport/TransportCard';

// ─── Tipos ────────────────────────────────────────────────────
interface Modality { id: string; name_es: string; icon: string; color_hex: string; sort_order: number; }
interface TransportType { id: string; name_es: string; icon: string; modality_id: string; }

interface Route {
    id: string;
    point_a_name: string; point_a_lat: number | null; point_a_lng: number | null;
    point_b_name: string; point_b_lat: number | null; point_b_lng: number | null;
    fare_amount: number; fare_currency: string; fare_type: string;
    sort_order: number;
    transport_route_schedules: { direction: string; departure_time: string; days_of_week: number[] }[];
    transport_route_services: { icon: string; name_es: string }[];
}

interface Transport {
    id: string; name: string; logo_url: string | null; plan: string; service_type: string;
    transport_modalities: Modality;
    transport_types: TransportType;
    transport_routes: Route[];
    transport_photos: { url: string; is_primary: boolean }[];
}

interface FilterState {
    typeIds: string[];
    serviceType: 'all' | 'zona' | 'ruta';
    maxFare: number | null;
}
const EMPTY_FILTERS: FilterState = { typeIds: [], serviceType: 'all', maxFare: null };

// ─── Íconos de modalidad ─────────────────────────────────────
const MODALITY_ICONS: Record<string, React.ReactNode> = {
    car: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 17H5a2 2 0 0 1-2-2V9l3-4h12l3 4v6a2 2 0 0 1-2 2z" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>,
    anchor: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3" /><line x1="12" y1="22" x2="12" y2="8" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /></svg>,
    plane: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 21 4c0 0-2 0-3.5 1.5L14 9 5.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 3.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.1z" /></svg>,
};

// ─── Helpers ─────────────────────────────────────────────────

// Formato de hora según locale (12h ES/EN, 24h FR/DE/IT)
function formatTime(raw: string, locale: string): string {
    const [h, m] = raw.split(':').map(Number);
    if (['fr', 'de', 'it'].includes(locale)) return `${h}:${m.toString().padStart(2, '0')}`;
    const p = h >= 12 ? 'p.m.' : 'a.m.';
    return `${(h % 12 || 12).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${p}`;
}

// Mapa patrón de días → clave i18n
const DAY_KEY_MAP: Record<string, string> = {
    '1,2,3,4,5': 'weekdays',
    '6': 'saturday',
    '0': 'sunday',
    '0,6': 'weekend',
    '1,2,3,4,5,6': 'monToSat',
    '0,1,2,3,4,5,6': 'daily',
    '0,5,6': 'friToSun',
};

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// FIX: ruta "principal" = más cercana al usuario, o la más barata si no hay GPS
function getBestRoute(routes: Route[], userLocation: [number, number] | null): Route | undefined {
    if (!routes.length) return undefined;
    if (!userLocation) {
        // Sin GPS: mostrar la más barata (coherencia precio/ruta)
        return routes.reduce((min, r) =>
            (r.fare_amount ?? Infinity) < (min.fare_amount ?? Infinity) ? r : min
        );
    }
    // Con GPS: ruta cuyo punto A o B sea más cercano al usuario
    let minDist = Infinity;
    let best = routes[0];
    for (const r of routes) {
        const pts: [number, number][] = [];
        if (r.point_a_lat && r.point_a_lng) pts.push([r.point_a_lat, r.point_a_lng]);
        if (r.point_b_lat && r.point_b_lng) pts.push([r.point_b_lat, r.point_b_lng]);
        for (const [plat, plng] of pts) {
            const d = haversineMeters(userLocation[0], userLocation[1], plat, plng);
            if (d < minDist) { minDist = d; best = r; }
        }
    }
    return best;
}

// Primer horario de salida A→B de la ruta
function getFirstDeparture(route: Route | undefined, locale: string): string | undefined {
    if (!route) return undefined;
    const s = route.transport_route_schedules
        .filter(x => x.direction === 'a_to_b')
        .sort((a, b) => a.departure_time.localeCompare(b.departure_time))[0];
    return s ? formatTime(s.departure_time, locale) : undefined;
}

// Clave i18n del primer patrón de días de la ruta
function getFirstDayKey(route: Route | undefined): string | undefined {
    if (!route) return undefined;
    const s = route.transport_route_schedules[0];
    if (!s) return undefined;
    const key = [...s.days_of_week].sort((a, b) => a - b).join(',');
    return DAY_KEY_MAP[key] ?? undefined;
}

function countActiveFilters(f: FilterState): number {
    let n = f.typeIds.length;
    if (f.serviceType !== 'all') n++;
    if (f.maxFare !== null) n++;
    return n;
}

// ─── Componente ───────────────────────────────────────────────
export default function TransportPage() {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('transport');

    const [modalities, setModalities] = useState<Modality[]>([]);
    const [allTypes, setAllTypes] = useState<TransportType[]>([]);
    const [transports, setTransports] = useState<Transport[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeModalId, setActiveModalId] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
    const [modalOpen, setModalOpen] = useState(false);
    const [pendingFilters, setPendingFilters] = useState<FilterState>(EMPTY_FILTERS);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    // GPS para ordenar rutas por cercanía
    useEffect(() => {
        let cancelled = false;
        navigator.geolocation?.getCurrentPosition(
            pos => { if (!cancelled) setUserLocation([pos.coords.latitude, pos.coords.longitude]); },
            () => { }
        );
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            const supabase = createClient();
            const [{ data: mods }, { data: types }, { data: trans }] = await Promise.all([
                supabase.from('transport_modalities').select('*').order('sort_order'),
                supabase.from('transport_types').select('id, name_es, icon, modality_id').order('sort_order'),
                supabase.from('transports').select(`
                    id, name, logo_url, plan, service_type,
                    transport_modalities:modality_id ( id, name_es, icon, color_hex, sort_order ),
                    transport_types:transport_type_id ( id, name_es, icon, modality_id ),
                    transport_routes (
                        id, point_a_name, point_a_lat, point_a_lng,
                        point_b_name, point_b_lat, point_b_lng,
                        fare_amount, fare_currency, fare_type, sort_order,
                        transport_route_schedules ( direction, departure_time, days_of_week ),
                        transport_route_services ( icon, name_es )
                    ),
                    transport_photos ( url, is_primary )
                `).eq('is_active', true),
            ]);
            if (!cancelled) {
                const mList = (mods ?? []) as Modality[];
                setModalities(mList);
                setAllTypes((types ?? []) as TransportType[]);
                setTransports((trans as unknown as Transport[]) ?? []);
                if (mList.length) setActiveModalId(mList[0].id);
                setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const activeTypes = useMemo(() =>
        allTypes.filter(tp => tp.modality_id === activeModalId),
        [allTypes, activeModalId]
    );

    const filtered = useMemo(() => {
        return transports.filter(transport => {
            if (transport.transport_modalities?.id !== activeModalId) return false;
            if (filters.typeIds.length > 0 && !filters.typeIds.includes(transport.transport_types?.id ?? '')) return false;
            if (filters.serviceType !== 'all' && transport.service_type !== filters.serviceType) return false;
            if (filters.maxFare !== null) {
                const fares = transport.transport_routes.map(r => r.fare_amount).filter(Boolean);
                const min = fares.length ? Math.min(...fares) : null;
                if (min != null && min > filters.maxFare) return false;
            }
            return true;
        });
    }, [transports, activeModalId, filters]);

    const activeFilterCount = countActiveFilters(filters);

    function openModal() { setPendingFilters(filters); setModalOpen(true); }
    function applyFilters() { setFilters(pendingFilters); setModalOpen(false); }
    function clearFilters() { setPendingFilters(EMPTY_FILTERS); }
    function toggleType(id: string) {
        setPendingFilters(f => ({
            ...f,
            typeIds: f.typeIds.includes(id) ? f.typeIds.filter(x => x !== id) : [...f.typeIds, id],
        }));
    }

    return (
        <>
            <main className="min-h-screen bg-[#f9f9ff] pb-24">

                {/* Header */}
                <header className="sticky top-0 z-40 bg-[#f9f9ff] border-b border-[#E2E8F0] shadow-sm">
                    <div className="flex items-center justify-between px-5 h-16 max-w-7xl mx-auto">
                        <button onClick={() => router.push(`/${locale}`)} className="flex items-center gap-2">
                            <Compass style={{ width: 28, height: 28, color: '#005c55' }} />
                            <h1 className="text-2xl font-bold text-[#005c55] font-['Plus_Jakarta_Sans']">OsaGo</h1>
                        </button>
                        <button onClick={openModal}
                            className="relative flex items-center justify-center p-2 rounded-full
                                       bg-[#e7eeff] hover:bg-[#d8e3fb] transition-colors shadow-sm">
                            <SlidersHorizontal style={{ width: 22, height: 22, color: '#111c2d' }} />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#fea619] text-white
                                                 text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                {/* Título */}
                <div className="px-5 pt-6 pb-2 max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                        {t('pageTitle')}
                    </h2>
                </div>

                {/* Tabs de modalidad */}
                <div className="sticky top-16 z-30 bg-[#f9f9ff] border-b border-[#E2E8F0]/60">
                    <div className="flex overflow-x-auto px-5 max-w-7xl mx-auto" style={{ scrollbarWidth: 'none' }}>
                        {modalities.map(m => (
                            <button key={m.id}
                                onClick={() => { setActiveModalId(m.id); setFilters(EMPTY_FILTERS); }}
                                className={`flex items-center gap-1.5 px-4 pb-3 pt-2 whitespace-nowrap
                                            text-sm font-semibold border-b-2 transition-all duration-150
                                            ${activeModalId === m.id
                                        ? 'border-[#005c55] text-[#005c55]'
                                        : 'border-transparent text-[#6e7977] hover:text-[#111c2d]'}`}>
                                <span className="w-4 h-4 flex items-center justify-center">
                                    {MODALITY_ICONS[m.icon] ?? null}
                                </span>
                                {m.name_es}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conteo */}
                {(activeFilterCount > 0 || !loading) && (
                    <div className="px-5 pt-3 pb-1 max-w-7xl mx-auto flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#3e4947]">
                            {loading
                                ? t('loading')
                                : `${filtered.length} ${filtered.length === 1 ? t('service') : t('services')}`}
                        </p>
                        {activeFilterCount > 0 && (
                            <button onClick={() => setFilters(EMPTY_FILTERS)}
                                className="text-xs font-semibold text-[#005c55] underline">
                                {t('clearFilters')}
                            </button>
                        )}
                    </div>
                )}

                {/* Lista */}
                <section className="px-5 pt-3 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loading ? (
                        [1, 2].map(i => <div key={i} className="h-52 rounded-xl bg-[#e7eeff] animate-pulse" />)
                    ) : filtered.length === 0 ? (
                        <div className="col-span-2 text-center py-16">
                            <p className="text-2xl mb-2">🚢</p>
                            <p className="text-[#3e4947] font-semibold mb-2">{t('noServices')}</p>
                            {activeFilterCount > 0 && (
                                <button onClick={() => setFilters(EMPTY_FILTERS)}
                                    className="text-sm text-[#005c55] font-semibold underline">
                                    {t('clearFilters')}
                                </button>
                            )}
                        </div>
                    ) : (
                        // FIX: loop variable renombrado a "transport" para no sobreescribir t()
                        filtered.map(transport => {
                            const routes = [...(transport.transport_routes ?? [])];
                            // FIX: ruta principal = más cercana al usuario o más barata
                            const mainRoute = getBestRoute(routes, userLocation);
                            // Día traducido (no hardcodeado)
                            const dayKey = getFirstDayKey(mainRoute);
                            const daysLabel = dayKey
                                ? t(`days.${dayKey}` as Parameters<typeof t>[0])
                                : undefined;

                            return (
                                <TransportCard
                                    key={transport.id}
                                    id={transport.id}
                                    name={transport.name}
                                    logoUrl={transport.logo_url ?? undefined}
                                    typeName={transport.transport_types?.name_es ?? ''}
                                    routePointA={mainRoute?.point_a_name}
                                    routePointB={mainRoute?.point_b_name}
                                    // FIX: fareAmount de la ruta mostrada, no el mínimo global
                                    fareAmount={mainRoute?.fare_amount}
                                    fareType={mainRoute?.fare_type}
                                    firstDeparture={getFirstDeparture(mainRoute, locale)}
                                    daysLabel={daysLabel}
                                    services={mainRoute?.transport_route_services ?? []}
                                    totalRoutes={routes.length}
                                />
                            );
                        })
                    )}
                </section>
            </main>

            {/* Modal de filtros */}
            {modalOpen && (
                <>
                    <div className="fixed inset-0 bg-[#111c2d]/40 backdrop-blur-sm z-[55]"
                        onClick={() => setModalOpen(false)} />
                    <div className="fixed bottom-0 left-0 w-full bg-white rounded-t-3xl z-[60]
                                    flex flex-col max-h-[80dvh] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="w-12 h-1.5 bg-[#bdc9c6]/60 rounded-full" />
                        </div>
                        <div className="px-5 pb-3 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                                {t('filters')}
                            </h2>
                            <button onClick={() => setModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e7eeff]">
                                <X style={{ width: 22, height: 22, color: '#3e4947' }} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-32 flex flex-col gap-6"
                            style={{ scrollbarWidth: 'none' }}>

                            {/* Tipo de servicio */}
                            {activeTypes.length > 0 && (
                                <section>
                                    <h3 className="text-base font-semibold text-[#111c2d] mb-3">{t('serviceType')}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {activeTypes.map(tp => {
                                            const active = pendingFilters.typeIds.includes(tp.id);
                                            return (
                                                <button key={tp.id} onClick={() => toggleType(tp.id)}
                                                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border
                                                                text-sm font-semibold transition-all duration-150
                                                                ${active
                                                            ? 'bg-[#0f766e] border-[#0f766e] text-[#a3faef]'
                                                            : 'bg-white border-[#bdc9c6] text-[#3e4947] hover:bg-[#e7eeff]'}`}>
                                                    {active && <Check style={{ width: 14, height: 14 }} />}
                                                    {tp.name_es}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Tipo de operación */}
                            <section>
                                <h3 className="text-base font-semibold text-[#111c2d] mb-3">{t('operationType')}</h3>
                                <div className="flex gap-2 flex-wrap">
                                    {(['all', 'ruta', 'zona'] as const).map(st => {
                                        const labels = { all: t('allTypes'), ruta: t('fixedRoutes'), zona: t('byZone') };
                                        const active = pendingFilters.serviceType === st;
                                        return (
                                            <button key={st}
                                                onClick={() => setPendingFilters(f => ({ ...f, serviceType: st }))}
                                                className={`px-4 py-2.5 rounded-full border text-sm font-semibold transition-all
                                                            ${active
                                                        ? 'bg-[#0f766e] border-[#0f766e] text-[#a3faef]'
                                                        : 'bg-white border-[#bdc9c6] text-[#3e4947] hover:bg-[#e7eeff]'}`}>
                                                {labels[st]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Tarifa máxima */}
                            <section>
                                <h3 className="text-base font-semibold text-[#111c2d] mb-3">
                                    {t('maxFare')}: {pendingFilters.maxFare !== null ? `$${pendingFilters.maxFare}` : t('anyFare')}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {[null, 10, 20, 30, 50].map(v => {
                                        const active = pendingFilters.maxFare === v;
                                        return (
                                            <button key={v ?? 'any'}
                                                onClick={() => setPendingFilters(f => ({ ...f, maxFare: v }))}
                                                className={`px-4 py-2.5 rounded-full border text-sm font-semibold transition-all
                                                            ${active
                                                        ? 'bg-[#0f766e] border-[#0f766e] text-[#a3faef]'
                                                        : 'bg-white border-[#bdc9c6] text-[#3e4947] hover:bg-[#e7eeff]'}`}>
                                                {v === null ? t('anyFare') : `${t('upTo')} $${v}`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>

                        {/* Footer modal */}
                        <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-md
                                        border-t border-[#bdc9c6]/20 px-5 pt-4 pb-8 flex justify-between items-center">
                            <button onClick={clearFilters}
                                className="text-sm font-semibold text-[#3e4947] px-2 py-3">
                                {t('clearFilters')}
                            </button>
                            <button onClick={applyFilters}
                                className="bg-[#005c55] text-white rounded-full px-8 py-3 text-sm font-semibold
                                           hover:bg-[#0f766e] active:scale-95 transition-all min-h-[48px]">
                                {t('apply')}{countActiveFilters(pendingFilters) > 0 ? ` (${countActiveFilters(pendingFilters)})` : ''}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <BottomNav />
        </>
    );
}