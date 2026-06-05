// src/components/place/NearYouSection.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import PlaceCard from './PlaceCard';
import { Map } from 'lucide-react';

interface Category {
    id: string;
    name_es: string;
    name_en: string;
    icon: string;
    color_hex: string;
}

interface BusinessPhoto {
    url: string;
    is_primary: boolean;
}

interface BusinessCategory {
    categories: Category;
}

interface Business {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    business_categories: BusinessCategory[];
    business_photos: BusinessPhoto[];
}

interface NearYouSectionProps {
    userLocation?: [number, number] | null;
}

export default function NearYouSection({ userLocation }: NearYouSectionProps) {
    const t = useTranslations('home');
    const router = useRouter();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNearby = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('businesses')
                    .select(`
                        id, name, latitude, longitude,
                        business_categories (
                          categories (
                            id, name_es, name_en, icon, color_hex
                          )
                        ),
                        business_photos (
                          url,
                          is_primary
                        )
                    `)
                    .eq('is_active', true)
                    .limit(10);

                if (error) {
                    console.error('Error fetching businesses:', error);
                    setBusinesses([]);
                } else if (data) {
                    const transformedData: Business[] = data.map((business: any) => ({
                        id: business.id,
                        name: business.name,
                        latitude: business.latitude,
                        longitude: business.longitude,
                        business_categories: business.business_categories || [],
                        business_photos: business.business_photos || [],
                    }));
                    setBusinesses(transformedData);
                }
            } catch (err) {
                console.error('Unexpected error:', err);
                setBusinesses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNearby();
    }, []);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const formatDistance = (km: number): string => {
        if (km < 1) return `${Math.round(km * 1000)}m`;
        return `${km.toFixed(1)}km`;
    };

    if (loading) {
        return (
            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    boxShadow: '0 -8px 24px rgba(15,118,110,0.08)',
                    borderTop: '1px solid #E2E8F0',
                }}
            >
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
                    <div style={{ width: 48, height: 6, backgroundColor: '#bdc9c6', borderRadius: 9999 }} />
                </div>

                <div style={{ padding: '0 20px 24px' }}>
                    <h2
                        style={{
                            fontSize: 24,
                            lineHeight: '32px',
                            fontWeight: 600,
                            color: '#111c2d',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            margin: '0 0 16px 0',
                        }}
                    >
                        {t('nearYou')}
                    </h2>
                    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                style={{
                                    flexShrink: 0,
                                    width: 220,
                                    height: 200,
                                    backgroundColor: '#e7eeff',
                                    borderRadius: 8,
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (businesses.length === 0) return null;

    return (
        <div
            style={{
                backgroundColor: '#ffffff',
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                boxShadow: '0 -8px 24px rgba(15,118,110,0.08)',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Handle draggable */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    paddingTop: 12,
                    paddingBottom: 8,
                    cursor: 'grab',
                    flexShrink: 0,
                }}
            >
                <div style={{ width: 48, height: 6, backgroundColor: '#bdc9c6', borderRadius: 9999 }} />
            </div>

            {/* Header: título + botón */}
            <div
                style={{
                    padding: '0 20px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    flexShrink: 0,
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: 24,
                        lineHeight: '32px',
                        fontWeight: 600,
                        color: '#111c2d',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                >
                    {t('nearYou')}
                </h2>
                <button
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#005c55',
                        fontSize: 12,
                        lineHeight: '16px',
                        letterSpacing: '0.02em',
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        padding: 0,
                    }}
                >
                    Ver mapa
                </button>
            </div>

            {/* Scroll horizontal de cards */}
            <div
                style={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: 16,              // gap-gutter del diseño Stitch
                    padding: '0 20px 24px',
                    scrollSnapType: 'x mandatory',
                    // Ocultar scrollbar
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    flexGrow: 1,
                    minHeight: 0,
                }}
                // Ocultar scrollbar en webkit
                className="hide-scrollbar"
            >
                {businesses.map((business) => {
                    const category = business.business_categories?.[0]?.categories;
                    const primaryPhoto =
                        business.business_photos?.find((p) => p.is_primary) ||
                        business.business_photos?.[0];
                    const distance = userLocation
                        ? calculateDistance(
                            userLocation[0],
                            userLocation[1],
                            business.latitude,
                            business.longitude
                        )
                        : 0;

                    return (
                        <div
                            key={business.id}
                            style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
                        >
                            <PlaceCard
                                id={business.id}
                                name={business.name}
                                category={category?.name_es || 'Lugar'}
                                categoryIcon={category?.icon || 'map-pin'}
                                categoryColor={category?.color_hex || '#005c55'}
                                distance={formatDistance(distance)}
                                imageUrl={primaryPhoto?.url}
                                onClick={() => router.push(`/es/places/${business.id}`)}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}