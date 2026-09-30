import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

// La página es de cliente y no puede exportar metadata: la pone este layout.
export const metadata: Metadata = pageMetadata({
    path: '/desarrolladores',
    title: 'Clave gratis para el MCP y la API',
    description:
        'Sacá tu clave gratis de OpenArg y conectá Claude, Cursor, VS Code o tu agente a más de 33.000 datasets oficiales de Argentina. 200 consultas de datos y 10 preguntas por mes.',
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
