// src/app/[locale]/(public)/events/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';

// ─── Tipos ────────────────────────────────────────────────────
interface Event {
    id: string; title: string; category: string;
    event_date: string; start_time: string; end_time: string | null;
    location_name: string | null; price: number | null;
    organizer_name: string | null;
    event_photos: { url: string; is_primary: boolean }[];
}

// ─── Colores por categoría ────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
    conservacion: '#059669', naturaleza: '#10B981', cultura: '#F59E0B',
    gastronomia: '#F97316', deportes: '#3B82F6', musica: '#8B5CF6',
    arte: '#EC4899', familiar: '#06B6D4', general: '#64748B',
};

// ─── Helpers ─────────────────────────────────────────────────
function fmt12(time: string, locale: string) {
    const [h, m] = time.split(':').map(Number);
    if (['fr', 'de', 'it'].includes(locale)) return `${h}:${m.toString().padStart(2, '0')}`;
    const p = h >= 12 ? 'PM' : 'AM';
    return `${(h % 12 || 12).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${p}`;
}

const MONTH_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// ─── Componente ───────────────────────────────────────────────
export default function EventsPage() {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('events');

    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const today = new Date();
    const [calYear, setCalYear] = useState(today.getFullYear());
    const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed
    const [selected, setSelected] = useState<string | null>(null); // 'YYYY-MM-DD'

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            const supabase = createClient();
            const { data } = await supabase
                .from('events')
                .select('id, title, category, event_date, start_time, end_time, location_name, price, organizer_name, event_photos(url, is_primary)')
                .eq('is_active', true)
                .gte('event_date', today.toISOString().split('T')[0])
                .order('event_date');
            if (!cancelled) { setEvents((data as unknown as Event[]) ?? []); setLoading(false); }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    // Mapa fecha → número de eventos
    const eventsByDate = useMemo(() => {
        const map: Record<string, Event[]> = {};
        for (const e of events) {
            if (!map[e.event_date]) map[e.event_date] = [];
            map[e.event_date].push(e);
        }
        return map;
    }, [events]);

    // Días del calendario del mes actual
    const calDays = useMemo(() => {
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const adj = (firstDay + 6) % 7; // Lun=0
        const total = new Date(calYear, calMonth + 1, 0).getDate();
        return { adj, total };
    }, [calYear, calMonth]);

    // Eventos a mostrar: si hay fecha seleccionada → solo esa; sino → todos upcoming
    const visibleEvents = useMemo(() => {
        if (selected) return eventsByDate[selected] ?? [];
        return events;
    }, [selected, events, eventsByDate]);

    const prevMonth = () => {
        if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
        else setCalMonth(m => m - 1);
        setSelected(null);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
        else setCalMonth(m => m + 1);
        setSelected(null);
    };

    const months: string[] = t.raw('months') as string[];
    const weekDays: string[] = t.raw('weekDays') as string[];

    const photoUrl = (e: Event) =>
        (e.event_photos?.find(p => p.is_primary) ?? e.event_photos?.[0])?.url;

    return (
        <>
            <main className="min-h-screen bg-[#f9f9ff] pb-24">

                {/* Header */}
                <header className="sticky top-0 z-40 bg-[#f9f9ff] border-b border-[#E2E8F0] shadow-sm">
                    <div className="flex items-center justify-between px-5 h-16 max-w-2xl mx-auto">
                        <div className="flex items-center gap-2">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                                stroke="#005c55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <h1 className="text-xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                                {t('pageTitle')}
                            </h1>
                        </div>
                    </div>
                </header>

                <div className="px-5 py-5 max-w-2xl mx-auto flex flex-col gap-5">

                    {/* ── Calendario ───────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                        {/* Navegación mes */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
                            <button onClick={prevMonth}
                                className="w-9 h-9 flex items-center justify-center rounded-full
                                           hover:bg-[#f0f3ff] text-[#3e4947] transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="15,18 9,12 15,6" />
                                </svg>
                            </button>
                            <span className="text-base font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                                {months[calMonth]} {calYear}
                            </span>
                            <button onClick={nextMonth}
                                className="w-9 h-9 flex items-center justify-center rounded-full
                                           hover:bg-[#f0f3ff] text-[#3e4947] transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="9,18 15,12 9,6" />
                                </svg>
                            </button>
                        </div>

                        {/* Días de semana */}
                        <div className="grid grid-cols-7 px-3 pt-3">
                            {weekDays.map((d, i) => (
                                <div key={i} className="text-center text-xs font-bold text-[#6e7977] py-1">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Celdas de días */}
                        <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
                            {/* Padding inicial */}
                            {Array.from({ length: calDays.adj }).map((_, i) => (
                                <div key={`pad-${i}`} />
                            ))}
                            {Array.from({ length: calDays.total }).map((_, i) => {
                                const day = i + 1;
                                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isToday = dateStr === today.toISOString().split('T')[0];
                                const isSel = dateStr === selected;
                                const hasEvt = !!eventsByDate[dateStr]?.length;
                                const evtCount = eventsByDate[dateStr]?.length ?? 0;

                                return (
                                    <button key={day} onClick={() => setSelected(isSel ? null : dateStr)}
                                        className="flex flex-col items-center justify-center h-10 rounded-xl
                                                   text-sm font-medium transition-all duration-150 relative"
                                        style={isSel
                                            ? { backgroundColor: '#005c55', color: 'white' }
                                            : isToday
                                                ? { backgroundColor: '#e7f5f2', color: '#005c55', fontWeight: 700 }
                                                : { color: '#111c2d' }
                                        }>
                                        {day}
                                        {hasEvt && !isSel && (
                                            <span className="absolute bottom-1 flex gap-0.5">
                                                {Array.from({ length: Math.min(evtCount, 3) }).map((_, k) => (
                                                    <span key={k} className="w-1 h-1 rounded-full bg-[#fea619]" />
                                                ))}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Lista de eventos ─────────────────────── */}
                    <div>
                        <h2 className="text-base font-semibold text-[#3e4947] mb-3">
                            {selected
                                ? `${selected.split('-')[2]} ${months[parseInt(selected.split('-')[1]) - 1]}`
                                : t('upcoming')}
                        </h2>

                        {loading ? (
                            [1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-[#e7eeff] animate-pulse mb-3" />)
                        ) : visibleEvents.length === 0 ? (
                            <div className="text-center py-10 text-[#6e7977]">
                                <p className="text-2xl mb-2">📅</p>
                                <p className="text-sm font-semibold">{selected ? t('noEvents') : t('noUpcoming')}</p>
                            </div>
                        ) : (
                            visibleEvents.map(e => {
                                const [_, mm, dd] = e.event_date.split('-');
                                const catColor = CAT_COLOR[e.category] || '#64748B';
                                const photo = photoUrl(e);

                                return (
                                    <button key={e.id} onClick={() => router.push(`/${locale}/events/${e.id}`)}
                                        className="w-full bg-white rounded-2xl border border-[#bdc9c6]/30
                                                   shadow-sm hover:shadow-md transition-shadow duration-200
                                                   flex items-start gap-0 overflow-hidden mb-3 text-left">

                                        {/* Bloque fecha */}
                                        <div className="flex flex-col items-center justify-center px-4 py-5
                                                        bg-[#f0f3ff] min-w-[72px] self-stretch border-r border-[#E2E8F0]">
                                            <span className="text-2xl font-bold text-[#111c2d]">{dd}</span>
                                            <span className="text-xs font-bold text-[#6e7977] uppercase mt-0.5">
                                                {months[parseInt(mm) - 1]?.slice(0, 3)}
                                            </span>
                                        </div>

                                        {/* Contenido */}
                                        <div className="flex-1 px-4 py-4 flex flex-col gap-2 min-w-0">
                                            <h3 className="text-base font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']
                                                           leading-tight truncate">
                                                {e.title}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-xs text-[#3e4947]">
                                                <Clock style={{ width: 12, height: 12, flexShrink: 0 }} />
                                                {fmt12(e.start_time, locale)}
                                                {e.end_time ? ` - ${fmt12(e.end_time, locale)}` : ''}
                                            </div>
                                            {e.location_name && (
                                                <div className="flex items-center gap-1.5 text-xs text-[#3e4947]">
                                                    <MapPin style={{ width: 12, height: 12, flexShrink: 0 }} />
                                                    <span className="truncate">{e.location_name}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-base font-bold text-[#111c2d]">
                                                    {e.price != null ? `$${e.price}` : t('free')}
                                                </span>
                                                {e.organizer_name && (
                                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg
                                                                     text-[10px] font-semibold text-[#3e4947]
                                                                     bg-[#f0f3ff] border border-[#bdc9c6]/30">
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                                            stroke="currentColor" strokeWidth="2">
                                                            <rect x="3" y="4" width="18" height="18" rx="2" />
                                                            <line x1="16" y1="2" x2="16" y2="6" />
                                                            <line x1="8" y1="2" x2="8" y2="6" />
                                                            <line x1="3" y1="10" x2="21" y2="10" />
                                                        </svg>
                                                        {e.organizer_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
            <BottomNav />
        </>
    );
}