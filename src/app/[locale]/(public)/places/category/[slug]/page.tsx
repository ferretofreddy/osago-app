// src/app/[locale]/(public)/places/category/[slug]/page.tsx

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ArrowLeft, SlidersHorizontal, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import PlaceListCard from '@/components/place/PlaceListCard';
import FilterModal, { FilterState, EMPTY_FILTERS } from '@/components/filters/FilterModal';

// ─── Tipos — verificados contra el esquema real de BD ─────────────────────────
interface Category {
    id: string; name_es: string; name_en: string;
    icon: string; color_hex: string; type: string;
}

interface Business {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    is_active: boolean;
    // is_always_open NO existe en la tabla businesses
    subcategories: { id: string; name_es: string } | null;
    business_photos: { url: string; is_primary: boolean }[];    // ← columna real: url
    reviews: { rating: number }[];
    payment_methods: { id: string; name_es: string }[];         // via !business_payment_methods
    route_types: { id: string; name_es: string }[];             // via !business_route_types
    business_hours: {
        day_of_week: number;
        opens_at: string;
        closes_at: string;
        is_closed: boolean;
    }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(text: string): string {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

function haversineMeters(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180)
        * Math.cos(lat2 * Math.PI / 180)
        * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isOpenNow(b: Business): boolean | null {
    // is_always_open no existe — si no hay horarios, estado desconocido
    if (!b.business_hours?.length) return null;

    const now = new Date();
    const today = b.business_hours.find(h => h.day_of_week === now.getDay());
    if (!today || today.is_closed) return false;

    const cur = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = today.opens_at.split(':').map(Number);
    const [ch, cm] = today.closes_at.split(':').map(Number);
    return cur >= oh * 60 + om && cur <= ch * 60 + cm;
}

function primaryPhotoUrl(b: Business): string | undefined {
    const photos = b.business_photos ?? [];
    // columna real: url (no photo_url)
    return (photos.find(p => p.is_primary) ?? photos[0])?.url;
}

function avgRating(b: Business): number | undefined {
    const r = b.reviews ?? [];
    return r.length ? r.reduce((s, x) => s + x.rating, 0) / r.length : undefined;
}

const DISTANCE_METERS: Record<string, number> = {
    '500m': 500, '1km': 1000, '5km': 5000, '10km': 10000,
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CategoryPage() {
    const { slug } = useParams<{ slug: string }>();
    const locale = useLocale();
    const router = useRouter();

    const [category, setCategory] = useState<Category | null>(null);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
    const [modalOpen, setModalOpen] = useState(false);

    // GPS
    useEffect(() => {
        let cancelled = false;
        navigator.geolocation?.getCurrentPosition(
            pos => { if (!cancelled) setUserLocation([pos.coords.latitude, pos.coords.longitude]); },
            () => { }
        );
        return () => { cancelled = true; };
    }, []);

    // Cargar categoría y negocios
    useEffect(() => {
        if (!slug) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            const supabase = createClient();

            // 1. Resolver slug → categoría
            const { data: cats } = await supabase
                .from('categories')
                .select('id, name_es, name_en, icon, color_hex, type');

            const cat = (cats ?? []).find(c => toSlug(c.name_es) === slug) ?? null;
            if (!cat || cancelled) { if (!cancelled) setLoading(false); return; }
            if (!cancelled) setCategory(cat);

            // 2. IDs de negocios en esa categoría
            const { data: bcRows } = await supabase
                .from('business_categories')
                .select('business_id')
                .eq('category_id', cat.id);

            const ids = (bcRows ?? []).map(r => r.business_id);
            if (!ids.length) {
                if (!cancelled) { setBusinesses([]); setLoading(false); }
                return;
            }

            // 3. Negocios — solo columnas que EXISTEN en BD
            const { data: bData, error } = await supabase
                .from('businesses')
                .select(`
                    id,
                    name,
                    latitude,
                    longitude,
                    is_active,
                    subcategories:subcategory_id ( id, name_es ),
                    business_photos ( url, is_primary ),
                    reviews ( rating ),
                    payment_methods!business_payment_methods ( id, name_es ),
                    route_types!business_route_types ( id, name_es ),
                    business_hours ( day_of_week, opens_at, closes_at, is_closed )
                `)
                .in('id', ids)
                .eq('is_active', true);

            if (error) {
                console.error('Supabase error:', error.code, error.message);
            }

            if (!cancelled) {
                setBusinesses((bData as unknown as Business[]) ?? []);
                setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [slug]);

    // ID de SINPE — se recalcula cuando cargan los negocios
    const sinpeId = useMemo(() => {
        for (const b of businesses) {
            const found = b.payment_methods?.find(pm => pm.name_es.includes('SINPE'));
            if (found) return found.id;
        }
        return null;
    }, [businesses]);

    // Filtrado + ordenado
    const filtered = useMemo(() => {
        return businesses
            .map(b => ({
                ...b,
                distanceMeters: userLocation
                    ? haversineMeters(userLocation[0], userLocation[1], b.latitude, b.longitude)
                    : undefined,
                openStatus: isOpenNow(b),
            }))
            .filter(b => {
                if (filters.openNow && b.openStatus === false) return false;

                if (filters.distance !== 'any' && b.distanceMeters != null) {
                    const maxM = DISTANCE_METERS[filters.distance];
                    if (maxM && b.distanceMeters > maxM) return false;
                }

                if (filters.subcategoryIds.length > 0) {
                    if (!filters.subcategoryIds.includes(b.subcategories?.id ?? '')) return false;
                }

                if (filters.paymentMethodIds.length > 0) {
                    const pmIds = (b.payment_methods ?? []).map(pm => pm.id);
                    if (!filters.paymentMethodIds.some(id => pmIds.includes(id))) return false;
                }

                if (filters.routeTypeIds.length > 0) {
                    const rtIds = (b.route_types ?? []).map(rt => rt.id);
                    if (!filters.routeTypeIds.some(id => rtIds.includes(id))) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (a.openStatus !== b.openStatus) return a.openStatus ? -1 : 1;
                if (a.distanceMeters != null && b.distanceMeters != null)
                    return a.distanceMeters - b.distanceMeters;
                return 0;
            });
    }, [businesses, filters, userLocation]);

    // Quick chips
    function toggleQuickOpenNow() {
        setFilters(f => ({ ...f, openNow: !f.openNow }));
    }
    function toggleQuickSinpe() {
        if (!sinpeId) return;
        setFilters(f => ({
            ...f,
            paymentMethodIds: f.paymentMethodIds.includes(sinpeId)
                ? f.paymentMethodIds.filter(id => id !== sinpeId)
                : [...f.paymentMethodIds, sinpeId],
        }));
    }
    function toggleQuick1km() {
        setFilters(f => ({ ...f, distance: f.distance === '1km' ? 'any' : '1km' }));
    }

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (filters.distance !== 'any') n++;
        n += filters.subcategoryIds.length + filters.paymentMethodIds.length + filters.routeTypeIds.length;
        if (filters.openNow) n++;
        return n;
    }, [filters]);

    const sinpeActive = sinpeId ? filters.paymentMethodIds.includes(sinpeId) : false;

    return (
        <>
            <main className="min-h-screen bg-[#f9f9ff] pb-24">

                {/* Header */}
                <header className="sticky top-0 z-40 bg-[#f9f9ff] border-b border-[#E2E8F0] shadow-sm">
                    <div className="flex items-center justify-between px-5 h-16">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e7eeff] transition-colors"
                            aria-label="Volver"
                        >
                            <ArrowLeft style={{ width: 22, height: 22, color: '#111c2d' }} />
                        </button>
                        <h1 className="text-2xl font-bold text-[#005c55] font-['Plus_Jakarta_Sans'] tracking-tight">
                            {category?.name_es ?? '…'}
                        </h1>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e7eeff] transition-colors"
                            aria-label="Filtros"
                        >
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

                {/* Subheader */}
                <div className="sticky top-16 z-30 bg-[#f9f9ff] px-5 pt-3 pb-3 border-b border-[#E2E8F0]/60">
                    <p className="text-sm font-semibold text-[#3e4947] mb-2.5">
                        {loading
                            ? 'Cargando…'
                            : `${filtered.length} ${filtered.length === 1 ? 'lugar' : 'lugares'}${userLocation ? ' cerca de ti' : ''}`}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                        <QuickChip label="Abierto ahora" active={filters.openNow} onToggle={toggleQuickOpenNow} />
                        <QuickChip label="Acepta SINPE" active={sinpeActive} onToggle={toggleQuickSinpe} />
                        <QuickChip label="Menos de 1 km" active={filters.distance === '1km'} onToggle={toggleQuick1km} />
                    </div>
                </div>

                {/* Lista */}
                <section className="px-5 pt-4 flex flex-col gap-4">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-[116px] rounded-xl bg-[#e7eeff] animate-pulse" />
                        ))
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 flex flex-col items-center gap-3">
                            <p className="text-2xl">🔍</p>
                            <p className="text-[#3e4947] font-semibold">No se encontraron lugares</p>
                            <p className="text-sm text-[#6e7977]">Prueba ajustando los filtros</p>
                            <button
                                onClick={() => setFilters(EMPTY_FILTERS)}
                                className="mt-2 text-sm text-[#005c55] font-semibold underline"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    ) : (
                        filtered.map(b => (
                            <PlaceListCard
                                key={b.id}
                                id={b.id}
                                name={b.name}
                                photoUrl={primaryPhotoUrl(b)}
                                subcategoryName={b.subcategories?.name_es}
                                categoryName={category?.name_es}
                                rating={avgRating(b)}
                                reviewCount={b.reviews?.length}
                                distanceMeters={b.distanceMeters}
                                isOpen={b.openStatus}
                                onClick={() => router.push(`/${locale}/places/${b.id}`)}
                            />
                        ))
                    )}
                </section>
            </main>

            {category && (
                <FilterModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onApply={setFilters}
                    categoryId={category.id}
                    initialFilters={filters}
                />
            )}

            <BottomNav />
        </>
    );
}

function QuickChip({ label, active, onToggle }: {
    label: string; active: boolean; onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className={`shrink-0 flex items-center gap-1 px-4 py-1.5 rounded-full border
                        text-xs font-semibold transition-all duration-150
                        ${active
                    ? 'bg-[#0f766e] border-[#0f766e] text-[#a3faef]'
                    : 'bg-white border-[#bdc9c6] text-[#111c2d] hover:bg-[#e7eeff]'}`}
        >
            {active && <Check style={{ width: 12, height: 12 }} />}
            {label}
        </button>
    );
}