/*
 * Datos que usan los buscadores y los agentes para entender qué es OpenArg:
 * URL canónica, cifras y datos estructurados (schema.org). Las cifras salen de
 * `listar_fuentes` del MCP (29-sep-2026: 33.048 datasets de 38 portales).
 */

export const SITE_URL = 'https://openarg.org';
export const MCP_SITE_URL = 'https://mcp.openarg.org';
export const DATASETS = '33.000';
export const PORTALES = 38;

// Sólo el dominio de producción se indexa. Staging y las pruebas locales
// responden "no indexar" para no competir con openarg.org en los buscadores.
const INDEXABLE_HOSTS = new Set(['openarg.org', 'www.openarg.org']);

export function isIndexableHost(host: string | null | undefined): boolean {
    return INDEXABLE_HOSTS.has((host || '').split(':')[0].toLowerCase());
}

export const PUBLIC_PATHS = ['/', '/como-funciona', '/dashboards', '/desarrolladores', '/privacy'] as const;

const ORG_ID = 'https://colossuslab.org/#organization';

export const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': ORG_ID,
            name: 'Colossus Lab',
            url: 'https://colossuslab.org',
            email: 'devops@colossuslab.org',
            address: { '@type': 'PostalAddress', addressLocality: 'Buenos Aires', addressCountry: 'AR' },
        },
        {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: SITE_URL,
            name: 'OpenArg',
            inLanguage: 'es-AR',
            description: 'Datos públicos oficiales de Argentina, consultados con inteligencia artificial y con la fuente citada.',
            publisher: { '@id': ORG_ID },
        },
        {
            '@type': 'DataCatalog',
            '@id': `${SITE_URL}/#catalog`,
            name: 'OpenArg',
            url: SITE_URL,
            description: `Más de ${DATASETS} datasets oficiales de ${PORTALES} portales públicos de Argentina: INDEC, BCRA, ministerios, provincias, municipios y el Congreso. Se consultan en lenguaje natural, por API o desde un asistente de IA (MCP), siempre con el link a la fuente oficial.`,
            inLanguage: 'es',
            isAccessibleForFree: true,
            spatialCoverage: { '@type': 'Country', name: 'Argentina' },
            keywords: ['datos abiertos', 'Argentina', 'INDEC', 'BCRA', 'presupuesto', 'estadísticas oficiales', 'MCP', 'API'],
            publisher: { '@id': ORG_ID },
        },
        {
            '@type': 'WebAPI',
            name: 'OpenArg MCP y API pública',
            url: MCP_SITE_URL,
            documentation: `${MCP_SITE_URL}/empezar.html`,
            description: 'Servidor MCP y API para conectar Claude, Cursor, VS Code o un agente propio a los datos públicos de Argentina. Gratis con clave.',
            provider: { '@id': ORG_ID },
        },
    ],
};

const OG_IMAGE = { url: '/og-image.png', width: 1200, height: 630, alt: 'OpenArg — Datos públicos de Argentina con inteligencia artificial' };

/**
 * Metadata de una página pública: título, descripción y URL canónica. Repite
 * la imagen porque en Next el `openGraph` de una página reemplaza entero al
 * del layout.
 */
export function pageMetadata({ path, title, description }: { path: string; title: string; description: string }) {
    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: {
            title: `${title} · OpenArg`,
            description,
            url: path,
            siteName: 'OpenArg',
            locale: 'es_AR',
            type: 'website' as const,
            images: [OG_IMAGE],
        },
        twitter: { card: 'summary_large_image' as const, title: `${title} · OpenArg`, description, images: [OG_IMAGE.url] },
    };
}
