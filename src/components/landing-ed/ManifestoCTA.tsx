'use client';

import Link from 'next/link';
import FadeIn from '@/components/reactbits/FadeIn';

export default function ManifestoCTA() {
  return (
    <section className="ed-section ed-manifesto">
      <div className="ed-container">
        <FadeIn direction="up" distance={10} duration={0.6}>
          <p className="ed-eyebrow" style={{ marginBottom: '2rem' }}>
            <span className="ed-eyebrow-num">VI.</span>
            <span>Manifiesto</span>
          </p>
        </FadeIn>

        <FadeIn direction="up" distance={12} delay={0.1} duration={0.6}>
          <h2>
            <span className="ed-manifesto-line">Los datos son públicos.</span>
            <span className="ed-manifesto-line">Las preguntas también deberían serlo.</span>
          </h2>
        </FadeIn>

        <FadeIn direction="up" distance={8} delay={0.25} duration={0.5}>
          <p className="ed-manifesto-sig">
            Colossus Lab — Inteligencia sobre el Estado argentino, MMXXVI.
          </p>
        </FadeIn>

        <FadeIn direction="up" distance={8} delay={0.4} duration={0.5}>
          <div className="ed-manifesto-actions">
            <Link href="/chat" className="ed-textlink">
              <span className="ed-textlink-arrow">→</span>
              <span>Empezar</span>
            </Link>
            <Link href="/dashboards" className="ed-textlink">
              <span className="ed-textlink-arrow">→</span>
              <span>Ver dashboards</span>
            </Link>
            <Link href="/como-funciona" className="ed-textlink">
              <span className="ed-textlink-arrow">→</span>
              <span>Cómo funciona</span>
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
