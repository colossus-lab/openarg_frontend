import { afterEach, describe, expect, it, vi } from 'vitest';
import { DATASETS, PORTALES, homeJsonLd, isIndexableHost, pageMetadata } from '@/lib/seo';
import sitemap from '@/app/sitemap';
import { config as middlewareConfig } from '@/middleware';

const headerMap = new Map<string, string>();
vi.mock('next/headers', () => ({
    headers: async () => ({ get: (name: string) => headerMap.get(name) ?? null }),
}));

afterEach(() => headerMap.clear());

describe('isIndexableHost', () => {
    it('sólo indexa el dominio de producción', () => {
        expect(isIndexableHost('openarg.org')).toBe(true);
        expect(isIndexableHost('www.openarg.org')).toBe(true);
        expect(isIndexableHost('OPENARG.ORG:443')).toBe(true);
        expect(isIndexableHost('staging.openarg.org')).toBe(false);
        expect(isIndexableHost('localhost:3000')).toBe(false);
        expect(isIndexableHost(null)).toBe(false);
    });
});

describe('robots', () => {
    it('en producción deja entrar y declara el sitemap', async () => {
        headerMap.set('host', 'openarg.org');
        const { default: robots } = await import('@/app/robots');
        const r = await robots();
        expect(r.sitemap).toBe('https://openarg.org/sitemap.xml');
        const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
        expect(rule.allow).toBe('/');
        expect(rule.disallow).toEqual(expect.arrayContaining(['/admin', '/api/', '/chat']));
        expect(rule.disallow).not.toContain('/desarrolladores');
    });

    it('en staging no deja indexar nada', async () => {
        headerMap.set('host', 'staging.openarg.org');
        const { default: robots } = await import('@/app/robots');
        const r = await robots();
        expect(r.rules).toEqual({ userAgent: '*', disallow: '/' });
        expect(r.sitemap).toBeUndefined();
    });

    it('detrás del proxy usa el host reenviado', async () => {
        headerMap.set('host', 'frontend:3000');
        headerMap.set('x-forwarded-host', 'openarg.org');
        const { default: robots } = await import('@/app/robots');
        expect((await robots()).sitemap).toBeDefined();
    });
});

describe('sitemap', () => {
    it('lista sólo páginas públicas, con URL absoluta de producción', () => {
        const urls = sitemap().map((e) => e.url);
        expect(urls).toContain('https://openarg.org');
        expect(urls).toContain('https://openarg.org/desarrolladores');
        expect(urls.every((u) => u.startsWith('https://openarg.org'))).toBe(true);
        expect(urls.some((u) => /\/(admin|chat|api|login|datasets)/.test(u))).toBe(false);
    });
});

describe('middleware', () => {
    it('/desarrolladores es pública, pero sus APIs siguen pidiendo sesión', () => {
        expect(middlewareConfig.matcher).not.toContain('/desarrolladores');
        expect(middlewareConfig.matcher).toContain('/api/((?!auth).*)');
        expect(middlewareConfig.matcher).toContain('/admin/:path*');
    });
});

describe('datos estructurados y metadata', () => {
    it('las cifras del catálogo coinciden con las de la web', () => {
        const catalog = homeJsonLd['@graph'].find((n) => n['@type'] === 'DataCatalog');
        expect(catalog?.description).toContain(`${DATASETS} datasets`);
        expect(catalog?.description).toContain(`${PORTALES} portales`);
    });

    it('cada página conserva la imagen de Open Graph y su URL canónica', () => {
        const m = pageMetadata({ path: '/como-funciona', title: 'Cómo funciona', description: 'x' });
        expect(m.alternates.canonical).toBe('/como-funciona');
        expect(m.openGraph.url).toBe('/como-funciona');
        expect(m.openGraph.images[0].url).toBe('/og-image.png');
    });
});
