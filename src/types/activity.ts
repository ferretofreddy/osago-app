import type { Difficulty } from '@/lib/constants';

export interface ActivityTag {
    id: string;
    name_es: string;
    name_en: string;
    icon: string;
}

export interface ActivityPhoto {
    url: string;
    is_primary: boolean;
    order_index: number;
}

export interface ActivityScheduleRegular {
    id: string;
    days_of_week: number[];
    departure_time: string;
}

export interface ActivityScheduleSpecific {
    id: string;
    schedule_date: string;
    departure_time: string;
    spots_available: number | null;
}

export interface ActivityIncludedService {
    id: string;
    name_es: string;
    name_en: string;
    icon: string;
    is_included: boolean;
    note_es: string | null;
    sort_order: number;
}

export interface ActivityRequirement {
    id: string;
    description_es: string;
    description_en: string | null;
    icon: string;
    sort_order: number;
}

export interface Activity {
    id: string;
    name: string;
    slug: string;
    description_es: string | null;
    description_en: string | null;
    difficulty: Difficulty;
    duration_minutes: number | null;
    distance_meters: number | null;
    elevation_gain_meters: number | null;
    price_from: number | null;
    price_currency: string;
    schedule_type: 'regular' | 'specific_dates';
    meeting_point_name: string | null;
    meeting_point_lat: number | null;
    meeting_point_lng: number | null;
    meeting_point_description: string | null;
    phone: string | null;
    whatsapp: string | null;
    plan: 'free' | 'premium' | 'destacado';
    activity_photos: ActivityPhoto[];
    activity_tags: ActivityTag[];
    activity_schedules_regular: ActivityScheduleRegular[];
    activity_schedules_specific: ActivityScheduleSpecific[];
    activity_included_services: ActivityIncludedService[];
    activity_requirements: ActivityRequirement[];
}
