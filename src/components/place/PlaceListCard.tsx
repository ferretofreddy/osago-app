// src/components/place/PlaceListCard.tsx

'use client';

import { MapPin } from 'lucide-react';

interface PlaceListCardProps {
    id: string;
    name: string;
    photoUrl?: string;
    subcategoryName?: string;
    categoryName?: string;
    rating?: number;
    reviewCount?: number;
    distanceMeters?: number;
    isOpen?: boolean | null;
    onClick: () => void;
}

function formatDistance(meters: number): { text: string; mode: 'walk' | 'car' } {
    if (meters < 2000) {
        const mins = Math.round(meters / 80);
        return { text: `${mins} min a pie`, mode: 'walk' };
    }
    return { text: `${(meters / 1000).toFixed(1)} km`, mode: 'car' };
}

function WalkIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1" /><path d="m9 20 3-6 2 2 3-6" /><path d="m6 17 1.5-3" />
            <path d="M9 11l1-4 2 1 1 3" />
        </svg>
    );
}

function CarIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 17H5a2 2 0 0 1-2-2V9l3-4h12l3 4v6a2 2 0 0 1-2 2z" />
            <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
        </svg>
    );
}

export default function PlaceListCard({
    name, photoUrl, subcategoryName, categoryName,
    rating, reviewCount, distanceMeters, isOpen, onClick,
}: PlaceListCardProps) {
    const isClosed = isOpen === false;
    const distInfo = distanceMeters != null ? formatDistance(distanceMeters) : null;

    return (
        <article
            onClick={onClick}
            className={`flex bg-white rounded-xl p-3 border border-[#bdc9c6]/40 shadow-sm gap-4
                        cursor-pointer hover:shadow-md transition-shadow duration-200
                        ${isClosed ? 'opacity-75' : ''}`}
        >
            {/* Imagen — usa <img> para evitar configurar next/image con dominios externos */}
            <div className="w-[100px] h-[100px] shrink-0 rounded-lg overflow-hidden bg-[#d8e3fb] relative flex-none">
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt={name}
                        className={`w-full h-full object-cover ${isClosed ? 'grayscale-[20%]' : ''}`}
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <MapPin style={{ width: 28, height: 28, color: '#6e7977' }} />
                    </div>
                )}
                {isClosed && (
                    <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                        <span className="bg-white text-[#111c2d] text-[10px] font-bold px-2 py-1 rounded-full">
                            CERRADO
                        </span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center flex-grow min-w-0">
                <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="text-sm font-bold text-[#111c2d] truncate leading-5">{name}</h3>
                    {rating != null && (
                        <div className="flex items-center gap-1 shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fea619" stroke="none">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span className="text-xs text-[#111c2d]">{rating.toFixed(1)}</span>
                            {reviewCount != null && reviewCount > 0 && (
                                <span className="text-xs text-[#6e7977]">({reviewCount})</span>
                            )}
                        </div>
                    )}
                </div>

                {(subcategoryName || categoryName) && (
                    <p className="text-xs text-[#3e4947] mb-2 truncate">
                        {[subcategoryName, categoryName].filter(Boolean).join(' • ')}
                    </p>
                )}

                {distInfo ? (
                    <div className={`flex items-center gap-1 text-xs font-semibold
                        ${isClosed ? 'text-[#6e7977]' : 'text-[#005c55]'}`}>
                        {distInfo.mode === 'walk' ? <WalkIcon /> : <CarIcon />}
                        <span>{distInfo.text}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-xs text-[#6e7977]">
                        <MapPin style={{ width: 14, height: 14 }} />
                        <span>Osa Peninsula</span>
                    </div>
                )}
            </div>
        </article>
    );
}