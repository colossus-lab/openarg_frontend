'use client';

import TopbarEditorial from '@/components/landing-ed/TopbarEditorial';
import HeroEditorial from '@/components/landing-ed/HeroEditorial';
import ScaleEditorial from '@/components/landing-ed/ScaleEditorial';
import TranscriptDemo from '@/components/landing-ed/TranscriptDemo';
import PipelineEditorial from '@/components/landing-ed/PipelineEditorial';
import EcosystemEditorial from '@/components/landing-ed/EcosystemEditorial';
import AudiencesEditorial from '@/components/landing-ed/AudiencesEditorial';
import ChatCTA from '@/components/landing-ed/ChatCTA';
import Colophon from '@/components/landing-ed/Colophon';

export default function HomePage() {
  return (
    <main className="ed-page">
      <TopbarEditorial />
      <HeroEditorial />
      <ScaleEditorial />
      <TranscriptDemo />
      <PipelineEditorial />
      <EcosystemEditorial />
      <AudiencesEditorial />
      <ChatCTA />
      <Colophon />
    </main>
  );
}
