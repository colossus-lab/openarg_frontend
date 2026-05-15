'use client';

import { useState } from 'react';
import Link from 'next/link';
import FadeIn from '@/components/reactbits/FadeIn';

const TOC = [
  { label: 'I. Escala', href: '#escala' },
  { label: 'II. Una pregunta', href: '#demo' },
  { label: 'III. Cómo', href: '#pipeline' },
  { label: 'IV. Ecosistema', href: '#ecosistema' },
  { label: 'V. Para quién', href: '#audiencias' },
];

const HERO_CTAS = [
  { href: '#demo', label: 'Ver una pregunta', external: false },
  { href: '/dashboards', label: 'Ver dashboards', external: false },
  { href: '/como-funciona', label: 'Cómo funciona', external: false },
];


export default function HeroEditorial() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="ed-hero">
      <span className="ed-flagstripe" aria-hidden="true" />

      <div className="ed-container ed-hero-inner">
        {/* Centered title block */}
        <div className="ed-hero-center">
          <FadeIn direction="up" distance={8} duration={0.5}>
            <p className="ed-eyebrow ed-hero-eyebrow-center">
              <span className="ed-eyebrow-num">N.º 01 / MMXXVI</span>
              <span>Inteligencia sobre datos públicos</span>
            </p>
          </FadeIn>

          <FadeIn direction="up" distance={10} delay={0.1} duration={0.6}>
            <h1 className="ed-display ed-hero-title">
              <span className="ed-hero-title-line">Argentina,</span>
              <span className="ed-hero-title-line ed-hero-title-line--alt">en datos.</span>
            </h1>
          </FadeIn>

          <FadeIn direction="up" distance={8} delay={0.25} duration={0.5}>
            <p className="ed-hero-subtitle">
              OpenArg es un motor de análisis impulsado por IA
              para datos abiertos del gobierno argentino.
            </p>
          </FadeIn>

          <FadeIn direction="up" distance={8} delay={0.35} duration={0.5}>
            <div className="ed-hero-actions">
              {/* Desktop: 3 inline text-links */}
              <div className="ed-hero-actions-row">
                {HERO_CTAS.map((c) =>
                  c.href.startsWith('#') ? (
                    <a key={c.href} href={c.href} className="ed-textlink">
                      <span className="ed-textlink-arrow">→</span>
                      <span>{c.label}</span>
                    </a>
                  ) : (
                    <Link key={c.href} href={c.href} className="ed-textlink">
                      <span className="ed-textlink-arrow">→</span>
                      <span>{c.label}</span>
                    </Link>
                  )
                )}
              </div>

              {/* Mobile: collapsible toggle */}
              <div className="ed-hero-actions-toggle-wrap">
                <button
                  type="button"
                  className="ed-hero-actions-toggle"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-controls="ed-hero-actions-menu"
                >
                  <span>Explorar opciones</span>
                  <span className="ed-hero-actions-toggle-chev" aria-hidden="true">▾</span>
                </button>
                <div
                  id="ed-hero-actions-menu"
                  className={`ed-hero-actions-menu${menuOpen ? ' is-open' : ''}`}
                  role="menu"
                >
                  {HERO_CTAS.map((c) =>
                    c.href.startsWith('#') ? (
                      <a
                        key={c.href}
                        href={c.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span>{c.label}</span>
                        <span className="ed-hero-actions-menu-arrow" aria-hidden="true">→</span>
                      </a>
                    ) : (
                      <Link
                        key={c.href}
                        href={c.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span>{c.label}</span>
                        <span className="ed-hero-actions-menu-arrow" aria-hidden="true">→</span>
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Foot block: 32 + lead (left) · TOC + colophon (right) */}
        <div className="ed-hero-foot">
          <div className="ed-hero-foot-left">
            <FadeIn direction="up" distance={8} delay={0.55} duration={0.5}>
              <div className="ed-num-display ed-hero-num">32</div>
            </FadeIn>
            <FadeIn direction="up" distance={8} delay={0.6} duration={0.5}>
              <p className="ed-meta ed-hero-num-label">
                Portales públicos · Argentina · monitoreo continuo
              </p>
            </FadeIn>
            <FadeIn direction="up" distance={8} delay={0.65} duration={0.5}>
              <p className="ed-lead">
                16.000 datasets oficiales, 23 provincias y la Ciudad de Buenos Aires.
                Una sola pregunta los atraviesa.
              </p>
            </FadeIn>
          </div>

          <div className="ed-hero-foot-right">
            <FadeIn direction="up" distance={6} delay={0.7} duration={0.5}>
              <nav className="ed-hero-toc" aria-label="Índice de secciones">
                <ul className="ed-hero-toc-list">
                  {TOC.map((t) => (
                    <li key={t.href}>
                      <a href={t.href}>{t.label}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            </FadeIn>

            <FadeIn direction="up" distance={6} delay={0.8} duration={0.5}>
              <p className="ed-hero-colophon">
                Colossus Lab · Buenos Aires · MMXXVI
                <span className="ed-hero-disclaimer"> · * Cifras ilustrativas</span>
              </p>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
