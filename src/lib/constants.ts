// ── Mapa centro por defecto (Puerto Jiménez) ─────────────────
export const DEFAULT_CENTER: [number, number] = [8.5333, -83.3167];
export const DEFAULT_ZOOM = 11;

// ── Dificultad de actividades ─────────────────────────────────
export const DIFFICULTY_CONFIG = {
    facil:    { labelKey: 'difficulty_facil',    bg: '#D1FAE5', text: '#065F46', icon: '✓'  },
    moderado: { labelKey: 'difficulty_moderado', bg: '#FEF3C7', text: '#92400E', icon: '🚶' },
    dificil:  { labelKey: 'difficulty_dificil',  bg: '#FFE4E6', text: '#9F1239', icon: '⛰' },
    extremo:  { labelKey: 'difficulty_extremo',  bg: '#FEE2E2', text: '#991B1B', icon: '⚠' },
} as const;

export type Difficulty = keyof typeof DIFFICULTY_CONFIG;

// ── Colores por categoría de evento ──────────────────────────
export const EVENT_CATEGORY_COLORS: Record<string, string> = {
    conservacion: '#059669',
    naturaleza:   '#10B981',
    cultura:      '#F59E0B',
    gastronomia:  '#F97316',
    deportes:     '#3B82F6',
    musica:       '#8B5CF6',
    arte:         '#EC4899',
    familiar:     '#06B6D4',
    general:      '#64748B',
};

// ── Colores de modalidad de transporte ───────────────────────
export const TRANSPORT_MODALITY_COLORS: Record<string, string> = {
    terrestre: '#6366F1',
    maritimo:  '#0EA5E9',
    aereo:     '#8B5CF6',
};

// ── Idiomas soportados ────────────────────────────────────────
export const SUPPORTED_LOCALES = ['es', 'en', 'fr', 'de', 'it'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
