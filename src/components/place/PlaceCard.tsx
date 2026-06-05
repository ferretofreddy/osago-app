// src/components/place/PlaceCard.tsx

'use client';

import { MapPin, Star, Utensils, Bed, Compass, Car, TreePine, Pill, PersonStanding } from 'lucide-react';

interface PlaceCardProps {
    id: string;
    name: string;
    category: string;
    categoryIcon: string;
    categoryColor: string;
    distance: string;
    imageUrl?: string;
    onClick?: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
    'utensils': <Utensils style={{ width: 14, height: 14 }} />,
    'bed': <Bed style={{ width: 14, height: 14 }} />,
    'compass': <Compass style={{ width: 14, height: 14 }} />,
    'car': <Car style={{ width: 14, height: 14 }} />,
    'tree': <TreePine style={{ width: 14, height: 14 }} />,
    'pill': <Pill style={{ width: 14, height: 14 }} />,
};

export default function PlaceCard({
    id,
    name,
    category,
    categoryIcon,
    categoryColor,
    distance,
    imageUrl,
    onClick,
}: PlaceCardProps) {
    const IconComponent = iconMap[categoryIcon];

    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onClick?.();
            }}
            style={{
                flexShrink: 0,
                width: 220,
                backgroundColor: '#f9f9ff',
                borderRadius: 8,
                border: '1px solid rgba(189,201,198,0.3)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
            }}
        >
            {/* Imagen — altura fija 112px, sin overlay */}
            <div
                style={{
                    position: 'relative',
                    height: 112,
                    width: '100%',
                    backgroundColor: '#dee8ff',
                    overflow: 'hidden',
                    flexShrink: 0,
                }}
            >
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt={name}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                    />
                )}

                {/* Fallback sin imagen */}
                {!imageUrl && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: `${categoryColor}20`,
                        }}
                    >
                        <MapPin style={{ width: 40, height: 40, color: '#3e4947', opacity: 0.25 }} />
                    </div>
                )}

                {/* Botón favorito — esquina superior derecha, pequeño y discreto */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('Favorito:', id);
                    }}
                    aria-label="Agregar a favoritos"
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                        backgroundColor: 'rgba(249,249,255,0.9)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: '50%',
                        padding: 4,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        lineHeight: 1,
                    }}
                >
                    <Star style={{ width: 16, height: 16, color: '#855300' }} />
                </button>
            </div>

            {/* Contenido de texto */}
            <div
                style={{
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    justifyContent: 'space-between',
                    gap: 0,
                }}
            >
                {/* Nombre y categoría */}
                <div>
                    <h3
                        style={{
                            margin: 0,
                            fontSize: 14,
                            lineHeight: '20px',
                            fontWeight: 600,
                            letterSpacing: '0.01em',
                            color: '#111c2d',
                            fontFamily: "'Inter', sans-serif",
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {name}
                    </h3>

                    {/* Categoría con ícono — debajo del nombre, color neutro */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 4,
                            color: '#3e4947',
                        }}
                    >
                        {IconComponent || <MapPin style={{ width: 14, height: 14 }} />}
                        <span
                            style={{
                                fontSize: 12,
                                lineHeight: '16px',
                                letterSpacing: '0.02em',
                                fontWeight: 500,
                                fontFamily: "'Inter', sans-serif",
                            }}
                        >
                            {category}
                        </span>
                    </div>
                </div>

                {/* Distancia — color primario, al fondo */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 8,
                        color: '#005c55',
                        fontWeight: 500,
                    }}
                >
                    {/* Ícono de caminata */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0 }}
                    >
                        <circle cx="13" cy="4" r="2" />
                        <path d="M5 9l4 1 2 5 3-3 3 5" />
                        <path d="M9.5 14.5L7 19" />
                        <path d="M14 14l2 5" />
                    </svg>
                    <span
                        style={{
                            fontSize: 12,
                            lineHeight: '16px',
                            letterSpacing: '0.02em',
                            fontFamily: "'Inter', sans-serif",
                        }}
                    >
                        {distance}
                    </span>
                </div>
            </div>
        </div>
    );
}