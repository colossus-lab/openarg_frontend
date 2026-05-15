'use client';

import { useMemo, useState } from 'react';
import FadeIn from '@/components/reactbits/FadeIn';
import TopbarEditorial from '@/components/landing-ed/TopbarEditorial';
import Colophon from '@/components/landing-ed/Colophon';
import EditorialGlyph from '@/components/landing-ed/EditorialGlyph';
import {
  products,
  allCategories,
  allRegions,
  type Product,
  type ProductCategory,
  type ProductRegion,
} from '@/lib/products';

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  municipal: 'Municipal',
  provincial: 'Provincial',
  nacional: 'Nacional',
  sectorial: 'Sectorial',
  demografico: 'Demográfico',
  'gobierno-abierto': 'Gobierno Abierto',
};

const REGION_LABEL: Record<ProductRegion, string> = {
  CABA: 'Ciudad de Buenos Aires',
  PBA: 'Prov. de Buenos Aires',
  Mendoza: 'Mendoza',
  'Santa Fe': 'Santa Fe',
  Argentina: 'Argentina',
};

export default function DashboardsPage() {
  const [query, setQuery] = useState('');
  const [cats, setCats] = useState<Set<ProductCategory>>(new Set());
  const [regs, setRegs] = useState<Set<ProductRegion>>(new Set());

  const toggle = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const filtered = useMemo<Product[]>(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (cats.size > 0 && !cats.has(p.category)) return false;
      if (regs.size > 0 && !regs.has(p.region)) return false;
      if (!q) return true;
      const blob = `${p.title} ${p.tagline} ${p.description} ${p.tags.join(' ')} ${p.region}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query, cats, regs]);

  const hasFilters = query.length > 0 || cats.size > 0 || regs.size > 0;

  return (
    <main className="ed-page">
      <TopbarEditorial />
      <section className="ed-dash-hero">
        <div className="ed-container">
          <FadeIn direction="up" distance={8} duration={0.5}>
            <p className="ed-eyebrow">
              <span className="ed-eyebrow-num">Catálogo</span>
              <span>{products.length} dashboards activos</span>
            </p>
            <h1 className="ed-section-title" style={{ marginTop: '0.75rem' }}>
              Dashboards del <em>ecosistema.</em>
            </h1>
            <p className="ed-lead">
              Análisis de datos públicos por jurisdicción y sector. Cada dashboard
              es una plataforma independiente del laboratorio; abre en una pestaña aparte.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="ed-container">
        <FadeIn direction="up" distance={8} delay={0.05} duration={0.5}>
          <div className="ed-dash-filters">
            <div className="ed-dash-search">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                placeholder="Buscar por tema, región, palabra clave…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Buscar"
              />
            </div>

            <div className="ed-dash-pills-row">
              <span className="ed-dash-pills-label">Categoría</span>
              {allCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`ed-dash-pill${cats.has(c) ? ' is-active' : ''}`}
                  onClick={() => toggle(setCats, c)}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>

            <div className="ed-dash-pills-row">
              <span className="ed-dash-pills-label">Región</span>
              {allRegions.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`ed-dash-pill${regs.has(r) ? ' is-active' : ''}`}
                  onClick={() => toggle(setRegs, r)}
                >
                  {r}
                </button>
              ))}
              {hasFilters && (
                <button
                  type="button"
                  className="ed-dash-clear"
                  onClick={() => {
                    setQuery('');
                    setCats(new Set());
                    setRegs(new Set());
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </FadeIn>

        <p className="ed-dash-count">
          Mostrando <strong>{filtered.length}</strong> de <strong>{products.length}</strong> dashboards.
        </p>

        {filtered.length === 0 ? (
          <div className="ed-dash-empty">
            No hay dashboards que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <div className="ed-ecosystem" style={{ borderTop: '2px solid var(--ed-ink)' }}>
            {filtered.map((p, i) => {
              const comingSoon = p.status === 'coming-soon';
              const cardBody = (
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
                      <span>{CATEGORY_LABEL[p.category]}</span>
                      <span
                        className={`ed-ecosystem-card-cta${comingSoon ? ' is-coming-soon' : ''}`}
                      >
                        {comingSoon ? 'Próximamente' : 'Abrir →'}
                      </span>
                    </div>
                  </div>
                </>
              );

              return (
                <FadeIn
                  key={p.slug}
                  direction="up"
                  distance={6}
                  delay={Math.min(0.05 + i * 0.04, 0.4)}
                  duration={0.5}
                >
                  {comingSoon ? (
                    <div
                      className="ed-ecosystem-card is-coming-soon"
                      aria-disabled="true"
                    >
                      {cardBody}
                    </div>
                  ) : (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ed-ecosystem-card"
                    >
                      {cardBody}
                    </a>
                  )}
                </FadeIn>
              );
            })}
          </div>
        )}
      </section>

      <div style={{ marginTop: '6rem' }} />
      <Colophon />
    </main>
  );
}
