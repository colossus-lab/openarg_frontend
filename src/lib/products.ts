/**
 * Colossus Lab — Registry of public-data dashboards surfaced from OpenArg.
 *
 * Each entry below is a self-contained product deployed independently
 * (its own Vercel deploy or static host). OpenArg only lists and links
 * to them from /dashboards. URLs marked `https://[REPLACE-...]` are
 * placeholders to fill in once the real deploys land.
 */

export type ProductStatus = 'live' | 'beta' | 'coming-soon';

export type ProductCategory =
  | 'municipal'
  | 'provincial'
  | 'nacional'
  | 'sectorial'
  | 'demografico'
  | 'gobierno-abierto';

export type ProductRegion =
  | 'CABA'
  | 'PBA'
  | 'Mendoza'
  | 'Santa Fe'
  | 'Argentina';

export interface Product {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  region: ProductRegion;
  tags: string[];
  url: string;
  thumbnail: string;
  status: ProductStatus;
  highlights?: string[];
  stack?: string[];
  /** Featured products are shown in the landing-page ecosystem preview. */
  featured?: boolean;
}

export const products: Product[] = [
  {
    slug: 'caba',
    title: 'Dashboard CABA',
    tagline: 'Población, seguridad y educación de Ciudad de Buenos Aires',
    description:
      'Análisis interactivo de los datos abiertos de CABA: demografía, seguridad y red educativa con visualizaciones cruzadas por comuna.',
    category: 'municipal',
    region: 'CABA',
    tags: ['CABA', 'seguridad', 'demografía', 'educación'],
    url: 'https://caba.openarg.org',
    thumbnail: '/productos/caba.svg',
    status: 'live',
    highlights: ['Datos abiertos GCBA', 'Análisis por comuna'],
    stack: ['React', 'Vite', 'TypeScript'],
  },
  {
    slug: 'crecimiento-demografico',
    title: 'Crecimiento Demográfico',
    tagline: 'La crisis demográfica argentina al 2100',
    description:
      'Colapso de fecundidad, envejecimiento y proyecciones poblacionales hasta el año 2100 con datos de INDEC y CELADE.',
    category: 'demografico',
    region: 'Argentina',
    tags: ['INDEC', 'proyecciones', 'fecundidad', 'envejecimiento'],
    url: 'https://dashboard-crecimiento-demografico.vercel.app/',
    thumbnail: '/productos/crecimiento-demografico.svg',
    status: 'live',
    highlights: ['Proyecciones hasta 2100', 'Fecundidad y aging'],
    stack: ['HTML', 'Tailwind', 'Chart.js'],
    featured: true,
  },
  {
    slug: 'educacion-caba',
    title: 'Educación CABA',
    tagline: '2.767 escuelas porteñas, matrícula y ESI',
    description:
      'Infraestructura educativa de Ciudad de Buenos Aires: matrícula, ESI, comparativas por barrio y mapa interactivo de establecimientos.',
    category: 'sectorial',
    region: 'CABA',
    tags: ['educación', 'CABA', 'ESI', 'mapas'],
    url: 'https://educacioncaba.openarg.org',
    thumbnail: '/productos/educacion-caba.svg',
    status: 'live',
    highlights: ['2.767 escuelas', 'ESI por nivel', 'Leaflet maps'],
    stack: ['React', 'Vite', 'Python ETL'],
  },
  {
    slug: 'lujan-de-cuyo',
    title: 'Luján de Cuyo',
    tagline: '83 datasets municipales con 14 reportes ejecutivos',
    description:
      'Análisis de los datos abiertos del municipio mendocino de Luján de Cuyo: 14 reportes ejecutivos por categoría y catálogo buscable.',
    category: 'municipal',
    region: 'Mendoza',
    tags: ['Mendoza', 'municipal', 'datos abiertos'],
    url: 'https://lujandecuyo.openarg.org',
    thumbnail: '/productos/lujan-de-cuyo.svg',
    status: 'live',
    highlights: ['83 datasets', '14 reportes'],
    stack: ['React', 'Vite', 'Nivo'],
  },
  {
    slug: 'mendoza-ciudad',
    title: 'Mendoza Ciudad',
    tagline: 'Censo y datos abiertos de la capital mendocina',
    description:
      'Análisis censal de la Ciudad de Mendoza: 9 reportes sobre población, hábitat, salud, educación, economía y fecundidad.',
    category: 'municipal',
    region: 'Mendoza',
    tags: ['Mendoza', 'censo 2022', 'municipal'],
    url: 'https://[REPLACE-WITH-DEPLOY-URL]-mendoza-ciudad.vercel.app',
    thumbnail: '/productos/mendoza-ciudad.svg',
    status: 'coming-soon',
    highlights: ['9 reportes', 'Censo 2022'],
    stack: ['React', 'Vite', 'Recharts'],
  },
  {
    slug: 'mendoza',
    title: 'Provincia de Mendoza',
    tagline: 'Ecosistema completo de datos provinciales',
    description:
      'Plataforma integral de Mendoza: 16 reportes ejecutivos (población, educación, salud, seguridad, economía, agro, industria), mapas 3D y chat IA.',
    category: 'provincial',
    region: 'Mendoza',
    tags: ['Mendoza', 'provincial', 'mapas 3D', 'IA chat'],
    url: 'https://mendoza.openarg.org/',
    thumbnail: '/productos/mendoza.svg',
    status: 'live',
    highlights: ['16 reportes', 'Mapas 3D', 'Chat IA integrado'],
    stack: ['React', 'Vite', 'maplibre-gl'],
    featured: true,
  },
  {
    slug: 'mineria',
    title: 'Minería, Glaciares y Litio',
    tagline: 'Análisis geoespacial del extractivismo argentino',
    description:
      'Datos abiertos sobre minería, glaciares y litio en Argentina con análisis geoespacial y chatbot IA (Gemini 2.5).',
    category: 'sectorial',
    region: 'Argentina',
    tags: ['minería', 'litio', 'glaciares', 'geoespacial', 'IA chat'],
    url: 'https://leydeglaciares.tech',
    thumbnail: '/productos/mineria.svg',
    status: 'live',
    highlights: ['GeoJSON 6 MB', 'Chatbot Gemini 2.5'],
    stack: ['HTML', 'Leaflet', 'Chart.js'],
    featured: true,
  },
  {
    slug: 'pba',
    title: 'Provincia de Buenos Aires',
    tagline: 'Plataforma de inteligencia para PBA',
    description:
      '16 reportes ejecutivos sobre la Provincia de Buenos Aires, mapas 3D del conurbano, explorador de datos y chatbot IA con rate limiting.',
    category: 'provincial',
    region: 'PBA',
    tags: ['PBA', 'provincial', 'conurbano', 'IA chat'],
    url: 'https://pba.openarg.org',
    thumbnail: '/productos/pba.svg',
    status: 'live',
    highlights: ['16 reportes', 'Mapas 3D conurbano', 'IA chat enterprise'],
    stack: ['React', 'Vite', '@ai-sdk/react', 'Upstash'],
    featured: true,
  },
  {
    slug: 'datos-abiertos',
    title: 'Estado de Datos Abiertos',
    tagline: 'Modernización del Estado y gobierno abierto en Argentina',
    description:
      'Ranking de transparencia municipal, marco de gobernanza IA y 8 análisis estratégicos sobre modernización del Estado argentino.',
    category: 'gobierno-abierto',
    region: 'Argentina',
    tags: ['gobierno abierto', 'transparencia', 'modernización', 'IA gobernanza'],
    url: 'https://dashboard.openarg.org/',
    thumbnail: '/productos/datos-abiertos.svg',
    status: 'live',
    highlights: ['Ranking municipal', '8 análisis estratégicos'],
    stack: ['HTML', 'Tailwind', 'Chart.js'],
  },
  {
    slug: 'venado-tuerto',
    title: 'Venado Tuerto',
    tagline: '27 datasets y 8 análisis ejecutivos de Santa Fe',
    description:
      'Datos abiertos del municipio santafesino de Venado Tuerto: 8 análisis ejecutivos sobre gobierno, economía, educación, salud, seguridad e infraestructura.',
    category: 'municipal',
    region: 'Santa Fe',
    tags: ['Santa Fe', 'municipal', 'CKAN'],
    url: 'https://venadotuerto.openarg.org',
    thumbnail: '/productos/venado-tuerto.svg',
    status: 'live',
    highlights: ['27 datasets', '8 análisis'],
    stack: ['React', 'Vite', 'Nivo', 'Recharts'],
  },
  {
    slug: 'seguridad',
    title: 'Mapa de Inseguridad · Argentina',
    tagline: 'Estadísticas criminales SNIC 2000-2024 por departamento',
    description:
      'Observatorio interactivo del Sistema Nacional de Información Criminal (SNIC). 24 provincias + CABA, 555 departamentos, 33 categorías delictivas y 25 años de serie temporal continua.',
    category: 'sectorial',
    region: 'Argentina',
    tags: ['seguridad', 'SNIC', 'criminalidad', 'mapas'],
    url: 'https://seguridad.openarg.org',
    thumbnail: '/productos/seguridad.svg',
    status: 'live',
    highlights: ['SNIC 2000-2024', '555 departamentos', '33 categorías delictivas'],
    stack: ['Next.js', 'TypeScript', 'MapLibre'],
  },
  {
    slug: 'moron',
    title: 'Dashboard Morón',
    tagline: 'Censo 2022 + SNIC: el municipio comparado vs los 24 partidos del GBA',
    description:
      'Datos abiertos del Municipio de Morón (PBA). 10 informes sobre el Censo Nacional 2022 (INDEC) y estadísticas de seguridad (SNIC, SAT), comparados contra los 24 partidos del Gran Buenos Aires.',
    category: 'municipal',
    region: 'PBA',
    tags: ['PBA', 'municipal', 'Censo 2022', 'SNIC'],
    url: 'https://moron.openarg.org',
    thumbnail: '/productos/moron.svg',
    status: 'live',
    highlights: ['10 informes', 'Censo 2022', 'vs 24 partidos GBA'],
    stack: ['Next.js', 'TypeScript'],
  },
  {
    slug: 'mapa-educacion-gba',
    title: 'Mapa Educación GBA',
    tagline: '10.900 radios censales × 8.800 colegios del Conurbano Bonaerense',
    description:
      'Cruza el Censo 2022 a nivel radio censal con el padrón oficial de establecimientos educativos en los 24 partidos del Conurbano Bonaerense. Identifica qué escuelas están en zonas con peor contexto socioeconómico, con visualizaciones 2D y hexgrid 3D.',
    category: 'sectorial',
    region: 'PBA',
    tags: ['PBA', 'educación', 'Censo 2022', 'mapas 3D'],
    url: 'https://mapa-educacion-gba.vercel.app',
    thumbnail: '/productos/mapa-educacion-gba.svg',
    status: 'live',
    highlights: ['10.923 radios', '8.843 colegios', 'Hexgrid 3D'],
    stack: ['Next.js 16', 'MapLibre', 'Zustand'],
  },
  {
    slug: 'seguridad-conurbano',
    title: 'Mapa de Inseguridad · Conurbano',
    tagline: 'SNIC en los 24 partidos del Gran Buenos Aires, 2000-presente',
    description:
      'Dashboard interactivo que visualiza las estadísticas criminales del SNIC para los 24 partidos del Gran Buenos Aires, entre 2000 y el último año publicado. Mapa coroplético + serie temporal por partido.',
    category: 'sectorial',
    region: 'PBA',
    tags: ['PBA', 'seguridad', 'SNIC', 'conurbano'],
    url: 'https://mapa-inseguridad-conurbano-bonaeren.vercel.app',
    thumbnail: '/productos/seguridad-conurbano.svg',
    status: 'live',
    highlights: ['24 partidos GBA', 'Microdatos SNIC', '2000-presente'],
    stack: ['Next.js 16', 'MapLibre', 'TypeScript'],
  },
  {
    slug: 'monitor-hcdn',
    title: 'Monitor HCDN',
    tagline: 'Actividad legislativa de la Cámara de Diputados — períodos 2025-2026',
    description:
      'Plataforma de visualización de la actividad legislativa de la Honorable Cámara de Diputados de la Nación. KPIs de productividad, labor de comisiones, desempeño de bloques políticos, autorías de proyectos y motor de búsqueda de expedientes.',
    category: 'gobierno-abierto',
    region: 'Argentina',
    tags: ['HCDN', 'legislativo', 'Diputados', 'gobierno abierto'],
    url: 'https://monitor-hcdn.vercel.app',
    thumbnail: '/productos/monitor-hcdn.svg',
    status: 'live',
    highlights: ['Períodos 2025-2026', 'KPIs en tiempo real', 'Búsqueda de expedientes'],
    stack: ['Python', 'HTML/JS', 'Pipeline ETL'],
  },
];

export const productsBySlug: Record<string, Product> = Object.fromEntries(
  products.map((p) => [p.slug, p])
);

export const allCategories: ProductCategory[] = [
  'municipal',
  'provincial',
  'nacional',
  'sectorial',
  'demografico',
  'gobierno-abierto',
];

export const featuredProducts: Product[] = products.filter((p) => p.featured);

export const allRegions: ProductRegion[] = [
  'CABA',
  'PBA',
  'Mendoza',
  'Santa Fe',
  'Argentina',
];
