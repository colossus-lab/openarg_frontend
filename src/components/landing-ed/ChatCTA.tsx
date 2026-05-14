'use client';

import Link from 'next/link';
import FadeIn from '@/components/reactbits/FadeIn';

const EXAMPLE_QUESTIONS = [
  'Compras públicas con sobreprecio detectado',
  'Mortalidad infantil cruzada con cobertura de salud',
  'Subsidios al transporte por jurisdicción',
  'Presupuesto destinado a educación por provincia',
];

export default function ChatCTA() {
  return (
    <section className="ed-section ed-chatcta-section">
      <div className="ed-container">
        <FadeIn direction="up" distance={10} duration={0.6}>
          <article className="ed-chatcta-card">
            <div className="ed-chatcta-mark" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
                <path
                  d="M10 16h44v28H32l-12 10v-10H10z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="22" cy="30" r="2.5" fill="currentColor" />
                <circle cx="32" cy="30" r="2.5" fill="currentColor" />
                <circle cx="42" cy="30" r="2.5" fill="currentColor" />
              </svg>
            </div>

            <div className="ed-chatcta-body">
              <p className="ed-eyebrow">
                <span className="ed-eyebrow-num">VI.</span>
                <span>Empezá tu análisis</span>
              </p>

              <h2 className="ed-chatcta-title">
                Hacé tu propia pregunta a los <em>datos del Estado.</em>
              </h2>

              <p className="ed-chatcta-lead">
                Cuatro agentes de IA cruzan 32 portales oficiales para
                responderte en segundos. Sin formularios, sin SQL, sin sesgo
                editorial — sólo datos públicos y citas verificables.
              </p>

              <div className="ed-chatcta-examples">
                <span className="ed-meta">Ejemplos para empezar</span>
                <ul>
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <li key={q}>
                      <Link
                        href={`/chat?q=${encodeURIComponent(q)}`}
                        className="ed-chatcta-example"
                      >
                        <span aria-hidden="true">»</span> {q}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="ed-chatcta-actions">
                <Link href="/chat" className="ed-chatcta-cta">
                  Iniciar chat <span aria-hidden="true">→</span>
                </Link>
                <Link href="/dashboards" className="ed-textlink">
                  <span className="ed-textlink-arrow">→</span>
                  <span>O explorá los dashboards</span>
                </Link>
              </div>
            </div>
          </article>
        </FadeIn>
      </div>
    </section>
  );
}
