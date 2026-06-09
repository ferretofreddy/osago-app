// src/app/[locale]/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ locale: string }> }
) {
    const { locale } = await params;
    const { searchParams } = new URL(request.url);
    const code  = searchParams.get('code');
    const error = searchParams.get('error');

    const profileUrl = new URL(`/${locale}/profile`, request.url);

    if (error) {
        profileUrl.searchParams.set('error', 'auth_error');
        return NextResponse.redirect(profileUrl);
    }

    if (code) {
        const cookieStore = await cookies();

        // Route Handler: cookieStore.set() SÍ funciona aquí
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        // En Route Handler esto funciona — en Server Component fallaba
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            profileUrl.searchParams.set('error', 'exchange_error');
            return NextResponse.redirect(profileUrl);
        }
    }

    return NextResponse.redirect(profileUrl);
}
