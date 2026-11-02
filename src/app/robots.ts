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
        // por la regla general. /chat y /datasets no se bloquean a propósito:
        // piden sesión y redirigen a /login, y Google tiene que poder ver esa
        // redirección para sacarlas del índice. Bloqueadas, las indexaba igual
        // por links externos ("indexada aunque robots.txt la bloqueaba").
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/api/', '/login'],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
