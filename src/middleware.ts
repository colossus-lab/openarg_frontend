import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export default async function middleware(request: NextRequest) {
    // Bypass auth only when explicitly disabled AND not in production.
    // Hard-fails if DISABLE_AUTH=true is set in production (defense-in-depth).
    if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
        console.warn('[middleware] AUTH DISABLED via DISABLE_AUTH=true (dev only)');
        return NextResponse.next();
    }
    if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV === 'production') {
        console.error('[middleware] DISABLE_AUTH=true is set in PRODUCTION — refusing to bypass auth. Fix your env config.');
    }

    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // If user is not authenticated and trying to access /chat, redirect to login
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/chat', '/datasets', '/api/((?!auth).*)'],
};
