import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export async function PATCH(request: NextRequest) {
    const { session, error } = await requireSession();
    if (error) return error;

    // SECURITY (M3): Rate limit
    const userEmail = session!.user?.email || 'anonymous';
    if (checkRateLimit(userEmail, 'feedback', 10)) return rateLimitResponse();

    try {
        const body = await request.json();
        const { conversationId, messageId, feedback, comment } = body as {
            conversationId: string;
            messageId: string;
            feedback: 'up' | 'down';
            comment?: string;
        };

        if (!conversationId || !messageId || !feedback) {
            return NextResponse.json(
                { error: 'conversationId, messageId, and feedback are required' },
                { status: 400 },
            );
        }

        const userEmail = session!.user?.email || '';
        const res = await fetch(
            `${BACKEND_URL}/api/v1/conversations/${conversationId}/messages/${messageId}/feedback`,
            {
                method: 'PATCH',
                headers: backendHeaders(userEmail),
                body: JSON.stringify({ feedback, comment: comment || null }),
            },
        );

        if (!res.ok) {
            const text = await res.text();
            return NextResponse.json({ error: text }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        );
    }
}
