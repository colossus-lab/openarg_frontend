import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isAdminEmail } from '@/lib/auth';
import TopbarEditorial from '@/components/landing-ed/TopbarEditorial';
import Colophon from '@/components/landing-ed/Colophon';
import AdminMcpDashboard from '@/components/admin/AdminMcpDashboard';
import AdminSupporters from '@/components/admin/AdminSupporters';

export const metadata: Metadata = {
    title: 'Uso del MCP · Admin · OpenArg',
    robots: { index: false, follow: false },
};

// Nunca se cachea: los números cambian y la página depende de la sesión.
export const dynamic = 'force-dynamic';

/*
 * Tablero de uso del MCP público y de la API. Sólo para los mails de
 * ADMIN_EMAILS; a cualquier otro le responde 404, así la página no se delata.
 * Los datos vienen de /api/admin/mcp/*, que vuelve a validar el admin.
 */
export default async function AdminMcpPage() {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
        notFound();
    }

    return (
        <main className="ed-page">
            <TopbarEditorial />
            <section className="ed-cf-hero">
                <div className="ed-container">
                    <p className="ed-eyebrow">
                        <span className="ed-eyebrow-num">Admin</span> MCP y API pública
                    </p>
                    <h1 className="ed-display" style={{ marginTop: '1rem', fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
                        Uso del MCP
                    </h1>
                    <p className="ed-lead" style={{ marginTop: '1.25rem' }}>
                        Todo el tráfico de mcp.openarg.org y de la API con clave, sin importar en qué directorio
                        lo encontró cada persona. Días en UTC. Los cupos por persona son mensuales (se renuevan el 1°
                        de cada mes); el cupo público de preguntas es diario.
                    </p>
                </div>
            </section>
            <section className="ed-section">
                <div className="ed-container">
                    <AdminMcpDashboard />
                    <AdminSupporters />
                </div>
            </section>
            <Colophon />
        </main>
    );
}
