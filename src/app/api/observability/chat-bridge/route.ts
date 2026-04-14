import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth';
import { getBridgeMetricsSnapshot } from '@/lib/chat/bridgeMetrics';

export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;
    return NextResponse.json(getBridgeMetricsSnapshot());
}

