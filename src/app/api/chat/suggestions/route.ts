import { NextResponse } from 'next/server';

import { parseConfiguredSuggestions } from '@/lib/chat/suggestions';

export async function GET() {
    const suggestions = parseConfiguredSuggestions(process.env.OPENARG_CHAT_SUGGESTIONS_JSON);
    return NextResponse.json({ suggestions });
}

