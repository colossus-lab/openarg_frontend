import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

// La página es de cliente y no puede exportar metadata: la pone este layout.
export const metadata: Metadata = pageMetadata({
    path: '/privacy',
    title: 'Privacidad',
    description:
        'Qué datos personales guarda OpenArg, para qué los usa y cómo exportarlos o borrarlos (Ley 25.326).',
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
