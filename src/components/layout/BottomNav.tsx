// src/components/layout/BottomNav.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Compass, Calendar, Heart, User } from 'lucide-react';

export default function BottomNav() {
    const router   = useRouter();
    const locale   = useLocale();
    const pathname = usePathname();

    const handleNav = (path: string) => router.push(path);

    const tabs = [
        { key: 'explore',   icon: Compass,  label: 'Explore',    path: `/${locale}/explore`    },
        { key: 'events',    icon: Calendar, label: 'Events',     path: `/${locale}/events`     },
        { key: 'favorites', icon: Heart,    label: 'Favorites',  path: `/${locale}/favorites`  },
        { key: 'profile',   icon: User,     label: 'Profile',    path: `/${locale}/profile`    },
    ] as const;

    const isActive = (path: string) => pathname.startsWith(path);

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-[#f9f9ff]/95 backdrop-blur-md
                        border-t border-[#E2E8F0] z-40 safe-area-inset-bottom">
            <div className="flex items-center justify-around max-w-2xl mx-auto h-16 px-2">
                {tabs.map(({ key, icon: Icon, label, path }) => {
                    const active = isActive(path);
                    return (
                        <button
                            key={key}
                            onClick={() => handleNav(path)}
                            className="flex flex-col items-center justify-center gap-1 flex-1 h-full
                                       transition-all duration-150 active:scale-95"
                        >
                            <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-colors
                                ${active ? 'bg-[#fea619]'  : ''}`}>
                                <Icon style={{
                                    width:  20, height: 20,
                                    color:  active ? 'white' : '#6e7977',
                                    strokeWidth: active ? 2.5 : 2,
                                }} />
                            </div>
                            <span className={`text-[10px] font-semibold tracking-wide transition-colors
                                ${active ? 'text-[#fea619]' : 'text-[#6e7977]'}`}>
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
