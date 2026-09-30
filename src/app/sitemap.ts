import type { MetadataRoute } from 'next';
import { PUBLIC_PATHS, SITE_URL } from '@/lib/seo';

// Las páginas públicas de openarg.org. La web del MCP (mcp.openarg.org) tiene
// su propio sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();
    return PUBLIC_PATHS.map((path) => ({
        url: `${SITE_URL}${path === '/' ? '' : path}`,
        lastModified,
        changeFrequency: path === '/' || path === '/dashboards' ? 'weekly' : 'monthly',
        priority: path === '/' ? 1 : path === '/desarrolladores' ? 0.8 : 0.6,
    }));
}
