// src/components/activity/ActivityCard.tsx
'use client';

import { useTranslations } from 'next-intl';

// Configuración de dificultad — colores del diseño Stitch
export const DIFFICULTY_CONFIG = {
    facil: { labelKey: 'difficulty_facil', bg: '#D1FAE5', text: '#065F46', icon: '✓' },
    moderado: { labelKey: 'difficulty_moderado', bg: '#FEF3C7', text: '#92400E', icon: '🚶' },
    dificil: { labelKey: 'difficulty_dificil', bg: '#FFE4E6', text: '#9F1239', icon: '⛰' },
    extremo: { labelKey: 'difficulty_extremo', bg: '#FEE2E2', text: '#991B1B', icon: '⚠' },
} as const;

export type Difficulty = keyof typeof DIFFICULTY_CONFIG;

interface ActivityCardProps {
    id: string;
    name: string;
    photoUrl?: string;
    difficulty: Difficulty;
    durationMinutes?: number;
    distanceMeters?: number;
    elevationGainMeters?: number;
    priceFrom?: number;
    availabilityLabel?: string; // "Disponible hoy", "mañana", etc.
    onClick: () => void;
}

function formatDuration(minutes: number, tDuration: string, tMin: string): string {
    if (minutes < 60) return `${minutes} ${tMin}`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}${tDuration} ${m}${tMin}` : `${h}${tDuration}`;
}

export default function ActivityCard({
    name, photoUrl, difficulty, durationMinutes,
    distanceMeters, elevationGainMeters, priceFrom, availabilityLabel, onClick,
}: ActivityCardProps) {
    const t = useTranslations('activities');
    const diff = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.facil;

    return (
        <article
            onClick={onClick}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#bdc9c6]/30
                       cursor-pointer hover:shadow-md transition-shadow duration-200"
        >
            {/* Imagen con badge de dificultad */}
            <div className="relative w-full h-[200px] bg-[#d8e3fb] overflow-hidden">
                {photoUrl ? (
                    <img src={photoUrl} alt={name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🌿</div>
                )}
                {/* Badge dificultad — esquina superior derecha */}
                <span className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1
                                 rounded-full text-xs font-bold shadow-sm"
                    style={{ backgroundColor: diff.bg, color: diff.text }}>
                    <span>{diff.icon}</span>
                    {t(diff.labelKey as Parameters<typeof t>[0])}
                </span>
            </div>

            {/* Contenido */}
            <div className="px-4 py-4 flex flex-col gap-3">
                <h3 className="text-lg font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] leading-tight">
                    {name}
                </h3>

                {/* Métricas: duración, distancia, desnivel */}
                <div className="flex items-center gap-3 text-xs text-[#3e4947] font-medium flex-wrap">
                    {durationMinutes && (
                        <span className="flex items-center gap-1">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            {formatDuration(durationMinutes, t('duration'), t('durationMinutes'))}
                        </span>
                    )}
                    {distanceMeters != null && distanceMeters > 0 && (
                        <span className="flex items-center gap-1">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 3h6l3 18 3-12h6" />
                            </svg>
                            {(distanceMeters / 1000).toFixed(1)} {t('distance')}
                        </span>
                    )}
                    {elevationGainMeters != null && elevationGainMeters > 0 && (
                        <span className="flex items-center gap-1">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
                            </svg>
                            +{elevationGainMeters}m
                        </span>
                    )}
                </div>

                {/* Precio + flecha */}
                <div className="flex items-center justify-between mt-1">
                    <div>
                        {priceFrom != null && (
                            <>
                                <span className="text-2xl font-bold text-[#111c2d]">${priceFrom}</span>
                                <span className="text-sm text-[#6e7977]">{t('perPerson')}</span>
                            </>
                        )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#f0f3ff] flex items-center justify-center
                                    text-[#005c55] hover:bg-[#e7eeff] transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </div>
                </div>
            </div>
        </article>
    );
}