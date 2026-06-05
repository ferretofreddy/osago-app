// src/app/[locale]/(public)/page.tsx

import { useTranslations } from 'next-intl';
import OsaMap from '@/components/map/OsaMap';

export default function HomePage() {
    const t = useTranslations('home');

    return (
        <main className="min-h-screen bg-[#f9f9ff]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#f9f9ff]/95 backdrop-blur-sm border-b border-[#E2E8F0]">
                <div className="px-5 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f766e] font-['Plus_Jakarta_Sans']">
                        OsaGo
                    </h1>
                    <button className="p-2 rounded-lg hover:bg-[#e7eeff] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.3-4.3"></path>
                        </svg>
                    </button>
                </div>
            </header>

            {/* Map Section */}
            <section className="px-5 py-6">
                <h2 className="text-lg font-semibold text-[#111c2d] mb-4 font-['Plus_Jakarta_Sans']">
                    {t('title')}
                </h2>
                <OsaMap />
            </section>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-5 py-3 z-50">
                <div className="flex justify-around items-center">
                    <button className="flex flex-col items-center gap-1 text-[#fea619]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                        </svg>
                        <span className="text-xs font-medium">Explorar</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-[#3e4947]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                            <line x1="16" x2="16" y1="2" y2="6"></line>
                            <line x1="8" x2="8" y1="2" y2="6"></line>
                            <line x1="3" x2="21" y1="10" y2="10"></line>
                        </svg>
                        <span className="text-xs font-medium">Eventos</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-[#3e4947]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                        </svg>
                        <span className="text-xs font-medium">Favoritos</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-[#3e4947]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span className="text-xs font-medium">Perfil</span>
                    </button>
                </div>
            </nav>
        </main>
    );
}