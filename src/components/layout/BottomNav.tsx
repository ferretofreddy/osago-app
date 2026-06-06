// src/components/layout/BottomNav.tsx
// Barra de navegación inferior — mobile only
// Usa useLocale() para construir rutas dinámicas por idioma

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Map, Calendar, Star, User } from 'lucide-react';

interface NavItem {
    icon: React.ElementType;
    iconFilled?: React.ElementType;
    label: string;
    key: string; // para determinar activo sin depender del locale en la comparación
}

const NAV_ITEMS: NavItem[] = [
    { icon: Map, label: 'Explore', key: 'explore' },
    { icon: Calendar, label: 'Events', key: 'events' },
    { icon: Star, label: 'Favorites', key: 'favorites' },
    { icon: User, label: 'Profile', key: 'profile' },
];

export default function BottomNav() {
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();

    // Determina qué ítem está activo según el pathname
    // /es/explore → 'explore', /es/events → 'events', /es → nada (home = menú principal)
    function getActiveKey(): string {
        const segments = pathname.split('/').filter(Boolean); // ['es', 'explore']
        // El segundo segmento (después del locale) es la sección
        const section = segments[1] ?? '';
        return section; // '' para la home
    }

    const activeKey = getActiveKey();

    function handleNav(key: string) {
        const path = key === 'explore'
            ? `/${locale}/explore`
            : `/${locale}/${key}`;
        router.push(path);
    }

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden
                       bg-white border-t border-[#E2E8F0]
                       flex justify-around items-center
                       px-2 py-3 pb-[env(safe-area-inset-bottom,12px)]"
        >
            {NAV_ITEMS.map(({ icon: Icon, label, key }) => {
                const isActive = activeKey === key;

                return (
                    <button
                        key={key}
                        onClick={() => handleNav(key)}
                        className="flex flex-col items-center justify-center transition-all duration-150"
                        aria-label={label}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        {/* Pill activo — fondo naranja redondeado (diseño Stitch) */}
                        <span
                            className={`
                                flex flex-col items-center gap-1 px-4 py-1.5 rounded-full
                                transition-all duration-200
                                ${isActive
                                    ? 'bg-[#fea619] text-white shadow-sm'
                                    : 'text-[#6e7977] hover:text-[#005c55]'}
                            `}
                        >
                            <Icon
                                style={{ width: 22, height: 22 }}
                                fill={isActive ? 'currentColor' : 'none'}
                                strokeWidth={isActive ? 0 : 2}
                            />
                            <span className="text-[11px] font-semibold leading-none tracking-wide">
                                {label}
                            </span>
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}