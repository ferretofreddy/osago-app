export type EventCategory =
    | 'conservacion' | 'naturaleza' | 'cultura' | 'gastronomia'
    | 'deportes' | 'musica' | 'arte' | 'familiar' | 'general';

export interface EventPhoto {
    url: string;
    is_primary: boolean;
    order_index: number;
}

export interface OsaEvent {
    id: string;
    title: string;
    slug: string | null;
    description_es: string | null;
    description_en: string | null;
    category: EventCategory;
    event_date: string;
    start_time: string;
    end_time: string | null;
    location_name: string | null;
    location_lat: number | null;
    location_lng: number | null;
    price: number | null;
    currency: string;
    organizer_name: string | null;
    organizer_logo_url: string | null;
    plan: 'free' | 'premium' | 'destacado';
    event_photos: EventPhoto[];
}
