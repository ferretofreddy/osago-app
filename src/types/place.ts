export interface Category {
    id: string;
    name_es: string;
    name_en?: string;
    icon: string;
    color_hex: string;
}

export interface BusinessPhoto {
    url: string;
    is_primary: boolean;
}

export interface Amenity {
    name_es: string;
    icon: string;
}

export interface RouteType {
    name_es: string;
    warning_es: string;
}

export interface PaymentMethod {
    id: string;
    name_es: string;
    icon?: string;
}

export interface BusinessHour {
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    is_closed: boolean;
}

export type BusinessPlan = 'free' | 'premium' | 'destacado';

export interface Business {
    id: string;
    name: string;
    description_es: string;
    latitude: number;
    longitude: number;
    phone: string;
    whatsapp: string;
    plan: BusinessPlan;
    categories: Category[];
    business_photos: BusinessPhoto[];
    amenities: Amenity[];
    route_types: RouteType[];
    payment_methods: PaymentMethod[];
    business_hours: BusinessHour[];
}
