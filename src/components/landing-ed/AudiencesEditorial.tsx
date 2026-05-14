'use client';

import Link from 'next/link';
import FadeIn from '@/components/reactbits/FadeIn';

const AUDIENCES = [
  {
    n: '01',
    title: 'Para periodistas.',
    body: 'Investigaciones con cruce de fuentes oficiales, con citas verificables al pie de cada afirmación.',
    q: '¿Qué ministerios incrementaron más su gasto en consultoría?',
  },
  {
    n: '02',
    title: 'Para investigadores.',
    body: 'Series temporales normalizadas entre INDEC, BCRA, ministerios y provincias para análisis cuantitativo.',
    q: 'Cruzá mortalidad infantil con cobertura de salud por provincia.',
  },
  {
    n: '03',
    title: 'Para funcionarios.',
    body: 'Benchmark inter-jurisdiccional sobre ejecución presupuestaria, transparencia y políticas activas.',
    q: 'Benchmark de transparencia municipal del último año.',
  },
  {
    n: '04',
    title: 'Para vos.',
    body: 'Ciudadanía con derecho a entender qué hace el Estado con tus impuestos, en lenguaje claro.',
    q: '¿Cuánto presupuesto va a la escuela de mi barrio?',
  },
];

export default function AudiencesEditorial() {
  return (
    <section className="ed-section" id="audiencias">
      <div className="ed-container">
        <FadeIn direction="up" distance={8} duration={0.5}>
          <div className="ed-section-head">
            <p className="ed-eyebrow">
              <span className="ed-eyebrow-num">V.</span>
              <span>Para quién</span>
            </p>
            <h2 className="ed-section-title">
              Pensado para quienes <em>hacen preguntas.</em>
            </h2>
            <p className="ed-lead">
              Cuatro perfiles, un mismo sistema. Tocá la pregunta de muestra para
              llevarla al chat.
            </p>
          </div>
        </FadeIn>

        <FadeIn direction="up" distance={10} delay={0.1} duration={0.5}>
          <div className="ed-audiences">
            {AUDIENCES.map((a) => (
              <Link
                key={a.title}
                href={`/chat?q=${encodeURIComponent(a.q)}`}
                className="ed-audience"
              >
                <span className="ed-audience-num">{a.n}</span>
                <h3 className="ed-audience-title">{a.title}</h3>
                <p className="ed-audience-body">{a.body}</p>
                <p className="ed-audience-q">{a.q}</p>
              </Link>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
