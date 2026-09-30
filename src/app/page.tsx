import type { Metadata } from 'next';
import TopbarEditorial from '@/components/landing-ed/TopbarEditorial';
import HeroEditorial from '@/components/landing-ed/HeroEditorial';
import ScaleEditorial from '@/components/landing-ed/ScaleEditorial';
import TranscriptDemo from '@/components/landing-ed/TranscriptDemo';
import PipelineEditorial from '@/components/landing-ed/PipelineEditorial';
import EcosystemEditorial from '@/components/landing-ed/EcosystemEditorial';
import AudiencesEditorial from '@/components/landing-ed/AudiencesEditorial';
import McpEditorial from '@/components/landing-ed/McpEditorial';
import ChatCTA from '@/components/landing-ed/ChatCTA';
import Colophon from '@/components/landing-ed/Colophon';
import { homeJsonLd } from '@/lib/seo';

// Componente de servidor para poder dar la URL canónica y los datos
// estructurados; las secciones siguen siendo de cliente.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <main className="ed-page">
      <script
        type="application/ld+json"
        // Contenido fijo de `lib/seo.ts`, sin datos del usuario.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd).replace(/</g, '\\u003c') }}
      />
      <TopbarEditorial />
      <HeroEditorial />
      <ScaleEditorial />
      <TranscriptDemo />
      <PipelineEditorial />
      <EcosystemEditorial />
      <AudiencesEditorial />
      <McpEditorial />
      <ChatCTA />
      <Colophon />
    </main>
  );
}
