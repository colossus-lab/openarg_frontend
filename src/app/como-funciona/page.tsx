'use client';

import FadeIn from '@/components/reactbits/FadeIn';
import TopbarEditorial from '@/components/landing-ed/TopbarEditorial';
import Colophon from '@/components/landing-ed/Colophon';

const PIPELINE = [
  {
    key: 'planning',
    n: '01',
    label: 'Planificación',
    input: 'Pregunta en lenguaje natural del usuario.',
    output: 'Plan de ejecución: subconsultas, portales objetivo, métricas esperadas.',
    tools: 'Clasificador de intención · Catálogo de portales · Memoria de conversación.',
  },
  {
    key: 'data',
    n: '02',
    label: 'Recolección',
    input: 'Plan de ejecución del agente anterior.',
    output: 'Datasets crudos + metadata de origen + timestamp de acceso.',
    tools: 'Conectores CKAN · APIs de portales nacionales · Cache LRU con TTL.',
  },
  {
    key: 'analysis',
    n: '03',
    label: 'Análisis',
    input: 'Datasets crudos heterogéneos.',
    output: 'Series normalizadas + cruces + flags de calidad.',
    tools: 'Transformaciones pandas-style · Detector de outliers · Validación cruzada.',
  },
  {
    key: 'synthesis',
    n: '04',
    label: 'Síntesis',
    input: 'Series limpias + insights detectados.',
    output: 'Respuesta en markdown + chart(s) + lista de fuentes verificables.',
    tools: 'Generador de markdown · Selector de tipo de chart · Citas con URL.',
  },
] as const;

const SOURCES: Record<string, string[]> = {
  Nacional: [
    'datos.gob.ar', 'INDEC', 'BCRA', 'Diputados', 'Senado', 'Justicia',
    'Energía', 'Transporte', 'Salud', 'Cultura', 'Producción',
    'MAGyP (agro)', 'ARSAT', 'ACUMAR', 'Interior', 'PAMI',
    'Desarrollo Social', 'Turismo', 'SSN (seguros)',
  ],
  CABA: ['BA Data (GCBA)', 'Legislatura CABA'],
  Provincias: ['Buenos Aires', 'Mendoza', 'Santa Fe', 'Córdoba'],
  Municipios: ['Luján de Cuyo', 'Mendoza Ciudad', 'Venado Tuerto', 'La Plata'],
};

const PRINCIPLES = [
  {
    n: 'I',
    title: 'Datos públicos, verificables.',
    body:
      'Toda respuesta se construye sobre datasets oficiales accesibles públicamente. Si una fuente no existe o no es citable, el agente lo declara.',
  },
  {
    n: 'II',
    title: 'Citas en cada respuesta.',
    body:
      'Cada chart y cada afirmación numérica viene con su fuente, URL y fecha de acceso. Auditable de punta a punta.',
  },
  {
    n: 'III',
    title: 'Sin opinión política.',
    body:
      'OpenArg no editorializa: presenta lo que dicen los datos, no lo que deberían decir. Las interpretaciones quedan del lado del lector.',
  },
];

export default function ComoFuncionaPage() {
  return (
    <main className="ed-page">
      <TopbarEditorial />

      <section className="ed-cf-hero">
        <div className="ed-container">
          <FadeIn direction="up" distance={8} duration={0.5}>
            <p className="ed-eyebrow">
              <span className="ed-eyebrow-num">Manifiesto técnico</span>
              <span>Cómo trabaja la plataforma</span>
            </p>
            <h1 className="ed-display" style={{ marginTop: '1rem', fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}>
              Cómo OpenArg analiza <em>datos abiertos.</em>
            </h1>
            <p className="ed-lead" style={{ marginTop: '1.5rem' }}>
              Una arquitectura multi-agente, treinta y dos portales monitoreados,
              datos públicos verificables. Esto es lo que pasa bajo el capó cuando
              hacés una pregunta.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Pipeline detallado */}
      <section className="ed-section">
        <div className="ed-container">
          <FadeIn direction="up" distance={8} duration={0.5}>
            <h2 className="ed-section-title">
              Pipeline multi-agente, <em>paso a paso.</em>
            </h2>
            <p className="ed-lead">
              Cada agente tiene un input claro y un output verificable. Si algo falla,
              sabés exactamente en qué etapa pasó.
            </p>
          </FadeIn>

          <div style={{ marginTop: '3rem' }}>
            {PIPELINE.map((p) => (
              <FadeIn key={p.n} direction="up" distance={6} duration={0.5}>
                <div className="ed-cf-pipeline-row">
                  <div className={`ed-cf-pipeline-row-num ed-cf-pipeline-row-num--${p.key}`}>{p.n}</div>
                  <dl className="ed-cf-pipeline-row-meta">
                    <dt>{p.label} · Input</dt>
                    <dd>{p.input}</dd>
                  </dl>
                  <dl className="ed-cf-pipeline-row-meta">
                    <dt>Output</dt>
                    <dd>{p.output}</dd>
                  </dl>
                  <dl className="ed-cf-pipeline-row-meta">
                    <dt>Herramientas</dt>
                    <dd>{p.tools}</dd>
                  </dl>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Fuentes */}
      <section className="ed-section">
        <div className="ed-container">
          <FadeIn direction="up" distance={8} duration={0.5}>
            <h2 className="ed-section-title">
              Las fuentes <em>que monitoreamos.</em>
            </h2>
            <p className="ed-lead">
              Una lista creciente. Si publican datos abiertos, los indexamos.
            </p>
          </FadeIn>

          <div className="ed-cf-sources-grid">
            {Object.entries(SOURCES).map(([category, items]) => (
              <FadeIn key={category} direction="up" distance={6} duration={0.5}>
                <div className="ed-cf-sources-col">
                  <h3>{category}</h3>
                  <ul className="ed-cf-sources-list">
                    {items.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Arquitectura */}
      <section className="ed-section">
        <div className="ed-container">
          <FadeIn direction="up" distance={8} duration={0.5}>
            <h2 className="ed-section-title">
              Arquitectura <em>técnica.</em>
            </h2>
            <p className="ed-lead">
              Frontend liviano, backend pesado, datos siempre públicos.
            </p>
          </FadeIn>

          <FadeIn direction="up" distance={8} delay={0.1} duration={0.5}>
            <div className="ed-cf-arch">
              <div className="ed-cf-arch-node">
                <span className="ed-cf-arch-node-tag">Frontend</span>
                <span className="ed-cf-arch-node-title">Next.js 16 · React 19</span>
                <span className="ed-cf-arch-node-body">
                  Cliente liviano. UI, autenticación Google, consumo SSE.
                </span>
              </div>
              <span className="ed-cf-arch-arrow" aria-hidden="true">→</span>
              <div className="ed-cf-arch-node">
                <span className="ed-cf-arch-node-tag">Backend</span>
                <span className="ed-cf-arch-node-title">FastAPI · Multi-agente</span>
                <span className="ed-cf-arch-node-body">
                  Orquesta los cuatro agentes, llama al LLM, consulta portales, cachea.
                </span>
              </div>
              <span className="ed-cf-arch-arrow" aria-hidden="true">→</span>
              <div className="ed-cf-arch-node">
                <span className="ed-cf-arch-node-tag">32 portales</span>
                <span className="ed-cf-arch-node-title">Datos abiertos oficiales</span>
                <span className="ed-cf-arch-node-body">
                  CKAN nacional, BCRA, INDEC, ministerios, provincias y municipios.
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Ética */}
      <section className="ed-section">
        <div className="ed-container">
          <FadeIn direction="up" distance={8} duration={0.5}>
            <h2 className="ed-section-title">
              Ética y <em>transparencia.</em>
            </h2>
            <p className="ed-lead">Tres compromisos no negociables.</p>
          </FadeIn>

          <div style={{ marginTop: '2rem' }}>
            {PRINCIPLES.map((p) => (
              <FadeIn key={p.n} direction="up" distance={6} duration={0.5}>
                <div className="ed-cf-principle">
                  <div className="ed-cf-principle-num">{p.n}</div>
                  <div>
                    <h3 className="ed-cf-principle-title">{p.title}</h3>
                    <p className="ed-cf-principle-body">{p.body}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="ed-section">
        <div className="ed-container" style={{ textAlign: 'center' }}>
          <FadeIn direction="up" distance={8} duration={0.5}>
            <h2 className="ed-section-title" style={{ margin: '0 auto 1rem' }}>
              Esto es un proyecto del <em>laboratorio.</em>
            </h2>
            <p className="ed-lead" style={{ margin: '0 auto', maxWidth: '56ch' }}>
              OpenArg es uno de los productos de Colossus Lab, un laboratorio de
              análisis de datos públicos. Si querés contribuir, reportar un bug
              o sugerir una fuente, te leemos.
            </p>
            <div style={{ display: 'inline-flex', gap: '2rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href="https://colossuslab.org" target="_blank" rel="noopener noreferrer" className="ed-textlink">
                <span className="ed-textlink-arrow">→</span>
                <span>Sitio del laboratorio</span>
              </a>
              <a href="https://github.com/colossuslab" target="_blank" rel="noopener noreferrer" className="ed-textlink">
                <span className="ed-textlink-arrow">→</span>
                <span>GitHub</span>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      <Colophon />
    </main>
  );
}
