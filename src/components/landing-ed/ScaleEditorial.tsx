'use client';

import FadeIn from '@/components/reactbits/FadeIn';
import GeoBlocksMap from './GeoBlocksMap';

const ROWS = [
  {
    n: '32',
    label: 'Portales públicos',
    detail: 'Nación, INDEC, BCRA, ministerios, organismos descentralizados.',
  },
  {
    n: '16.000+',
    label: 'Datasets indexados',
    detail: 'Series de tiempo, geografía, presupuesto, salud, educación, compras.',
  },
  {
    n: '24',
    label: 'Jurisdicciones',
    detail: '23 provincias más la Ciudad Autónoma de Buenos Aires.',
  },
  {
    n: '5 s',
    label: 'Mediana de respuesta',
    detail: 'Desde la pregunta a la primera visualización útil del cruce.',
  },
];

export default function ScaleEditorial() {
  return (
    <section className="ed-section" id="escala">
      <div className="ed-container">
        <FadeIn direction="up" distance={8} duration={0.5}>
          <div className="ed-section-head">
            <p className="ed-eyebrow">
              <span className="ed-eyebrow-num">I.</span>
              <span>La escala</span>
            </p>
            <h2 className="ed-section-title">
              Cubrimos cada jurisdicción <em>que publica datos.</em>
            </h2>
            <p className="ed-lead">
              Un mismo sistema indexa portales nacionales, provinciales y municipales
              en paralelo. La consulta atraviesa fronteras administrativas sin que
              vos tengas que pensar dónde buscar.
            </p>
          </div>
        </FadeIn>

        {/* Big number table */}
        <div>
          {ROWS.map((r, i) => (
            <FadeIn key={r.label} direction="up" distance={8} delay={i * 0.05} duration={0.5}>
              <div className="ed-scale-row">
                <div className="ed-scale-row-num">{r.n}</div>
                <div className="ed-scale-row-label">{r.label}</div>
                <div className="ed-scale-row-detail">{r.detail}</div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Treemap of datasets by region */}
        <FadeIn direction="up" distance={8} delay={0.1} duration={0.5}>
          <div style={{ marginTop: '5rem' }}>
            <p className="ed-eyebrow" style={{ marginBottom: '1.5rem' }}>
              <span className="ed-eyebrow-num">Treemap</span>
              <span>Datasets por región · área proporcional al volumen</span>
            </p>
            <GeoBlocksMap />
          </div>
        </FadeIn>

        <FadeIn direction="up" distance={8} delay={0.2} duration={0.5}>
          <blockquote className="ed-geomap-quote">
            La Nación concentra el 54% de los datasets;
            <br />
            las provincias completan el resto.
          </blockquote>
        </FadeIn>
      </div>
    </section>
  );
}
