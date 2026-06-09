// src/app/[locale]/(public)/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import BottomNav from '@/components/layout/BottomNav';

// ── Categorías disponibles para descarga offline ──────────────
// Transportes y Eventos excluidos por diseño
const OFFLINE_CATEGORIES = [
    { id: '0159c333-7999-43fe-9e59-1e7cafb56c94', key: 'gastronomia', name_es: 'Gastronomía',        icon: '🍴', color: '#F97316' },
    { id: '5faf0aea-a8b8-47df-a3f9-bd4a70f5acaf', key: 'hospedaje',   name_es: 'Hospedaje',          icon: '🏨', color: '#3B82F6' },
    { id: '23066023-d2e8-49ef-ac38-fb1488609ba2', key: 'naturaleza',  name_es: 'Naturaleza',          icon: '🌳', color: '#059669' },
    { id: '9a766653-f814-49ed-9eaa-c3fafad968bd', key: 'servicios',   name_es: 'Servicios',           icon: '🔧', color: '#64748B' },
    { id: 'dff06427-5737-4aeb-b15e-95f20ef3965e', key: 'actividades', name_es: 'Tours y Actividades', icon: '🧭', color: '#10B981' },
] as const;

const OFFLINE_KEY      = 'osago_offline_data';
const OFFLINE_META_KEY = 'osago_offline_meta';

type SyncState = 'idle' | 'syncing' | 'done' | 'already';

// ── Vista: Login ──────────────────────────────────────────────
function LoginView({ locale }: { locale: string }) {
    const t = useTranslations('auth');
    const [email,   setEmail]   = useState('');
    const [sent,    setSent]    = useState(false);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState<string | null>(null);

    const handleMagicLink = async () => {
        if (!email) return;
        setLoading(true); setError(null);
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/${locale}/auth/callback`,
            },
        });
        if (error) setError(error.message);
        else setSent(true);
        setLoading(false);
    };

    const handleGoogle = async () => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/${locale}/auth/callback`,
            },
        });
    };

    if (sent) {
        return (
            <div className="flex flex-col items-center text-center gap-4 py-8 px-6">
                <div className="w-16 h-16 rounded-full bg-[#e7f5f2] flex items-center justify-center text-3xl">✉️</div>
                <h2 className="text-2xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                    {t('checkEmail')}
                </h2>
                <p className="text-[#3e4947] text-base leading-relaxed">
                    {t('checkEmailDesc').replace('{email}', email)}
                </p>
                <button onClick={() => setSent(false)}
                    className="text-[#005c55] text-sm font-semibold underline mt-2">
                    {t('backToLogin')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Header */}
            <div className="text-center flex flex-col gap-2">
                <h1 className="text-[40px] font-bold text-[#005c55] font-['Plus_Jakarta_Sans'] tracking-tight">
                    {t('title')}
                </h1>
                <p className="text-base text-[#3e4947]">{t('subtitle')}</p>
            </div>

            {/* Email input */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#111c2d] uppercase tracking-wide">
                    {t('emailLabel')}
                </label>
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none"
                         width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
                        placeholder={t('emailPlaceholder')}
                        className="w-full pl-10 pr-4 h-12 bg-white border border-[#bdc9c6] rounded-xl
                                   text-base text-[#111c2d] placeholder:text-[#6e7977]
                                   focus:outline-none focus:ring-2 focus:ring-[#005c55] focus:border-transparent
                                   transition-shadow"
                    />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            {/* Magic link button */}
            <button
                onClick={handleMagicLink} disabled={loading || !email}
                className="w-full h-12 bg-[#005c55] text-white font-semibold rounded-xl
                           flex items-center justify-center gap-2
                           hover:bg-[#0f766e] active:scale-[0.98] transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed">
                <span>{loading ? t('sending') : t('sendMagicLink')}</span>
                {!loading && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                    </svg>
                )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
                <div className="h-px bg-[#bdc9c6] flex-1" />
                <span className="text-xs font-semibold text-[#6e7977]">{t('orContinueWith')}</span>
                <div className="h-px bg-[#bdc9c6] flex-1" />
            </div>

            {/* Google button */}
            <button
                onClick={handleGoogle}
                className="w-full h-12 border-[1.5px] border-[#005c55] text-[#005c55] bg-white
                           font-semibold rounded-xl flex items-center justify-center gap-3
                           hover:bg-[#f0fdf4] active:scale-[0.98] transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>{t('continueGoogle')}</span>
            </button>

            {/* Footer */}
            <p className="text-center text-xs text-[#6e7977] mt-2">
                {t('termsPrefix')}{' '}
                <a href="#" className="text-[#005c55] hover:underline">{t('termsLink')}</a>
            </p>
        </div>
    );
}

// ── Vista: Perfil ─────────────────────────────────────────────
function ProfileView({ user }: { user: User }) {
    const t        = useTranslations('profile');
    const tAuth    = useTranslations('auth');
    const supabase = createClient();

    const [selected,   setSelected]   = useState<string[]>([]);
    const [sizeKb,     setSizeKb]     = useState<number | null>(null);
    const [syncState,  setSyncState]  = useState<SyncState>('idle');
    const [syncModal,  setSyncModal]  = useState(false);
    const [lastSynced, setLastSynced] = useState<string | null>(null);

    useEffect(() => {
        try {
            const meta = localStorage.getItem(OFFLINE_META_KEY);
            if (meta) {
                const { syncedAt } = JSON.parse(meta);
                setLastSynced(syncedAt);
            }
        } catch {}
    }, []);

    useEffect(() => {
        if (selected.length === 0) { setSizeKb(null); return; }
        const estimated = selected.length * 8 * 2.5;
        setSizeKb(Math.round(estimated));
    }, [selected]);

    const toggleCategory = (id: string) =>
        setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    const handleSync = async () => {
        if (selected.length === 0) return;
        setSyncState('syncing');

        try {
            const meta = localStorage.getItem(OFFLINE_META_KEY);
            if (meta) {
                const { categories: cached } = JSON.parse(meta);
                const same = JSON.stringify([...selected].sort()) === JSON.stringify([...cached].sort());
                if (same) {
                    setSyncState('already');
                    setSyncModal(true);
                    return;
                }
            }
        } catch {}

        try {
            const { data: businesses } = await supabase
                .from('businesses')
                .select(`
                    id, name, slug, description_es, latitude, longitude,
                    phone, whatsapp, plan,
                    categories!business_categories ( id, name_es, icon, color_hex ),
                    business_hours ( day_of_week, opens_at, closes_at, is_closed ),
                    route_types!business_route_types ( name_es, warning_es )
                `)
                .eq('is_active', true)
                .in('business_categories.category_id', selected);

            const payload = { categories: selected, businesses: businesses ?? [], version: 1 };
            const json    = JSON.stringify(payload);
            const realKb  = Math.round(json.length / 1024);

            localStorage.setItem(OFFLINE_KEY, json);
            localStorage.setItem(OFFLINE_META_KEY, JSON.stringify({
                categories: selected,
                syncedAt:   new Date().toISOString(),
                sizeKb:     realKb,
            }));

            setSizeKb(realKb);
            setLastSynced(new Date().toISOString());
            setSyncState('done');
            setSyncModal(true);
        } catch {
            setSyncState('idle');
        }
    };

    const formatSyncDate = (iso: string) =>
        new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    const signOut = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Usuario */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#e7f5f2] flex items-center justify-center
                                    text-xl font-bold text-[#005c55]">
                        {user.email?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6e7977]">{t('loggedAs')}</p>
                        <p className="text-sm font-semibold text-[#111c2d] truncate max-w-[200px]">{user.email}</p>
                    </div>
                </div>
                <button onClick={signOut}
                    className="text-xs font-semibold text-[#EF4444] hover:underline whitespace-nowrap">
                    {tAuth('signOut')}
                </button>
            </div>

            {/* Sección offline */}
            <div className="flex flex-col gap-4">
                <div className="bg-[#f0fdf4] rounded-2xl border border-[#bbf7d0] p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        <h2 className="text-base font-bold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                            {t('offlineTitle')}
                        </h2>
                    </div>
                    <p className="text-sm text-[#3e4947] leading-relaxed">{t('offlineDesc')}</p>
                </div>

                {/* Selector de categorías */}
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-[#111c2d] uppercase tracking-wide">
                        {t('downloadCategories')}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {OFFLINE_CATEGORIES.map(cat => {
                            const active = selected.includes(cat.id);
                            return (
                                <button key={cat.id} onClick={() => toggleCategory(cat.id)}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left
                                        ${active
                                            ? 'border-[#005c55] bg-[#f0fdf4]'
                                            : 'border-[#E2E8F0] bg-white hover:border-[#bdc9c6]'}`}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                                         style={{ backgroundColor: cat.color + '20' }}>
                                        {cat.icon}
                                    </div>
                                    <span className="text-sm font-semibold text-[#111c2d] flex-1">{cat.name_es}</span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                        ${active ? 'border-[#005c55] bg-[#005c55]' : 'border-[#bdc9c6]'}`}>
                                        {active && (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                                                 stroke="white" strokeWidth="3" strokeLinecap="round">
                                                <polyline points="20 6 9 17 4 12"/>
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Card de sincronización */}
                {selected.length > 0 && (
                    <div className="bg-[#111c2d] rounded-2xl p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <rect width="20" height="14" x="2" y="3" rx="2"/>
                                    <line x1="8" y1="21" x2="16" y2="21"/>
                                    <line x1="12" y1="17" x2="12" y2="21"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">{t('syncCard_title')}</p>
                                <p className="text-xs text-white/60">
                                    {t('syncCard_size')}: {sizeKb ? `~${sizeKb} KB` : '—'}
                                </p>
                                {lastSynced && (
                                    <p className="text-xs text-white/40 mt-0.5">
                                        {t('syncCard_synced')}: {formatSyncDate(lastSynced)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={syncState === 'syncing'}
                            className="bg-[#005c55] text-white text-sm font-bold px-5 py-2.5 rounded-xl
                                       hover:bg-[#0f766e] active:scale-95 transition-all
                                       disabled:opacity-60 disabled:cursor-not-allowed shrink-0">
                            {syncState === 'syncing' ? t('syncing') : t('syncBtn')}
                        </button>
                    </div>
                )}
            </div>

            {/* Modal resultado de sync */}
            {syncModal && (
                <>
                    <div className="fixed inset-0 bg-[#111c2d]/50 backdrop-blur-sm z-[60]" />
                    <div className="fixed inset-x-5 bottom-1/3 z-[70] bg-white rounded-3xl p-6
                                    flex flex-col items-center gap-4 shadow-2xl max-w-sm mx-auto">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                             style={{ backgroundColor: syncState === 'done' ? '#D1FAE5' : '#FEF3C7' }}>
                            {syncState === 'done' ? '✅' : '📦'}
                        </div>
                        <h3 className="text-xl font-bold text-[#111c2d] font-['Plus_Jakarta_Sans'] text-center">
                            {syncState === 'done' ? t('syncSuccess') : t('alreadySynced')}
                        </h3>
                        <p className="text-sm text-[#3e4947] text-center">
                            {syncState === 'done' ? t('syncSuccessDesc') : t('alreadySyncedDesc')}
                        </p>
                        <button
                            onClick={() => { setSyncModal(false); setSyncState('idle'); }}
                            className="w-full bg-[#005c55] text-white py-3 rounded-xl font-semibold
                                       hover:bg-[#0f766e] active:scale-95 transition-all">
                            {t('close')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────
export default function ProfilePage() {
    const locale = useLocale();
    const [user,    setUser]    = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
            setLoading(false);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => listener.subscription.unsubscribe();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#005c55] border-t-transparent animate-spin" />
        </div>
    );

    return (
        <>
            <main className="min-h-screen bg-[#f9f9ff] pb-24">
                <div className="max-w-md mx-auto px-5 py-10">
                    {user ? (
                        <ProfileView user={user} />
                    ) : (
                        <LoginView locale={locale} />
                    )}
                </div>
            </main>
            <BottomNav />
        </>
    );
}
