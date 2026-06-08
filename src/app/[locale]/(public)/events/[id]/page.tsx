// src/app/[locale]/(public)/events/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Share2, MapPin, Clock, Navigation } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Tipos ────────────────────────────────────────────────────
interface EventDetail {
    id: string; title: string; category: string;
    description_es: string | null; description_en: string | null;
    event_date: string; start_time: string; end_time: string | null;
    location_name: string | null; location_lat: number | null; location_lng: number | null;
    price: number | null; currency: string;
    organizer_name: string | null; organizer_logo_url: string | null;
    plan: string;
    event_photos: { url: string; is_primary: boolean; order_index: number }[];
}

// ─── Colores y etiquetas de categoría ────────────────────────
const CAT_COLOR: Record<string, string> = {
    conservacion: '#059669', naturaleza: '#10B981', cultura: '#F59E0B',
    gastronomia: '#F97316', deportes: '#3B82F6', musica: '#8B5CF6',
    arte: '#EC4899', familiar: '#06B6D4', general: '#64748B',
};

function fmt12(time: string, locale: string) {
    const [h, m] = time.split(':').map(Number);
    if (['fr', 'de', 'it'].includes(locale)) return `${h}:${m.toString().padStart(2, '0')}`;
    const p = h >= 12 ? 'PM' : 'AM';
    return `${(h % 12 || 12).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${p}`;
}

function formatFullDate(dateStr: string, locale: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString(
        locale === 'es' ? 'es-CR' : locale === 'fr' ? 'fr-FR' : locale === 'de' ? 'de-DE' : locale === 'it' ? 'it-IT' : 'en-US',
        opts
    );
}

function buildCalendarUrl(event: EventDetail): string {
    const [y, m, d] = event.event_date.split('-');
    const startH = event.start_time.replace(':', '').substring(0, 4);
    const endH = event.end_time ? event.end_time.replace(':', '').substring(0, 4) : startH;
    const start = `${y}${m}${d}T${startH}00`;
    const end = `${y}${m}${d}T${endH}00`;
    const loc = encodeURIComponent(event.location_name || '');
    const title = encodeURIComponent(event.title);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${loc}`;
}

// ─── Carrusel de galería ──────────────────────────────────────
function PhotoCarousel({ photos }: { photos: EventDetail['event_photos'] }) {
    const sorted = [...photos].sort((a, b) => a.order_index - b.order_index);
    const [idx, setIdx] = useState(0);
    const startX = useRef(0);

    const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: React.TouchEvent) => {
        const diff = startX.current - e.changedTouches[0].clientX;
        if (diff > 50 && idx < sorted.length - 1) setIdx(i => i + 1);
        if (diff < -50 && idx > 0) setIdx(i => i - 1);
    };

    return (
        <div className="relative w-full h-[280px] overflow-hidden bg-[#d8e3fb]"
            onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {sorted.map((p, i) => (
                <img key={i} src={p.url} alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                    style={{ opacity: i === idx ? 1 : 0 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ))}
            {/* Dots */}
            {sorted.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {sorted.map((_, i) => (
                        <button key={i} onClick={() => setIdx(i)}
                            className="w-2 h-2 rounded-full transition-all"
                            style={{ backgroundColor: i === idx ? 'white' : 'rgba(255,255,255,0.5)' }} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Página ───────────────────────────────────────────────────
export default function EventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('events');

    const [event, setEvent] = useState<EventDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from('events')
                .select('id, title, category, description_es, description_en, event_date, start_time, end_time, location_name, location_lat, location_lng, price, currency, organizer_name, organizer_logo_url, plan, event_photos(url, is_primary, order_index)')
                .eq('id', id).eq('is_active', true).single();
            if (error) console.error(error.message);
            if (!cancelled && data) setEvent(data as unknown as EventDetail);
            if (!cancelled) setLoading(false);
        };
        load();
        return () => { cancelled = true; };
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#005c55] border-t-transparent animate-spin" />
        </div>
    );
    if (!event) return (
        <div className="min-h-screen bg-[#f9f9ff] flex flex-col items-center justify-center gap-3">
            <p className="text-3xl">📅</p>
            <button onClick={() => router.back()} className="text-[#005c55] text-sm font-semibold underline">
                Volver
            </button>
        </div>
    );

    const catColor = CAT_COLOR[event.category] || '#64748B';
    const catKey = `category_${event.category}` as Parameters<typeof t>[0];
    const desc = locale === 'en' && event.description_en ? event.description_en : event.description_es;

    return (
        <>
            <main className="min-h-screen bg-[#f9f9ff] pb-[100px]">

                {/* Header flotante */}
                <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 pt-5 pointer-events-none">
                    <button onClick={() => router.back()}
                        className="pointer-events-auto w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm
                                   shadow-sm border border-[#bdc9c6]/30 flex items-center justify-center
                                   text-[#3e4947] active:scale-95 transition-transform">
                        <ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <span className="pointer-events-auto px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm
                                     shadow-sm border border-[#bdc9c6]/30 text-sm font-bold text-[#111c2d]
                                     font-['Plus_Jakarta_Sans'] max-w-[180px] truncate">
                        {t('eventDetail')}
                    </span>
                    <button className="pointer-events-auto w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm
                                       shadow-sm border border-[#bdc9c6]/30 flex items-center justify-center
                                       text-[#3e4947] active:scale-95 transition-transform">
                        <Share2 style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Hero con carrusel */}
                <div className="relative">
                    <PhotoCarousel photos={event.event_photos} />
                    {/* Overlay con categoría + título + fecha */}
                    <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-16
                                    bg-gradient-to-t from-black/60 to-transparent">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-2"
                            style={{ backgroundColor: catColor }}>
                            {t(catKey)}
                        </span>
                        <h1 className="text-[26px] font-bold text-white font-['Plus_Jakarta_Sans'] leading-tight mb-1">
                            {event.title}
                        </h1>
                        <div className="flex items-center gap-1.5 text-white/90 text-sm">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {formatFullDate(event.event_date, locale)}
                        </div>
                    </div>
                </div>

                <div className="px-5 max-w-2xl mx-auto flex flex-col gap-5 pt-5">

                    {/* Horario + Costo */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e7977]">{t('schedule')}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <Clock style={{ width: 18, height: 18, color: '#005c55', flexShrink: 0 }} />
                                <div className="text-sm font-semibold text-[#111c2d]">
                                    <div>{fmt12(event.start_time, locale)}</div>
                                    {event.end_time && <div>- {fmt12(event.end_time, locale)}</div>}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e7977]">{t('cost')}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="#005c55" strokeWidth="2" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="16" />
                                    <line x1="8" y1="12" x2="16" y2="12" />
                                </svg>
                                <span className="text-lg font-bold text-[#111c2d]">
                                    {event.price != null ? `$${event.price} ${event.currency}` : t('free')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Organizador */}
                    {event.organizer_name && (
                        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3">
                            {event.organizer_logo_url ? (
                                <img src={event.organizer_logo_url} alt={event.organizer_name}
                                    className="w-12 h-12 rounded-xl object-cover border border-[#E2E8F0]" />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-[#e7eeff] flex items-center justify-center text-xl">
                                    🏢
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#6e7977]">
                                    {t('organizedBy')}
                                </p>
                                <p className="text-sm font-bold text-[#111c2d] mt-0.5">{event.organizer_name}</p>
                            </div>
                        </div>
                    )}

                    {/* Descripción */}
                    {desc && (
                        <section>
                            <h2 className="text-xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] mb-3">
                                {t('aboutEvent')}
                            </h2>
                            <p className="text-[#3e4947] text-base leading-relaxed">{desc}</p>
                        </section>
                    )}

                    {/* Ubicación — iframe Google Maps, clic abre navegación */}
                    {event.location_name && (
                        <section>
                            <h2 className="text-xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] mb-3">
                                {t('location')}
                            </h2>
                            <div className="rounded-2xl border border-[#bdc9c6]/40 overflow-hidden bg-white">
                                {event.location_lat && (
                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${event.location_lat},${event.location_lng}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="block relative h-[160px] overflow-hidden group cursor-pointer">
                                        <iframe
                                            src={`https://maps.google.com/maps?q=${event.location_lat},${event.location_lng}&z=14&output=embed`}
                                            className="w-full h-full border-0 pointer-events-none"
                                            loading="lazy"
                                            title={event.location_name ?? ''} />
                                        <div className="absolute inset-0 flex items-center justify-center
                                                        bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                                            bg-white rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2">
                                                <Navigation style={{ width: 15, height: 15, color: '#005c55' }} />
                                                <span className="text-xs font-bold text-[#005c55]">Cómo llegar</span>
                                            </div>
                                        </div>
                                    </a>
                                )}
                                <div className="p-4 flex items-center gap-2">
                                    <MapPin style={{ width: 16, height: 16, color: '#005c55', flexShrink: 0 }} />
                                    <p className="text-sm font-semibold text-[#111c2d]">{event.location_name}</p>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </main>

            {/* Sticky footer — Añadir al Calendario */}
            <div className="fixed bottom-0 left-0 w-full bg-[#f9f9ff]/90 backdrop-blur-md
                            border-t border-[#bdc9c6]/30 px-5 py-4 z-50">
                <a href={buildCalendarUrl(event)} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl
                              bg-[#111c2d] text-white font-bold text-sm
                              hover:bg-[#263143] active:scale-95 transition-all max-w-2xl mx-auto">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <line x1="12" y1="14" x2="12" y2="18" />
                        <line x1="10" y1="16" x2="14" y2="16" />
                    </svg>
                    {t('addCalendar')}
                </a>
            </div>
        </>
    );
}