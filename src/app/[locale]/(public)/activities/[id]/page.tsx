// src/app/[locale]/(public)/activities/[id]/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, MessageCircle, Share2, MapPin, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import PlaceGallery from '@/components/place/PlaceGallery';
import { DIFFICULTY_CONFIG, type Difficulty } from '@/components/activity/ActivityCard';

const ActivityMap = dynamic(() => import('@/components/map/ActivityMap'), {
    ssr: false,
    loading: () => <div className="w-full h-[160px] bg-[#e7eeff] rounded-md animate-pulse" />,
});

// ─── Tipos ────────────────────────────────────────────────────
interface Tag { id: string; name_es: string; name_en: string; }
interface Schedule { id: string; days_of_week: number[]; departure_time: string; }
interface SpecificSchedule { id: string; schedule_date: string; departure_time: string; spots_available: number | null; }
interface IncludedService { id: string; name_es: string; icon: string; is_included: boolean; note_es: string | null; sort_order: number; }
interface Requirement { id: string; description_es: string; icon: string; sort_order: number; }
interface RouteType { id: string; name_es: string; warning_es: string; }
interface PaymentMethod { id: string; name_es: string; }

interface Activity {
    id: string; name: string;
    description_es: string | null; description_en: string | null;
    difficulty: Difficulty;
    duration_minutes: number | null; distance_meters: number | null;
    elevation_gain_meters: number | null;
    price_from: number | null; price_currency: string;
    schedule_type: string;
    meeting_point_name: string | null;
    meeting_point_lat: number | null; meeting_point_lng: number | null;
    meeting_point_description: string | null;
    phone: string | null; whatsapp: string | null; website: string | null;
    plan: string;
    activity_photos: { url: string; is_primary: boolean; order_index: number }[];
    activity_tags: Tag[];
    activity_schedules_regular: Schedule[];
    activity_schedules_specific: SpecificSchedule[];
    activity_included_services: IncludedService[];
    activity_requirements: Requirement[];
    route_types: RouteType[];
    payment_methods: PaymentMethod[];
}

// ─── Helpers ─────────────────────────────────────────────────

const DAY_KEY_MAP: Record<string, string> = {
    '1,2,3,4,5': 'weekdays', '6': 'saturday', '0': 'sunday',
    '0,6': 'weekend', '1,2,3,4,5,6': 'monToSat', '0,1,2,3,4,5,6': 'daily', '0,5,6': 'friToSun',
};
const DAY_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getDayLabel(days: number[]): string {
    const key = [...days].sort((a, b) => a - b).join(',');
    const mapped: Record<string, string> = {
        '1,2,3,4,5': 'Lun – Vie', '6': 'Sábado', '0': 'Domingo',
        '0,6': 'Fin de semana', '1,2,3,4,5,6': 'Lun – Sáb',
        '0,1,2,3,4,5,6': 'Diario', '0,5,6': 'Vie – Dom',
    };
    return mapped[key] ?? [...days].sort((a, b) => a - b).map(d => DAY_SHORT_ES[d]).join(', ');
}

function formatTime(raw: string, locale: string): string {
    const [h, m] = raw.split(':').map(Number);
    if (['fr', 'de', 'it'].includes(locale)) return `${h}:${m.toString().padStart(2, '0')}`;
    const p = h >= 12 ? 'p.m.' : 'a.m.';
    return `${(h % 12 || 12).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${p}`;
}

function formatDuration(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h} horas`;
}

function getAvailabilityLabel(regular: Schedule[], specific: SpecificSchedule[]): string | null {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const todayDow = now.getDay();
    const todayStr = now.toISOString().split('T')[0];

    const hasToday = regular.some(s => {
        if (!s.days_of_week.includes(todayDow)) return false;
        const [h, m] = s.departure_time.split(':').map(Number);
        return h * 60 + m > cur;
    }) || specific.some(s => {
        if (s.schedule_date !== todayStr) return false;
        const [h, m] = s.departure_time.split(':').map(Number);
        return h * 60 + m > cur;
    });
    if (hasToday) return 'Disponible hoy';

    for (let i = 1; i <= 7; i++) {
        const d = new Date(now); d.setDate(d.getDate() + i);
        const dStr = d.toISOString().split('T')[0];
        const found = regular.some(s => s.days_of_week.includes(d.getDay()))
            || specific.some(s => s.schedule_date === dStr);
        if (found) return i === 1 ? 'Disponible mañana' : `En ${i} días`;
    }
    return null;
}

// ─── Ícono de requisito ───────────────────────────────────────
const REQ_ICONS: Record<string, string> = {
    user: '👤', heart: '❤️', droplets: '💧', sun: '☀️',
    footprints: '👟', shield: '🛡️', info: 'ℹ️',
};

// ─── Página ───────────────────────────────────────────────────
export default function ActivityDetailPage() {
    const { id } = useParams<{ id: string }>();
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('activities');

    const [activity, setActivity] = useState<Activity | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from('activities')
                .select(`
                    id, name, description_es, description_en,
                    difficulty, duration_minutes, distance_meters, elevation_gain_meters,
                    price_from, price_currency, schedule_type,
                    meeting_point_name, meeting_point_lat, meeting_point_lng, meeting_point_description,
                    phone, whatsapp, website, plan,
                    activity_photos ( url, is_primary, order_index ),
                    activity_tags!activity_tag_assignments ( id, name_es, name_en ),
                    activity_schedules_regular ( id, days_of_week, departure_time ),
                    activity_schedules_specific ( id, schedule_date, departure_time, spots_available ),
                    activity_included_services ( id, name_es, icon, is_included, note_es, sort_order ),
                    activity_requirements ( id, description_es, icon, sort_order ),
                    route_types!activity_route_types ( id, name_es, warning_es ),
                    payment_methods!activity_payment_methods ( id, name_es )
                `)
                .eq('id', id).eq('is_active', true).single();

            if (error) console.error('Activity detail error:', error.message);
            if (!cancelled && data) setActivity(data as unknown as Activity);
            if (!cancelled) setLoading(false);
        };
        load();
        return () => { cancelled = true; };
    }, [id]);

    const availLabel = useMemo(() =>
        activity ? getAvailabilityLabel(activity.activity_schedules_regular, activity.activity_schedules_specific) : null,
        [activity]
    );

    const heroPhoto = useMemo(() => {
        const p = activity?.activity_photos ?? [];
        return (p.find(x => x.is_primary) ?? p.sort((a, b) => a.order_index - b.order_index)[0])?.url;
    }, [activity]);

    const sortedServices = useMemo(() =>
        [...(activity?.activity_included_services ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        [activity]
    );
    const sortedReqs = useMemo(() =>
        [...(activity?.activity_requirements ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        [activity]
    );

    if (loading) return (
        <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#005c55] border-t-transparent animate-spin" />
        </div>
    );
    if (!activity) return (
        <div className="min-h-screen bg-[#f9f9ff] flex flex-col items-center justify-center gap-3">
            <p className="text-3xl">🌿</p>
            <p className="text-[#3e4947] font-semibold">{t('notFound')}</p>
            <button onClick={() => router.back()} className="text-[#005c55] text-sm font-semibold underline">{t('back')}</button>
        </div>
    );

    const diff = DIFFICULTY_CONFIG[activity.difficulty] ?? DIFFICULTY_CONFIG.facil;
    const isPremium = activity.plan !== 'free';

    return (
        <>
            <main className="min-h-screen bg-[#f9f9ff] pb-[100px]">

                {/* Back + Share */}
                <div className="fixed top-5 left-0 right-0 z-50 flex justify-between px-5 pointer-events-none">
                    <button onClick={() => router.back()}
                        className="pointer-events-auto w-12 h-12 rounded-full bg-white/80 backdrop-blur-md
                                   shadow-sm border border-[#bdc9c6]/30 flex items-center justify-center
                                   text-[#005c55] active:scale-95 transition-transform">
                        <ArrowLeft style={{ width: 22, height: 22 }} />
                    </button>
                    <div className="pointer-events-auto flex items-center px-4 py-2 rounded-full
                                    bg-white/80 backdrop-blur-md shadow-sm border border-[#bdc9c6]/30">
                        <span className="text-sm font-semibold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                            Tour Detalles
                        </span>
                    </div>
                    <button className="pointer-events-auto w-12 h-12 rounded-full bg-white/80 backdrop-blur-md
                                       shadow-sm border border-[#bdc9c6]/30 flex items-center justify-center
                                       text-[#3e4947] active:scale-95 transition-transform">
                        <Share2 style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Hero — free: single image, premium: gallery */}
                {isPremium ? (
                    <div className="px-0 pt-0">
                        <PlaceGallery photos={activity.activity_photos} businessName={activity.name} />
                    </div>
                ) : (
                    <div className="relative w-full h-[300px] bg-[#d8e3fb] overflow-hidden">
                        {heroPhoto && (
                            <img src={heroPhoto} alt={activity.name}
                                className="w-full h-full object-cover"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#f9f9ff]/60 to-transparent" />
                        {availLabel && (
                            <div className="absolute bottom-5 left-5 inline-flex items-center gap-1.5
                                            bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full
                                            shadow-sm border border-[#bdc9c6]/20">
                                <span className="w-2 h-2 rounded-full bg-[#0f766e]" />
                                <span className="text-xs font-semibold text-[#3e4947]">{availLabel}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="px-5 max-w-7xl mx-auto flex flex-col gap-6 pt-5">

                    {/* Disponibilidad (premium) */}
                    {isPremium && availLabel && (
                        <div className="inline-flex items-center gap-1.5 bg-[#f0fdf4] px-3 py-1.5 rounded-full
                                        w-max border border-[#0f766e]/20">
                            <span className="w-2 h-2 rounded-full bg-[#0f766e]" />
                            <span className="text-xs font-semibold text-[#0f766e]">{availLabel}</span>
                        </div>
                    )}

                    {/* Título */}
                    <h1 className="text-[28px] leading-9 font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] -mt-2">
                        {activity.name}
                    </h1>

                    {/* Badges: dificultad + métricas + tags */}
                    <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: diff.bg, color: diff.text }}>
                            {diff.icon} {t(diff.labelKey as Parameters<typeof t>[0])}
                        </span>
                        {activity.duration_minutes && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                                             bg-[#f0f3ff] text-[#3e4947] border border-[#bdc9c6]/40">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                                {formatDuration(activity.duration_minutes)}
                            </span>
                        )}
                        {activity.distance_meters != null && activity.distance_meters > 0 && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                                             bg-[#f0f3ff] text-[#3e4947] border border-[#bdc9c6]/40">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 3h6l3 18 3-12h6" />
                                </svg>
                                {(activity.distance_meters / 1000).toFixed(1)} km
                            </span>
                        )}
                        {activity.elevation_gain_meters != null && activity.elevation_gain_meters > 0 && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                                             bg-[#f0f3ff] text-[#3e4947] border border-[#bdc9c6]/40">
                                +{activity.elevation_gain_meters}m
                            </span>
                        )}
                        {(activity.activity_tags ?? []).map(tag => (
                            <span key={tag.id}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold
                                           bg-[#e7eeff] text-[#005c55] border border-[#005c55]/20">
                                {tag.name_es}
                            </span>
                        ))}
                    </div>

                    {/* Descripción */}
                    {activity.description_es && (
                        <section>
                            <h2 className="text-xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] mb-2">
                                {t('aboutTour')}
                            </h2>
                            <p className="text-base text-[#3e4947] leading-relaxed">{activity.description_es}</p>
                        </section>
                    )}

                    {/* Qué incluye */}
                    {sortedServices.length > 0 && (
                        <section className="bg-[#f9f9ff] rounded-2xl border border-[#bdc9c6]/30 p-4 flex flex-col gap-3">
                            <h2 className="text-xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                                {t('whatIncludes')}
                            </h2>
                            {sortedServices.map(s => (
                                <div key={s.id} className="flex items-start gap-3">
                                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm
                                        ${s.is_included
                                            ? 'bg-[#D1FAE5] text-[#065F46]'
                                            : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                                        {s.is_included ? '✓' : '✗'}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className={`text-sm font-semibold ${!s.is_included ? 'line-through text-[#6e7977]' : 'text-[#111c2d]'}`}>
                                            {s.name_es}
                                        </span>
                                        {s.note_es && (
                                            <span className="text-xs text-[#6e7977]">{s.note_es}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Requisitos */}
                    {sortedReqs.length > 0 && (
                        <section>
                            <h2 className="text-xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] mb-3">
                                {t('requirements')}
                            </h2>
                            <div className="flex flex-col gap-3">
                                {sortedReqs.map(r => (
                                    <div key={r.id} className="flex items-start gap-3">
                                        <span className="text-lg shrink-0">{REQ_ICONS[r.icon] || 'ℹ️'}</span>
                                        <p className="text-sm text-[#3e4947] leading-relaxed">{r.description_es}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Horarios */}
                    {activity.activity_schedules_regular.length > 0 && (
                        <section>
                            <h2 className="text-xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] mb-3">
                                {t('schedules')}
                            </h2>
                            <div className="rounded-xl border border-[#bdc9c6]/40 overflow-hidden bg-white">
                                {Object.entries(
                                    activity.activity_schedules_regular.reduce<Record<string, string[]>>((acc, s) => {
                                        const label = getDayLabel(s.days_of_week);
                                        if (!acc[label]) acc[label] = [];
                                        acc[label].push(formatTime(s.departure_time, locale));
                                        return acc;
                                    }, {})
                                ).map(([dayLabel, times], i) => (
                                    <div key={i} className={`flex items-center justify-between px-4 py-3 text-sm
                                        ${i > 0 ? 'border-t border-[#bdc9c6]/20' : ''}`}>
                                        <span className="font-semibold text-[#111c2d] min-w-[90px]">{dayLabel}</span>
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            {times.map((time, j) => (
                                                <span key={j} className="px-3 py-1 bg-[#e7eeff] text-[#005c55]
                                                                          rounded-lg text-xs font-semibold">
                                                    {time}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Punto de Encuentro */}
                    {activity.meeting_point_name && (
                        <section>
                            <h2 className="text-xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] mb-3">
                                {t('meetingPoint')}
                            </h2>
                            <div className="rounded-2xl border border-[#bdc9c6]/40 overflow-hidden bg-white">
                                {/* Mapa interactivo Leaflet */}
                                {activity.meeting_point_lat && activity.meeting_point_lng && (
                                    <ActivityMap
                                        lat={activity.meeting_point_lat}
                                        lng={activity.meeting_point_lng}
                                        name={activity.meeting_point_name}
                                    />
                                )}
                                <div className="p-4 flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2 flex-1">
                                        <MapPin style={{ width: 18, height: 18, color: '#005c55', flexShrink: 0, marginTop: 2 }} />
                                        <div>
                                            <p className="text-sm font-bold text-[#111c2d]">{activity.meeting_point_name}</p>
                                            {activity.meeting_point_description && (
                                                <p className="text-xs text-[#6e7977] mt-0.5">{activity.meeting_point_description}</p>
                                            )}
                                        </div>
                                    </div>
                                    {activity.meeting_point_lat && (
                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${activity.meeting_point_lat},${activity.meeting_point_lng}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="shrink-0 w-10 h-10 bg-[#005c55] rounded-full flex items-center
                                                      justify-center text-white hover:bg-[#0f766e] transition-colors">
                                            <Navigation style={{ width: 18, height: 18 }} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Métodos de pago */}
                    {(activity.payment_methods ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {activity.payment_methods.map(pm => (
                                <span key={pm.id}
                                    className="px-3 py-1.5 rounded-full text-xs font-semibold
                                               bg-[#f0f3ff] text-[#3e4947] border border-[#bdc9c6]/50">
                                    {pm.name_es}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Sticky footer — fiel al diseño Stitch */}
            <div className="fixed bottom-0 left-0 w-full bg-[#f9f9ff]/90 backdrop-blur-md
                            border-t border-[#bdc9c6]/30 px-5 py-4 z-50
                            shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className="flex flex-col gap-1 mb-3">
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm text-[#6e7977]">{t('from')}</span>
                        {activity.price_from && (
                            <>
                                <span className="text-2xl font-bold text-[#111c2d]">${activity.price_from}</span>
                                <span className="text-sm text-[#6e7977]">{t('perPerson')}</span>
                            </>
                        )}
                    </div>
                    <p className="text-[10px] text-[#6e7977]">{t('noCharge')}</p>
                </div>
                <div className="flex gap-3">
                    {activity.whatsapp && (
                        <a href={`https://wa.me/${activity.whatsapp.replace(/\D/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex-1 py-3 px-4 rounded-full border-2 border-[#005c55] text-[#005c55]
                                      font-semibold text-sm flex items-center justify-center gap-2
                                      hover:bg-[#f0f3ff] active:scale-95 transition-all">
                            <MessageCircle style={{ width: 18, height: 18 }} />
                            {t('consult')}
                        </a>
                    )}
                    <button
                        onClick={() => activity.whatsapp
                            ? window.open(`https://wa.me/${activity.whatsapp.replace(/\D/g, '')}`, '_blank')
                            : activity.phone && (window.location.href = `tel:${activity.phone}`)}
                        className="flex-[2] py-3 px-4 rounded-full bg-[#005c55] text-white font-semibold text-sm
                                   flex items-center justify-center gap-2 shadow-sm
                                   hover:bg-[#0f766e] active:scale-95 transition-all">
                        {t('bookNow')}
                    </button>
                </div>
            </div>
        </>
    );
}