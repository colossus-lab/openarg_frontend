import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

// La página es de cliente y no puede exportar metadata: la pone este layout.
export const metadata: Metadata = pageMetadata({
    path: '/dashboards',
    title: 'Dashboards de datos públicos',
    description:
        'Tableros temáticos de OpenArg con datos públicos de Argentina: municipios, provincias, Nación, gobierno abierto y más.',
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
