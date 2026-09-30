import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

// La página es de cliente y no puede exportar metadata: la pone este layout.
export const metadata: Metadata = pageMetadata({
    path: '/como-funciona',
    title: 'Cómo funciona',
    description:
        'Cómo OpenArg responde preguntas sobre datos públicos de Argentina: planifica, busca en 38 portales oficiales, cruza los datos y cita cada fuente.',
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
