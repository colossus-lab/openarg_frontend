import { NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export async function GET() {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/developers/usage`, {
            headers: backendHeaders(email),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ requests_today: 0, total_requests: 0 }, { status: 500 });
    }
}
