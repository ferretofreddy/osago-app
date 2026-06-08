export interface TransportModality {
    name_es: string;
    icon: string;
    color_hex: string;
}

export interface TransportType {
    name_es: string;
    icon: string;
}

export interface TransportRouteSchedule {
    id: string;
    direction: string;
    departure_time: string;
    days_of_week: number[];
    notes: string | null;
}

export interface TransportRouteService {
    id: string;
    name_es: string;
    name_en: string;
    icon: string;
}

export interface TransportRoute {
    id: string;
    name: string | null;
    point_a_name: string;
    point_a_lat: number | null;
    point_a_lng: number | null;
    point_b_name: string;
    point_b_lat: number | null;
    point_b_lng: number | null;
    fare_amount: number | null;
    fare_currency: string;
    fare_type: string;
    fare_notes: string | null;
    duration_minutes: number | null;
    sort_order: number;
    transport_route_schedules: TransportRouteSchedule[];
    transport_route_services: TransportRouteService[];
}

export interface Transport {
    id: string;
    name: string;
    description_es: string | null;
    logo_url: string | null;
    phone: string | null;
    whatsapp: string | null;
    service_type: string;
    plan: 'free' | 'premium' | 'destacado';
    transport_modalities: TransportModality;
    transport_types: TransportType;
    transport_routes: TransportRoute[];
    transport_photos: { url: string; is_primary: boolean; order_index: number }[];
}
