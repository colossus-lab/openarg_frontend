import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { SITE_URL, isIndexableHost } from '@/lib/seo';

// Se decide por el host de cada pedido: la misma build corre en staging.
export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (!isIndexableHost(host)) {
        return { rules: { userAgent: '*', disallow: '/' } };
    }
    return {
        // Buscadores y agentes de IA (GPTBot, ClaudeBot, PerplexityBot…) entran
        // por la regla general. Lo que pide sesión no aporta nada al índice.
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/api/', '/chat', '/datasets', '/login'],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
