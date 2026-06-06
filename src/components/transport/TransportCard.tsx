// src/components/transport/TransportCard.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';

interface TransportCardProps {
    id: string;
    name: string;
    logoUrl?: string;
    typeName: string;
    routePointA?: string;
    routePointB?: string;
    fareAmount?: number;      // tarifa de la ruta mostrada (no el mínimo global)
    fareType?: string;
    firstDeparture?: string;
    daysLabel?: string;       // ya traducido desde el padre
    services?: { icon: string; name_es: string }[];
    totalRoutes?: number;     // total de rutas para mostrar "+X más"
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
    shield: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    wifi: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" /></svg>,
    wind: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></svg>,
    users: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    umbrella: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" /></svg>,
};

export default function TransportCard({
    id, name, logoUrl, typeName,
    routePointA, routePointB, fareAmount, fareType = 'por_persona',
    firstDeparture, daysLabel, services = [], totalRoutes = 1,
}: TransportCardProps) {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('transport');

    const fareLabel = fareType === 'fijo' ? t('fareFixed')
        : fareType === 'por_viaje' ? t('perTrip')
            : t('perPerson');

    const extraRoutes = totalRoutes - 1;

    return (
        <div className="bg-white rounded-xl border border-[#bdc9c6]/40 p-4 flex flex-col gap-3
                        shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#005c55]/5 rounded-bl-full
                            transition-transform duration-300 group-hover:scale-110 -z-0" />

            {/* Header */}
            <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#e7eeff] border border-[#bdc9c6]/40
                                    flex items-center justify-center overflow-hidden shrink-0">
                        {logoUrl ? (
                            <img src={logoUrl} alt={name} className="w-full h-full object-cover"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                            <MapPin style={{ width: 24, height: 24, color: '#6e7977' }} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] leading-tight">{name}</h3>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#e7eeff]
                                         text-[#005c55] text-xs font-semibold border border-[#005c55]/20">
                            {typeName}
                        </span>
                    </div>
                </div>
                {fareAmount != null && (
                    <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-[#005c55]">${fareAmount}</p>
                        <p className="text-xs text-[#6e7977]">{fareLabel}</p>
                    </div>
                )}
            </div>

            {/* Ruta preview */}
            {(routePointA || routePointB) && (
                <div className="flex items-center gap-2 bg-[#f0f7f4] rounded-lg px-3 py-2.5 z-10">
                    <div className="flex flex-col items-center gap-0.5 mx-1">
                        <div className="w-2 h-2 rounded-full bg-[#005c55]" />
                        <div className="w-px h-4 border-l border-dashed border-[#bdc9c6]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#fea619]" />
                    </div>
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111c2d] leading-none truncate">{routePointA}</p>
                        <p className="text-sm font-semibold text-[#111c2d] leading-none truncate">{routePointB}</p>
                    </div>
                    {/* Badge "+X más rutas" */}
                    {extraRoutes > 0 && (
                        <span className="shrink-0 text-xs font-semibold text-[#005c55] bg-[#e7f5f2]
                                         px-2 py-1 rounded-full border border-[#005c55]/20 whitespace-nowrap">
                            +{extraRoutes} {t('moreRoutes')}
                        </span>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-end z-10">
                <div className="flex flex-col gap-1.5">
                    {firstDeparture && (
                        <div className="flex items-center gap-1.5 text-[#3e4947]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span className="text-xs font-medium">
                                {firstDeparture}{daysLabel ? ` • ${daysLabel}` : ''}
                            </span>
                        </div>
                    )}
                    {services.length > 0 && (
                        <div className="flex gap-1">
                            {services.slice(0, 4).map((s, i) => (
                                <span key={i} title={s.name_es}
                                    className="flex items-center justify-center w-6 h-6 rounded bg-[#f0f3ff] text-[#3e4947]">
                                    {SERVICE_ICONS[s.icon] ?? <MapPin width={12} height={12} />}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => router.push(`/${locale}/transport/${id}`)}
                    className="bg-[#005c55] text-white text-xs font-semibold px-4 py-2 rounded-full
                               hover:bg-[#0f766e] active:scale-95 transition-all shadow-sm"
                >
                    {t('details')}
                </button>
            </div>
        </div>
    );
}