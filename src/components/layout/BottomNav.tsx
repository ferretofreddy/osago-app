// src/components/layout/BottomNav.tsx

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Compass, Calendar, Star, User } from 'lucide-react';

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { icon: Compass, label: 'Explore', path: '/es', isPrimary: true },
        { icon: Calendar, label: 'Events', path: '/es/events', isPrimary: false },
        { icon: Star, label: 'Favorites', path: '/es/favorites', isPrimary: false },
        { icon: User, label: 'Profile', path: '/es/profile', isPrimary: false },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-5 py-3"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}
        >
            <div className="flex justify-around items-center">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={`flex flex-col items-center gap-1 transition-all ${item.isPrimary && isActive
                                    ? 'bg-[#fea619] px-6 py-2 rounded-full -mt-4 shadow-lg'
                                    : ''
                                }`}
                        >
                            <Icon
                                className={`w-6 h-6 ${item.isPrimary && isActive
                                        ? 'text-white'
                                        : isActive
                                            ? 'text-[#fea619]'
                                            : 'text-[#3e4947]'
                                    }`}
                                fill={item.isPrimary && isActive ? 'none' : isActive ? 'currentColor' : 'none'}
                            />
                            <span
                                className={`text-xs font-medium ${item.isPrimary && isActive
                                        ? 'text-white'
                                        : isActive
                                            ? 'text-[#fea619]'
                                            : 'text-[#3e4947]'
                                    }`}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}