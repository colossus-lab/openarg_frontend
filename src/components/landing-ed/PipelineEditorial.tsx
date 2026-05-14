'use client';

import Link from 'next/link';
import FadeIn from '@/components/reactbits/FadeIn';

const STEPS = [
  {
    n: '01',
    label: 'Planificación',
    desc: 'Descompone la pregunta en sub-consultas y elige fuentes.',
    bullets: ['Detección de intención', 'Selección de portales', 'Plan de ejecución'],
  },
  {
    n: '02',
    label: 'Recolección',
    desc: 'Consulta 32 portales en paralelo y cachea los resultados.',
    bullets: ['Llamadas concurrentes', 'Cache inteligente', 'Manejo de errores'],
  },
  {
    n: '03',
    label: 'Análisis',
    desc: 'Cruza, normaliza y detecta inconsistencias entre fuentes.',
    bullets: ['Normalización', 'Cruce por entidad', 'Detección de outliers'],
  },
  {
    n: '04',
    label: 'Síntesis',
    desc: 'Compone la respuesta con gráficos y citas verificables.',
    bullets: ['Markdown estructurado', 'Charts contextuales', 'Citas con URL'],
  },
];

export default function PipelineEditorial() {
  return (
    <section className="ed-section" id="pipeline">
      <div className="ed-container">
        <FadeIn direction="up" distance={8} duration={0.5}>
          <div className="ed-section-head">
            <p className="ed-eyebrow">
              <span className="ed-eyebrow-num">III.</span>
              <span>Cómo funciona</span>
            </p>
            <h2 className="ed-section-title">
              Cuatro agentes, <em>una respuesta.</em>
            </h2>
            <p className="ed-lead">
              Cada consulta atraviesa una secuencia explícita y auditable. Vos ves
              qué está haciendo el sistema en cada paso, antes de leer la respuesta.
            </p>
          </div>
        </FadeIn>

        <FadeIn direction="up" distance={10} delay={0.1} duration={0.5}>
          <div className="ed-pipeline">
            {STEPS.map((s, i) => (
              <div key={s.n} className="ed-pipeline-step">
                <span className="ed-pipeline-arrow" aria-hidden="true">→</span>
                <span
                  className="ed-pipeline-num"
                  style={{
                    color:
                      i === 0
                        ? 'var(--ed-cobalt)'
                        : i === 1
                        ? 'var(--ed-vermilion)'
                        : i === 2
                        ? 'var(--ed-chrome)'
                        : 'var(--ed-ink)',
                  }}
                >
                  {s.n}
                </span>
                <h3 className="ed-pipeline-label">{s.label}</h3>
                <p className="ed-pipeline-desc">{s.desc}</p>
                <ul className="ed-pipeline-bullets">
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn direction="up" distance={8} delay={0.2} duration={0.5}>
          <div className="ed-pipeline-cta">
            <Link href="/como-funciona" className="ed-textlink">
              <span className="ed-textlink-arrow">→</span>
              <span>Cómo funciona, en detalle</span>
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
