// src/app/[locale]/(public)/places/[id]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft, MapPin, Navigation, MessageCircle,
    Wifi, Car, PawPrint, Utensils, Bed, Compass,
    TreePine, Pill, Waves, Snowflake, ShowerHead,
} from 'lucide-react';

interface Category {
    name_es: string;
    icon: string;
    color_hex: string;
}

interface BusinessPhoto {
    url: string;
    is_primary: boolean;
}

interface Amenity {
    name_es: string;
    icon: string;
}

interface RouteType {
    name_es: string;
    warning_es: string;
}

interface PaymentMethod {
    name_es: string;
    icon: string;
}

interface BusinessHour {
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    is_closed: boolean;
}

interface Business {
    id: string;
    name: string;
    description_es: string;
    latitude: number;
    longitude: number;
    phone: string;
    whatsapp: string;
    categories: Category[];
    business_photos: BusinessPhoto[];
    amenities: Amenity[];
    route_types: RouteType[];
    payment_methods: PaymentMethod[];
    business_hours: BusinessHour[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'utensils': <Utensils style={{ width: 14, height: 14 }} />,
    'bed': <Bed style={{ width: 14, height: 14 }} />,
    'compass': <Compass style={{ width: 14, height: 14 }} />,
    'tree': <TreePine style={{ width: 14, height: 14 }} />,
    'car': <Car style={{ width: 14, height: 14 }} />,
    'pill': <Pill style={{ width: 14, height: 14 }} />,
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
    'wifi': <Wifi style={{ width: 20, height: 20 }} />,
    'parking-circle': <Car style={{ width: 20, height: 20 }} />,
    'paw-print': <PawPrint style={{ width: 20, height: 20 }} />,
    'waves': <Waves style={{ width: 20, height: 20 }} />,
    'snowflake': <Snowflake style={{ width: 20, height: 20 }} />,
    'shower-head': <ShowerHead style={{ width: 20, height: 20 }} />,
};

function isOpenNow(hours: BusinessHour[]): boolean {
    if (!hours || hours.length === 0) return false;
    const now = new Date();
    const today = now.getDay();
    const h = hours.find(h => h.day_of_week === today);
    if (!h || h.is_closed) return false;
    const [openH, openM] = h.opens_at.split(':').map(Number);
    const [closeH, closeM] = h.closes_at.split(':').map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= openH * 60 + openM && cur < closeH * 60 + closeM;
}

// Formato 12h para es/en, 24h para fr/de/it
function formatTime(time: string, locale: string): string {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    if (['fr', 'de', 'it'].includes(locale)) {
        return `${hour}:${m}`;
    }
    const ampm = hour >= 12 ? 'pm' : 'am';
    return `${hour % 12 || 12}:${m}${ampm}`;
}

export default function PlaceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations('place');
    const locale = useLocale(); // ← detecta /es, /en, /fr, /de, /it
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('businesses')
                    .select(`
                        id, name, description_es, latitude, longitude, phone, whatsapp,
                        categories!business_categories ( name_es, icon, color_hex ),
                        business_photos ( url, is_primary ),
                        amenities!business_amenities ( name_es, icon ),
                        route_types!business_route_types ( name_es, warning_es ),
                        payment_methods!business_payment_methods ( name_es, icon ),
                        business_hours ( day_of_week, opens_at, closes_at, is_closed )
                    `)
                    .eq('id', params.id)
                    .eq('is_active', true)
                    .single();

                if (error) {
                    console.error('Error fetching business:', error);
                } else if (data) {
                    setBusiness(data as unknown as Business);
                }
            } catch (err) {
                console.error('Unexpected error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBusiness();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f9f9ff]">
                <div className="h-[45vh] bg-[#e7eeff] animate-pulse" />
                <div className="px-5 py-6 space-y-4">
                    <div className="h-8 bg-[#e7eeff] rounded animate-pulse w-2/3" />
                    <div className="h-4 bg-[#e7eeff] rounded animate-pulse w-1/3" />
                    <div className="h-24 bg-[#e7eeff] rounded animate-pulse" />
                </div>
            </div>
        );
    }

    if (!business) {
        return (
            <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-[#111c2d] mb-2">{t('notFound')}</h2>
                    <button onClick={() => router.back()} className="text-[#005c55] font-medium hover:underline">
                        {t('notFoundBack')}
                    </button>
                </div>
            </div>
        );
    }

    const categories = (business.categories || []) as Category[];
    const amenities = (business.amenities || []) as Amenity[];
    const routeTypes = (business.route_types || []) as RouteType[];
    const paymentMethods = (business.payment_methods || []) as PaymentMethod[];
    const hours = (business.business_hours || []) as BusinessHour[];

    const category = categories[0];
    const routeType = routeTypes[0];
    const primaryPhoto = business.business_photos?.find(p => p.is_primary) || business.business_photos?.[0];
    const open = isOpenNow(hours);
    const todayHours = hours.find(h => h.day_of_week === new Date().getDay());

    return (
        <div className="min-h-screen bg-[#f9f9ff]">

            {/* Hero Image */}
            <div className="relative h-[45vh] w-full">
                {primaryPhoto?.url ? (
                    <img src={primaryPhoto.url} alt={business.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#e7eeff] to-[#dee8ff]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#f9f9ff]" />
                <button
                    onClick={() => router.back()}
                    className="absolute top-5 left-5 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white border border-white/20 shadow-lg transition-transform active:scale-95"
                >
                    <ArrowLeft style={{ width: 20, height: 20 }} />
                </button>
            </div>

            {/* Tarjeta flotante */}
            <div className="-mt-6 relative z-10 pb-28">
                <div className="bg-[#f9f9ff] rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.05)] px-5 pt-6 pb-4">

                    <h1 className="text-[28px] leading-9 font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] tracking-tight mb-2">
                        {business.name}
                    </h1>

                    {/* Estado abierto/cerrado con hora en formato del locale */}
                    <div className="flex items-center gap-2 mb-3">
                        <span style={{
                            width: 10, height: 10, borderRadius: '50%',
                            backgroundColor: open ? '#10B981' : '#EF4444',
                            display: 'inline-block', flexShrink: 0,
                        }} />
                        <span className="text-sm font-semibold" style={{ color: open ? '#005c55' : '#EF4444' }}>
                            {open ? t('openNow') : t('closed')}
                            {todayHours && !todayHours.is_closed && (
                                <span className="text-[#3e4947] font-normal ml-1">
                                    · {formatTime(todayHours.opens_at, locale)} – {formatTime(todayHours.closes_at, locale)}
                                </span>
                            )}
                        </span>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-5">
                        {category && (
                            <span
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                                style={{ backgroundColor: category.color_hex || '#005c55' }}
                            >
                                {CATEGORY_ICONS[category.icon] || <MapPin style={{ width: 14, height: 14 }} />}
                                {category.name_es}
                            </span>
                        )}
                        {paymentMethods.map((pm, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#3e4947]"
                                style={{ backgroundColor: 'rgba(216,227,251,0.6)', border: '1px solid rgba(189,201,198,0.3)' }}>
                                {pm.name_es}
                            </span>
                        ))}
                        {routeType && (
                            <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#3e4947]"
                                style={{ backgroundColor: 'rgba(216,227,251,0.6)', border: '1px solid rgba(189,201,198,0.3)' }}>
                                {routeType.name_es}
                            </span>
                        )}
                    </div>

                    <p className="text-[#3e4947] text-base leading-relaxed mb-6">
                        {business.description_es || t('noDescription')}
                    </p>

                    {/* Servicios Adicionales */}
                    {amenities.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-[#111c2d] font-['Plus_Jakarta_Sans'] mb-4">
                                {t('additionalServices')}
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {amenities.map((amenity, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E2E8F0] shadow-sm"
                                        style={{ backgroundColor: '#f0f3ff' }}>
                                        <span style={{ color: '#fea619', flexShrink: 0 }}>
                                            {AMENITY_ICONS[amenity.icon] || <MapPin style={{ width: 20, height: 20 }} />}
                                        </span>
                                        <span className="text-sm font-semibold text-[#111c2d]">{amenity.name_es}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ruta y Acceso */}
                    {routeType && (
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-[#111c2d] font-['Plus_Jakarta_Sans'] mb-3">
                                {t('routeAndAccess')}
                            </h2>
                            <div className="p-4 rounded-xl flex flex-col gap-3"
                                style={{ backgroundColor: 'rgba(255,218,214,0.2)', border: '1px solid rgba(255,218,214,0.3)' }}>
                                <div className="flex items-center gap-2">
                                    <Car style={{ width: 20, height: 20, color: '#3e4947', flexShrink: 0 }} />
                                    <span className="text-sm font-semibold text-[#111c2d]">{routeType.name_es}</span>
                                </div>
                                {routeType.warning_es && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg"
                                        style={{ backgroundColor: 'rgba(255,218,214,0.4)' }}>
                                        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
                                        <p className="text-sm text-[#93000a] leading-5">{routeType.warning_es}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Horarios con hora en formato del locale */}
                    {hours.length > 0 && (
                        <div className="mb-2">
                            <h2 className="text-2xl font-semibold text-[#111c2d] font-['Plus_Jakarta_Sans'] mb-3">
                                {t('schedule')}
                            </h2>
                            <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                                {hours
                                    .slice()
                                    .sort((a, b) => a.day_of_week - b.day_of_week)
                                    .map((h, i) => {
                                        const isToday = h.day_of_week === new Date().getDay();
                                        const dayLabel = t(`days.${h.day_of_week}`);
                                        return (
                                            <div key={i}
                                                className="flex justify-between items-center px-4 py-2.5 text-sm border-b border-[#E2E8F0] last:border-0"
                                                style={{ backgroundColor: isToday ? 'rgba(0,92,85,0.06)' : '#ffffff' }}>
                                                <span className="font-medium" style={{ color: isToday ? '#005c55' : '#111c2d', minWidth: 36 }}>
                                                    {dayLabel}
                                                </span>
                                                <span style={{ color: isToday ? '#005c55' : '#3e4947' }}>
                                                    {h.is_closed
                                                        ? t('dayClosed')
                                                        : `${formatTime(h.opens_at, locale)} – ${formatTime(h.closes_at, locale)}`}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Action Bar fijo */}
            <div className="fixed bottom-0 left-0 right-0 p-5"
                style={{
                    zIndex: 9999,
                    backgroundColor: 'rgba(249,249,255,0.92)',
                    backdropFilter: 'blur(16px)',
                    borderTop: '1px solid rgba(189,201,198,0.2)',
                }}>
                <div className="flex gap-4 max-w-md mx-auto">
                    <button
                        onClick={() => window.open(`https://wa.me/${business.whatsapp || business.phone}`, '_blank')}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full border-2 border-[#005c55] text-[#005c55] font-semibold text-sm hover:bg-[#005c55] hover:text-white transition-colors active:scale-95"
                    >
                        <MessageCircle style={{ width: 18, height: 18 }} />
                        {t('whatsapp')}
                    </button>
                    <button
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`, '_blank')}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#005c55] text-white font-semibold text-sm hover:bg-[#0f766e] transition-colors active:scale-95"
                        style={{ boxShadow: '0 8px 20px rgba(0,92,85,0.25)' }}
                    >
                        <Navigation style={{ width: 18, height: 18 }} />
                        {t('howToGet')}
                    </button>
                </div>
            </div>

        </div>
    );
}