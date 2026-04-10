import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser();

    // Protected routes
    const protectedRoutes = ['/resident', '/collector', '/admin'];
    const isProtectedRoute = protectedRoutes.some((route) =>
        request.nextUrl.pathname.startsWith(route)
    );

    if (isProtectedRoute && !user) {
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // Role-based route enforcement
    if (isProtectedRoute && user) {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const profile = profileData as { role?: string } | null;
        const userRole = profile?.role || 'resident';
        const pathname = request.nextUrl.pathname;

        // Define which roles can access which route prefixes
        const routeRoleMap: Record<string, string[]> = {
            '/admin': ['admin'],
            '/collector': ['collector', 'admin'], // admin can access collector routes
            '/resident': ['resident', 'admin'],   // admin can access resident routes
        };

        for (const [routePrefix, allowedRoles] of Object.entries(routeRoleMap)) {
            if (pathname.startsWith(routePrefix) && !allowedRoles.includes(userRole)) {
                // Redirect to the user's own dashboard
                const roleRoutes: Record<string, string> = {
                    resident: '/resident',
                    collector: '/collector',
                    admin: '/admin',
                };
                const redirectPath = roleRoutes[userRole] || '/resident';
                return NextResponse.redirect(new URL(redirectPath, request.url));
            }
        }
    }

    // Auth routes redirect if logged in
    const authRoutes = ['/auth/login', '/auth/signup'];
    const isAuthRoute = authRoutes.some((route) =>
        request.nextUrl.pathname.startsWith(route)
    );

    if (isAuthRoute && user) {
        // Get user's role and redirect accordingly
        const { data: authProfileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const authProfile = authProfileData as { role?: string } | null;
        const roleRoutes: Record<string, string> = {
            resident: '/resident',
            collector: '/collector',
            admin: '/admin',
        };

        const redirectPath = roleRoutes[authProfile?.role || 'resident'] || '/resident';
        return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    return response;
}

