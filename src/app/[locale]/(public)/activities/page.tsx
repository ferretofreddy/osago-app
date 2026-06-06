// src/app/[locale]/(public)/activities/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Compass, SlidersHorizontal, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import ActivityCard, { DIFFICULTY_CONFIG, type Difficulty } from '@/components/activity/ActivityCard';

// ─── Tipos ────────────────────────────────────────────────────
interface Tag { id: string; name_es: string; name_en: string; icon: string; }
interface Schedule { days_of_week: number[]; departure_time: string; }
interface SpecificSchedule { schedule_date: string; departure_time: string; }

interface Activity {
    id: string; name: string; difficulty: Difficulty;
    duration_minutes: number | null;
    distance_meters: number | null;
    elevation_gain_meters: number | null;
    price_from: number | null;
    activity_photos: { url: string; is_primary: boolean }[];
    activity_tags: Tag[];
    activity_schedules_regular: Schedule[];
    activity_schedules_specific: SpecificSchedule[];
}

// ─── Helpers ─────────────────────────────────────────────────

function getAvailabilityKey(
    regular: Schedule[],
    specific: SpecificSchedule[]
): string {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();

    const hasScheduleOnDay = (dow: number, isToday = false): boolean => {
        for (const s of regular) {
            if (s.days_of_week.includes(dow)) {
                if (!isToday) return true;
                const [h, m] = s.departure_time.split(':').map(Number);
                if (h * 60 + m > cur) return true;
            }
        }
        return false;
    };
    const hasSpecificDate = (dateStr: string, isToday = false): boolean => {
        for (const s of specific) {
            if (s.schedule_date === dateStr) {
                if (!isToday) return true;
                const [h, m] = s.departure_time.split(':').map(Number);
                if (h * 60 + m > cur) return true;
            }
        }
        return false;
    };

    const todayStr = now.toISOString().split('T')[0];
    if (hasScheduleOnDay(now.getDay(), true) || hasSpecificDate(todayStr, true))
        return 'today';

    for (let i = 1; i <= 7; i++) {
        const d = new Date(now); d.setDate(d.getDate() + i);
        const str = d.toISOString().split('T')[0];
        if (hasScheduleOnDay(d.getDay()) || hasSpecificDate(str)) {
            return i === 1 ? 'tomorrow' : `days_${i}`;
        }
    }
    return 'none';
}

// ─── Componente ───────────────────────────────────────────────
export default function ActivitiesPage() {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('activities');

    const [activities, setActivities] = useState<Activity[]>([]);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [diffFilter, setDiffFilter] = useState<Difficulty | 'all'>('all');
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    const [tagModalOpen, setTagModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            const supabase = createClient();
            const [{ data: acts }, { data: tags }] = await Promise.all([
                supabase.from('activities').select(`
                    id, name, difficulty, duration_minutes, distance_meters,
                    elevation_gain_meters, price_from,
                    activity_photos ( url, is_primary ),
                    activity_tags!activity_tag_assignments ( id, name_es, name_en, icon ),
                    activity_schedules_regular ( days_of_week, departure_time ),
                    activity_schedules_specific ( schedule_date, departure_time )
                `).eq('is_active', true),
                supabase.from('activity_tags').select('id, name_es, name_en, icon').order('sort_order'),
            ]);
            if (!cancelled) {
                setActivities((acts as unknown as Activity[]) ?? []);
                setAllTags(tags ?? []);
                setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const filtered = useMemo(() => {
        return activities.filter(a => {
            if (diffFilter !== 'all' && a.difficulty !== diffFilter) return false;
            if (tagFilter.length > 0) {
                const actTagIds = (a.activity_tags ?? []).map(t => t.id);
                if (!tagFilter.some(id => actTagIds.includes(id))) return false;
            }
            return true;
        });
    }, [activities, diffFilter, tagFilter]);

    const difficulties: { key: Difficulty | 'all'; label: string }[] = [
        { key: 'all', label: t('allDifficulties') },
        { key: 'facil', label: t('difficulty_facil') },
        { key: 'moderado', label: t('difficulty_moderado') },
        { key: 'dificil', label: t('difficulty_dificil') },
        { key: 'extremo', label: t('difficulty_extremo') },
    ];

    const activeTagCount = tagFilter.length;
    const showClear = diffFilter !== 'all' || activeTagCount > 0;

    const getAvailLabel = (a: Activity): string | undefined => {
        const key = getAvailabilityKey(a.activity_schedules_regular, a.activity_schedules_specific);
        if (key === 'today') return t('availableToday');
        if (key === 'tomorrow') return t('availableTomorrow');
        if (key.startsWith('days_')) {
            const n = parseInt(key.split('_')[1]);
            return t('availableInDays', { days: n });
        }
        return undefined;
    };

    const primaryPhoto = (a: Activity) =>
        (a.activity_photos?.find(p => p.is_primary) ?? a.activity_photos?.[0])?.url;

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
                        <button onClick={() => setTagModalOpen(true)}
                            className="relative flex items-center justify-center p-2 rounded-full
                                       bg-[#e7eeff] hover:bg-[#d8e3fb] transition-colors shadow-sm">
                            <SlidersHorizontal style={{ width: 22, height: 22, color: '#111c2d' }} />
                            {activeTagCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#fea619] text-white
                                                 text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {activeTagCount}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                {/* Título */}
                <div className="px-5 pt-6 pb-3 max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                        {t('pageTitle')}
                    </h2>
                </div>

                {/* Chips de dificultad (filtro principal) */}
                <div className="sticky top-16 z-30 bg-[#f9f9ff] border-b border-[#E2E8F0]/60">
                    <div className="flex gap-2 overflow-x-auto px-5 py-3 max-w-7xl mx-auto"
                        style={{ scrollbarWidth: 'none' }}>
                        {difficulties.map(({ key, label }) => {
                            const active = diffFilter === key;
                            const cfg = key !== 'all' ? DIFFICULTY_CONFIG[key] : null;
                            return (
                                <button key={key} onClick={() => setDiffFilter(key)}
                                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full
                                               text-sm font-semibold border transition-all duration-150"
                                    style={active && cfg
                                        ? { backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.text + '40' }
                                        : active
                                            ? { backgroundColor: '#005c55', color: 'white', borderColor: '#005c55' }
                                            : { backgroundColor: 'white', color: '#3e4947', borderColor: '#bdc9c6' }
                                    }>
                                    {key !== 'all' && cfg && <span>{cfg.icon}</span>}
                                    {label}
                                </button>
                            );
                        })}
                        {showClear && (
                            <button onClick={() => { setDiffFilter('all'); setTagFilter([]); }}
                                className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-xs
                                           font-semibold text-[#005c55] border border-[#005c55]/30 bg-[#e7f5f2]">
                                <X style={{ width: 12, height: 12 }} />
                                {t('clearFilters')}
                            </button>
                        )}
                    </div>

                    {/* Conteo */}
                    <p className="px-5 pb-2 text-sm font-semibold text-[#3e4947] max-w-7xl mx-auto">
                        {loading ? t('loading') : `${filtered.length} ${filtered.length === 1 ? t('activity') : t('activities')}`}
                    </p>
                </div>

                {/* Lista */}
                <section className="px-5 pt-4 max-w-7xl mx-auto flex flex-col gap-5">
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-72 rounded-2xl bg-[#e7eeff] animate-pulse" />)
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 flex flex-col items-center gap-3">
                            <p className="text-3xl">🌿</p>
                            <p className="text-[#3e4947] font-semibold">{t('noActivities')}</p>
                            {showClear && (
                                <button onClick={() => { setDiffFilter('all'); setTagFilter([]); }}
                                    className="text-sm text-[#005c55] font-semibold underline">
                                    {t('clearFilters')}
                                </button>
                            )}
                        </div>
                    ) : (
                        filtered.map(a => (
                            <ActivityCard
                                key={a.id}
                                id={a.id}
                                name={a.name}
                                photoUrl={primaryPhoto(a)}
                                difficulty={a.difficulty}
                                durationMinutes={a.duration_minutes ?? undefined}
                                distanceMeters={a.distance_meters ?? undefined}
                                elevationGainMeters={a.elevation_gain_meters ?? undefined}
                                priceFrom={a.price_from ?? undefined}
                                availabilityLabel={getAvailLabel(a)}
                                onClick={() => router.push(`/${locale}/activities/${a.id}`)}
                            />
                        ))
                    )}
                </section>
            </main>

            {/* Modal de tags (filtro secundario) */}
            {tagModalOpen && (
                <>
                    <div className="fixed inset-0 bg-[#111c2d]/40 backdrop-blur-sm z-[55]"
                        onClick={() => setTagModalOpen(false)} />
                    <div className="fixed bottom-0 left-0 w-full bg-white rounded-t-3xl z-[60]
                                    flex flex-col max-h-[70dvh] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="w-12 h-1.5 bg-[#bdc9c6]/60 rounded-full" />
                        </div>
                        <div className="px-5 pb-3 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                                {t('tags')}
                            </h2>
                            <button onClick={() => setTagModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e7eeff]">
                                <X style={{ width: 22, height: 22, color: '#3e4947' }} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 pb-28 flex flex-wrap gap-2"
                            style={{ scrollbarWidth: 'none' }}>
                            {allTags.map(tag => {
                                const active = tagFilter.includes(tag.id);
                                return (
                                    <button key={tag.id}
                                        onClick={() => setTagFilter(f =>
                                            f.includes(tag.id) ? f.filter(x => x !== tag.id) : [...f, tag.id]
                                        )}
                                        className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all
                                            ${active
                                                ? 'bg-[#0f766e] border-[#0f766e] text-[#a3faef]'
                                                : 'bg-white border-[#bdc9c6] text-[#3e4947] hover:bg-[#e7eeff]'}`}>
                                        {tag.name_es}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-md
                                        border-t border-[#bdc9c6]/20 px-5 pt-4 pb-8 flex justify-between items-center">
                            <button onClick={() => setTagFilter([])}
                                className="text-sm font-semibold text-[#3e4947] px-2 py-3">
                                {t('clearFilters')}
                            </button>
                            <button onClick={() => setTagModalOpen(false)}
                                className="bg-[#005c55] text-white rounded-full px-8 py-3 text-sm font-semibold
                                           hover:bg-[#0f766e] active:scale-95 transition-all min-h-[48px]">
                                {t('filters')}{activeTagCount > 0 ? ` (${activeTagCount})` : ''}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <BottomNav />
        </>
    );
}