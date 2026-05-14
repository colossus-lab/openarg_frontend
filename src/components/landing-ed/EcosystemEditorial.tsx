'use client';

import Link from 'next/link';
import FadeIn from '@/components/reactbits/FadeIn';
import { featuredProducts, products, type Product } from '@/lib/products';
import EditorialGlyph from './EditorialGlyph';

const REGION_LABEL: Record<Product['region'], string> = {
  CABA: 'Ciudad de Buenos Aires',
  PBA: 'Prov. de Buenos Aires',
  Mendoza: 'Mendoza',
  'Santa Fe': 'Santa Fe',
  Argentina: 'Argentina',
};

export default function EcosystemEditorial() {
  return (
    <section className="ed-section" id="ecosistema">
      <div className="ed-container">
        <FadeIn direction="up" distance={8} duration={0.5}>
          <div className="ed-section-head">
            <p className="ed-eyebrow">
              <span className="ed-eyebrow-num">IV.</span>
              <span>El ecosistema</span>
            </p>
            <h2 className="ed-section-title">
              <em>{products.length}</em> dashboards especializados.
            </h2>
            <p className="ed-lead">
              Cuando la pregunta es demasiado grande para una conversación,
              abrís el dashboard. Cada uno es una plataforma independiente del
              laboratorio, con sus propios reportes y mapas.
            </p>
          </div>
        </FadeIn>

        <FadeIn direction="up" distance={10} delay={0.1} duration={0.5}>
          <div className="ed-ecosystem">
            {featuredProducts.map((p, i) => {
              const comingSoon = p.status === 'coming-soon';
              const body = (
                <>
                  <div className="ed-ecosystem-card-glyph">
                    <EditorialGlyph slug={p.slug} />
                  </div>
                  <div className="ed-ecosystem-card-body">
                    <span className="ed-ecosystem-card-num">
                      {String(i + 1).padStart(2, '0')} · {REGION_LABEL[p.region]}
                    </span>
                    <h3 className="ed-ecosystem-card-title">{p.title}</h3>
                    <p className="ed-ecosystem-card-tagline">{p.tagline}</p>
                    <div className="ed-ecosystem-card-tags">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="ed-ecosystem-card-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="ed-ecosystem-card-meta">
                      <span>{p.stack?.slice(0, 2).join(' · ')}</span>
                      <span
                        className={`ed-ecosystem-card-cta${comingSoon ? ' is-coming-soon' : ''}`}
                      >
                        {comingSoon ? 'Próximamente' : 'Abrir →'}
                      </span>
                    </div>
                  </div>
                </>
              );

              return comingSoon ? (
                <div
                  key={p.slug}
                  className="ed-ecosystem-card is-coming-soon"
                  aria-disabled="true"
                >
                  {body}
                </div>
              ) : (
                <a
                  key={p.slug}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ed-ecosystem-card"
                >
                  {body}
                </a>
              );
            })}
          </div>
        </FadeIn>

        <FadeIn direction="up" distance={8} delay={0.2} duration={0.5}>
          <div className="ed-ecosystem-cta">
            <Link href="/dashboards" className="ed-textlink">
              <span className="ed-textlink-arrow">→</span>
              <span>Ver los {products.length} dashboards</span>
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
