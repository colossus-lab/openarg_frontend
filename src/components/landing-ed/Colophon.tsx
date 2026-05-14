'use client';

import Link from 'next/link';

export default function Colophon() {
  const year = new Date().getFullYear();
  return (
    <footer className="ed-colophon">
      <div className="ed-container">
        <div className="ed-colophon-grid">
          <div className="ed-colophon-brand">
            <span className="ed-colophon-brand-name">OpenArg</span>
            <span className="ed-colophon-brand-sub">por Colossus Lab</span>
            <p
              style={{
                marginTop: '0.75rem',
                fontFamily: 'var(--ed-body)',
                fontSize: '0.85rem',
                color: 'var(--ed-ink-2)',
                lineHeight: 1.5,
                maxWidth: '32ch',
              }}
            >
              Análisis cruzado de datos públicos del Estado argentino.
              Plataforma del laboratorio Colossus.
            </p>
          </div>

          <div className="ed-colophon-col">
            <span className="ed-colophon-col-title">Producto</span>
            <Link href="/chat">Chat</Link>
            <Link href="/datasets">Datasets</Link>
            <Link href="/dashboards">Dashboards</Link>
            <Link href="/como-funciona">Cómo funciona</Link>
          </div>

          <div className="ed-colophon-col">
            <span className="ed-colophon-col-title">Colossus Lab</span>
            <a href="https://colossuslab.org" target="_blank" rel="noopener noreferrer">
              Sitio del laboratorio
            </a>
            <a href="https://github.com/colossuslab" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="mailto:hola@colossuslab.org">Contacto</a>
          </div>

          <div className="ed-colophon-col">
            <span className="ed-colophon-col-title">Legal</span>
            <Link href="/privacy">Política de privacidad</Link>
            <a
              href="https://www.argentina.gob.ar/aaip"
              target="_blank"
              rel="noopener noreferrer"
            >
              Acceso a la información
            </a>
          </div>
        </div>

        <div className="ed-colophon-bottom">
          <span>
            © {year} Colossus Lab · Hecho en <em>Buenos Aires</em>.
          </span>
          <span>
            Compuesto en Familjen Grotesk e Inter. Datos públicos verificables.
          </span>
        </div>
      </div>
    </footer>
  );
}
