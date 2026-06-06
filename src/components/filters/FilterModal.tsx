// src/components/filters/FilterModal.tsx
// Bottom sheet de filtros — diseño fiel a osago_filtros
// Dinámico: carga subcategorías, métodos de pago y tipos de ruta desde BD

'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FilterState {
    distance: string;           // '500m' | '1km' | '5km' | '10km' | 'any'
    subcategoryIds: string[];
    paymentMethodIds: string[];
    routeTypeIds: string[];
    openNow: boolean;
}

export const EMPTY_FILTERS: FilterState = {
    distance: 'any',
    subcategoryIds: [],
    paymentMethodIds: [],
    routeTypeIds: [],
    openNow: false,
};

interface SubcategoryOption { id: string; name_es: string }
interface PaymentOption { id: string; name_es: string }
interface RouteTypeOption { id: string; name_es: string }

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    categoryId: string;
    initialFilters: FilterState;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countActiveFilters(f: FilterState): number {
    let n = 0;
    if (f.distance !== 'any') n++;
    n += f.subcategoryIds.length;
    n += f.paymentMethodIds.length;
    n += f.routeTypeIds.length;
    if (f.openNow) n++;
    return n;
}

const DISTANCES = ['500m', '1km', '5km', '10km', 'Cualquiera'];

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function DistanceChip({ value, selected, onToggle }: {
    value: string; selected: boolean; onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className={`px-5 py-2.5 rounded-full border text-sm font-semibold transition-all duration-150
                ${selected
                    ? 'border-[#0f766e] bg-[#0f766e] text-[#a3faef] shadow-sm'
                    : 'border-[#bdc9c6] bg-white text-[#3e4947] hover:bg-[#e7eeff]'
                }`}
        >
            {value}
        </button>
    );
}

function SubcategoryChip({ label, selected, onToggle }: {
    label: string; selected: boolean; onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm font-semibold transition-all duration-150
                ${selected
                    ? 'border-[#0f766e] bg-[#0f766e] text-[#a3faef] shadow-sm'
                    : 'border-[#bdc9c6] bg-white text-[#3e4947] hover:bg-[#e7eeff]'
                }`}
        >
            {selected && <Check style={{ width: 14, height: 14 }} />}
            {label}
        </button>
    );
}

function CheckboxRow({ label, checked, onChange }: {
    label: string; checked: boolean; onChange: () => void;
}) {
    return (
        <label className="flex items-center gap-3 cursor-pointer group">
            <div
                onClick={onChange}
                className={`relative w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors duration-150
                    ${checked
                        ? 'bg-[#005c55] border-[#005c55]'
                        : 'border-[#bdc9c6] bg-white group-hover:border-[#005c55]'
                    }`}
            >
                {checked && <Check style={{ width: 14, height: 14, color: 'white' }} />}
            </div>
            <span className="text-base text-[#3e4947]">{label}</span>
        </label>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FilterModal({
    isOpen, onClose, onApply, categoryId, initialFilters
}: FilterModalProps) {

    const [filters, setFilters] = useState<FilterState>(initialFilters);
    const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentOption[]>([]);
    const [routeTypes, setRouteTypes] = useState<RouteTypeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const sheetRef = useRef<HTMLDivElement>(null);

    // Sincronizar filtros cuando cambia el padre
    useEffect(() => {
        setFilters(initialFilters);
    }, [initialFilters]);

    // Cargar opciones dinámicas desde BD
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            const supabase = createClient();

            const [{ data: subs }, { data: payments }, { data: routes }] = await Promise.all([
                supabase
                    .from('subcategories')
                    .select('id, name_es')
                    .eq('category_id', categoryId)
                    .order('name_es'),
                supabase
                    .from('payment_methods')
                    .select('id, name_es')
                    .order('name_es'),
                supabase
                    .from('route_types')
                    .select('id, name_es')
                    .order('name_es'),
            ]);

            if (!cancelled) {
                setSubcategories(subs ?? []);
                setPaymentMethods(payments ?? []);
                setRouteTypes(routes ?? []);
                setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [isOpen, categoryId]);

    // Bloquear scroll del body cuando el modal está abierto
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    // ── Handlers ───────────────────────────────────────────────────────────────

    function toggleDistance(val: string) {
        const key = val === 'Cualquiera' ? 'any' : val;
        setFilters(f => ({ ...f, distance: f.distance === key ? 'any' : key }));
    }

    function toggleArray(key: 'subcategoryIds' | 'paymentMethodIds' | 'routeTypeIds', id: string) {
        setFilters(f => ({
            ...f,
            [key]: f[key].includes(id)
                ? f[key].filter(x => x !== id)
                : [...f[key], id],
        }));
    }

    const activeCount = countActiveFilters(filters);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-[#111c2d]/40 backdrop-blur-sm z-[55]"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                className="fixed bottom-0 left-0 w-full bg-white rounded-t-3xl z-[60]
                           flex flex-col max-h-[90dvh] z-[60]
                           shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
            >
                {/* Grabber */}
                <div className="flex justify-center pt-4 pb-2">
                    <div className="w-12 h-1.5 bg-[#bdc9c6]/60 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pb-3 pt-1 flex justify-between items-center">
                    <h2 className="text-[28px] font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                        Filtros
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e7eeff] transition-colors"
                        aria-label="Cerrar"
                    >
                        <X style={{ width: 22, height: 22, color: '#3e4947' }} />
                    </button>
                </div>

                {/* Contenido scrollable */}
                <div className="flex-1 overflow-y-auto px-5 pb-36 flex flex-col gap-8"
                    style={{ scrollbarWidth: 'none' }}>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 rounded-full border-2 border-[#005c55] border-t-transparent animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* ── Distancia ── */}
                            <section className="flex flex-col gap-3">
                                <h3 className="text-lg font-semibold text-[#111c2d]">Distancia</h3>
                                <div className="flex flex-wrap gap-2">
                                    {DISTANCES.map(d => {
                                        const key = d === 'Cualquiera' ? 'any' : d;
                                        return (
                                            <DistanceChip
                                                key={d}
                                                value={d}
                                                selected={filters.distance === key}
                                                onToggle={() => toggleDistance(d)}
                                            />
                                        );
                                    })}
                                </div>
                            </section>

                            {/* ── Subcategorías ── */}
                            {subcategories.length > 0 && (
                                <section className="flex flex-col gap-3">
                                    <h3 className="text-lg font-semibold text-[#111c2d]">Subcategorías</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {subcategories.map(s => (
                                            <SubcategoryChip
                                                key={s.id}
                                                label={s.name_es}
                                                selected={filters.subcategoryIds.includes(s.id)}
                                                onToggle={() => toggleArray('subcategoryIds', s.id)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Métodos de pago ── */}
                            <section className="flex flex-col gap-3">
                                <h3 className="text-lg font-semibold text-[#111c2d]">Métodos de pago</h3>
                                <div className="flex flex-col gap-3 mt-1">
                                    {paymentMethods.map(pm => (
                                        <CheckboxRow
                                            key={pm.id}
                                            label={pm.name_es}
                                            checked={filters.paymentMethodIds.includes(pm.id)}
                                            onChange={() => toggleArray('paymentMethodIds', pm.id)}
                                        />
                                    ))}
                                </div>
                            </section>

                            {/* ── Tipo de acceso ── */}
                            <section className="flex flex-col gap-3">
                                <h3 className="text-lg font-semibold text-[#111c2d]">Tipo de acceso</h3>
                                <div className="flex flex-col gap-3 mt-1">
                                    {routeTypes.map(rt => (
                                        <CheckboxRow
                                            key={rt.id}
                                            label={rt.name_es}
                                            checked={filters.routeTypeIds.includes(rt.id)}
                                            onChange={() => toggleArray('routeTypeIds', rt.id)}
                                        />
                                    ))}
                                </div>
                            </section>

                            {/* ── Divisor ── */}
                            <hr className="border-[#bdc9c6]/30" />

                            {/* ── Solo abiertos ahora ── */}
                            <section className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-[#111c2d]">Solo abiertos ahora</span>
                                <button
                                    role="switch"
                                    aria-checked={filters.openNow}
                                    onClick={() => setFilters(f => ({ ...f, openNow: !f.openNow }))}
                                    className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none
                                        ${filters.openNow ? 'bg-[#005c55]' : 'bg-[#d8e3fb]'}`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200
                                            ${filters.openNow ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </section>
                        </>
                    )}
                </div>

                {/* Footer sticky */}
                <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-md
                                border-t border-[#bdc9c6]/20 px-5 pt-4 pb-8
                                flex justify-between items-center">
                    <button
                        onClick={() => setFilters(EMPTY_FILTERS)}
                        className="text-sm font-semibold text-[#3e4947] px-2 py-3 hover:text-[#111c2d] transition-colors"
                    >
                        Limpiar filtros
                    </button>
                    <button
                        onClick={() => { onApply(filters); onClose(); }}
                        className="bg-[#005c55] text-white rounded-full px-8 py-3 text-sm font-semibold
                                   shadow-sm hover:bg-[#0f766e] active:scale-95 transition-all min-h-[48px]"
                    >
                        Aplicar{activeCount > 0 ? ` (${activeCount})` : ''}
                    </button>
                </div>
            </div>
        </>
    );
}