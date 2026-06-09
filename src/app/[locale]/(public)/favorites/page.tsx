// src/app/[locale]/(public)/favorites/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { SlidersHorizontal, MapPin, Trash2, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import BottomNav from '@/components/layout/BottomNav';
import FilterModal, { type FilterState, EMPTY_FILTERS } from '@/components/filters/FilterModal';

// ── Tipos ─────────────────────────────────────────────────────
interface FavBusiness {
    favorite_id: string;
    id: string; name: string; plan: string;
    latitude: number; longitude: number;
    categories: { name_es: string; icon: string; color_hex: string }[];
    business_photos: { url: string; is_primary: boolean }[];
    business_hours: { day_of_week: number; opens_at: string; closes_at: string; is_closed: boolean }[];
    subcategories: { name_es: string } | null;
    payment_methods: { id: string; name_es: string }[];
    route_types: { id: string; name_es: string }[];
}

// ── Helpers ───────────────────────────────────────────────────
function isOpenNow(hours: FavBusiness['business_hours']): boolean {
    if (!hours?.length) return false;
    const now = new Date();
    const h   = hours.find(h => h.day_of_week === now.getDay());
    if (!h || h.is_closed) return false;
    const [oh, om] = h.opens_at.split(':').map(Number);
    const [ch, cm] = h.closes_at.split(':').map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

const CAT_ICONS: Record<string, string> = {
    utensils: '🍴', bed: '🛏️', tree: '🌳', pill: '💊', compass: '🧭', car: '🚗',
};

// ── Vista: no logueado ────────────────────────────────────────
function NotLoggedView() {
    const t      = useTranslations('favorites');
    const locale = useLocale();
    const router = useRouter();
    return (
        <div className="flex flex-col items-center text-center gap-5 py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-[#e7eeff] flex items-center justify-center">
                <Heart style={{ width: 36, height: 36, color: '#005c55' }} />
            </div>
            <h2 className="text-2xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                {t('loginPrompt')}
            </h2>
            <p className="text-[#3e4947] text-base leading-relaxed max-w-xs">
                {t('loginPromptDesc')}
            </p>
            <button
                onClick={() => router.push(`/${locale}/profile`)}
                className="bg-[#005c55] text-white px-8 py-3.5 rounded-full font-semibold text-sm
                           hover:bg-[#0f766e] active:scale-95 transition-all shadow-sm">
                {t('goToProfile')}
            </button>
        </div>
    );
}

// ── Tarjeta de favorito ───────────────────────────────────────
function FavCard({ business, onRemove }: { business: FavBusiness; onRemove: () => void }) {
    const locale = useLocale();
    const router = useRouter();
    const cat    = business.categories?.[0];
    const photo  = business.business_photos?.find(p => p.is_primary) ?? business.business_photos?.[0];
    const open   = isOpenNow(business.business_hours);

    return (
        <div className="bg-white rounded-xl border border-[#bdc9c6]/30 shadow-sm
                        flex items-center gap-3 p-3 hover:shadow-md transition-shadow">
            {/* Foto */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#e7eeff] shrink-0 cursor-pointer"
                 onClick={() => router.push(`/${locale}/places/${business.id}`)}>
                {photo ? (
                    <img src={photo.url} alt={business.name}
                         className="w-full h-full object-cover"
                         onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                        {CAT_ICONS[cat?.icon ?? ''] ?? '📍'}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 cursor-pointer"
                 onClick={() => router.push(`/${locale}/places/${business.id}`)}>
                <p className="text-sm font-bold text-[#111c2d] truncate">{business.name}</p>
                {cat && (
                    <p className="text-xs font-semibold mt-0.5" style={{ color: cat.color_hex }}>
                        {cat.name_es}
                    </p>
                )}
                <div className="flex items-center gap-1 mt-1">
                    <MapPin style={{ width: 11, height: 11, color: '#6e7977' }} />
                    <span className="text-xs text-[#6e7977]">
                        {open
                            ? <span className="text-[#059669] font-semibold">Abierto</span>
                            : <span className="text-[#EF4444]">Cerrado</span>}
                    </span>
                </div>
            </div>

            {/* Eliminar */}
            <button onClick={onRemove}
                className="w-9 h-9 rounded-full flex items-center justify-center
                           text-[#6e7977] hover:bg-[#fee2e2] hover:text-[#EF4444] transition-colors">
                <Trash2 style={{ width: 16, height: 16 }} />
            </button>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────
export default function FavoritesPage() {
    const locale = useLocale();
    const router = useRouter();
    const t      = useTranslations('favorites');

    const [user,        setUser]        = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [businesses,  setBusinesses]  = useState<FavBusiness[]>([]);
    const [loading,     setLoading]     = useState(false);
    const [filterOpen,  setFilterOpen]  = useState(false);
    const [filters,     setFilters]     = useState<FilterState>(EMPTY_FILTERS);
    const [activeCatId, setActiveCatId] = useState<string>('');

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
            setAuthLoading(false);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_ev, session) => {
            setUser(session?.user ?? null);
        });
        return () => listener.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            const supabase = createClient();
            const { data } = await supabase
                .from('favorites')
                .select(`
                    id,
                    businesses:business_id (
                        id, name, plan, latitude, longitude,
                        categories!business_categories ( name_es, icon, color_hex ),
                        business_photos ( url, is_primary ),
                        business_hours ( day_of_week, opens_at, closes_at, is_closed ),
                        subcategories:subcategory_id ( name_es ),
                        payment_methods!business_payment_methods ( id, name_es ),
                        route_types!business_route_types ( id, name_es )
                    )
                `)
                .eq('user_id', user.id);

            if (!cancelled && data) {
                const mapped: FavBusiness[] = data
                    .filter(f => f.businesses)
                    .map((f: any) => ({ ...f.businesses, favorite_id: f.id }));
                setBusinesses(mapped);
            }
            if (!cancelled) setLoading(false);
        };
        load();
        return () => { cancelled = true; };
    }, [user]);

    const removeFavorite = async (favoriteId: string) => {
        const supabase = createClient();
        await supabase.from('favorites').delete().eq('id', favoriteId);
        setBusinesses(prev => prev.filter(b => b.favorite_id !== favoriteId));
    };

    const grouped = useMemo(() => {
        const map: Record<string, FavBusiness[]> = {};
        for (const b of businesses) {
            if (filters.paymentMethodIds.length > 0) {
                const ids = b.payment_methods?.map(p => p.id) ?? [];
                if (!filters.paymentMethodIds.some(id => ids.includes(id))) continue;
            }
            if (filters.routeTypeIds.length > 0) {
                const ids = b.route_types?.map(r => r.id) ?? [];
                if (!filters.routeTypeIds.some(id => ids.includes(id))) continue;
            }
            if (filters.openNow && !isOpenNow(b.business_hours)) continue;

            const catName = b.categories?.[0]?.name_es ?? 'Otros';
            if (!map[catName]) map[catName] = [];
            map[catName].push(b);
        }
        return map;
    }, [businesses, filters]);

    const totalFiltered = Object.values(grouped).reduce((n, arr) => n + arr.length, 0);
    const filterCount   = (filters.paymentMethodIds.length || 0)
                        + (filters.routeTypeIds.length || 0)
                        + (filters.openNow ? 1 : 0);

    useEffect(() => {
        if (businesses.length > 0) setActiveCatId('');
    }, [businesses]);

    if (authLoading) return (
        <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#005c55] border-t-transparent animate-spin" />
        </div>
    );

    return (
        <>
            <main className="min-h-screen bg-[#f9f9ff] pb-24">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-[#f9f9ff] border-b border-[#E2E8F0] shadow-sm">
                    <div className="flex items-center justify-between px-5 h-16 max-w-2xl mx-auto">
                        <h1 className="text-2xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                            {t('title')}
                        </h1>
                        {user && (
                            <button onClick={() => setFilterOpen(true)}
                                className="relative w-10 h-10 rounded-full bg-[#e7eeff]
                                           flex items-center justify-center hover:bg-[#d8e3fb] transition-colors">
                                <SlidersHorizontal style={{ width: 20, height: 20, color: '#111c2d' }} />
                                {filterCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#fea619] text-white
                                                     text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {filterCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </header>

                <div className="px-5 max-w-2xl mx-auto pt-5">
                    {!user ? (
                        <NotLoggedView />
                    ) : loading ? (
                        <div className="flex flex-col gap-3 mt-4">
                            {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[#e7eeff] animate-pulse" />)}
                        </div>
                    ) : businesses.length === 0 ? (
                        <div className="flex flex-col items-center text-center gap-4 py-16">
                            <div className="w-16 h-16 rounded-full bg-[#e7eeff] flex items-center justify-center">
                                <Heart style={{ width: 28, height: 28, color: '#6e7977' }} />
                            </div>
                            <p className="font-semibold text-[#3e4947]">{t('empty')}</p>
                            <p className="text-sm text-[#6e7977]">{t('emptyDesc')}</p>
                            <button onClick={() => router.push(`/${locale}/explore`)}
                                className="bg-[#005c55] text-white px-6 py-3 rounded-full text-sm font-semibold
                                           hover:bg-[#0f766e] active:scale-95 transition-all">
                                {t('explore')}
                            </button>
                        </div>
                    ) : totalFiltered === 0 ? (
                        <p className="text-center text-[#6e7977] py-10 text-sm">{t('noResults')}</p>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {Object.entries(grouped).map(([catName, items]) => (
                                <section key={catName}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-lg">
                                            {CAT_ICONS[items[0]?.categories?.[0]?.icon ?? ''] ?? '📍'}
                                        </span>
                                        <h2 className="text-lg font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                                            {catName} ({items.length})
                                        </h2>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {items.map(b => (
                                            <FavCard
                                                key={b.id}
                                                business={b}
                                                onRemove={() => removeFavorite(b.favorite_id)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <FilterModal
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
                onApply={f => setFilters(f)}
                categoryId={activeCatId}
                initialFilters={filters}
            />

            <BottomNav />
        </>
    );
}
