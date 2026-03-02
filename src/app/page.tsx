import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-container">
      {/* Background effects */}
      <div className="landing-bg-glow" aria-hidden="true" />
      <div className="landing-bg-grid" aria-hidden="true" />

      {/* Logo mark */}
      <div className="hero-logo" aria-hidden="true">
        <Image src="/flag-icon.svg" alt="" width={72} height={72} priority />
      </div>

      <div className="hero-badge">
        <span className="hero-badge-dot" />
        <span>Plataforma de Inteligencia de Datos Abiertos</span>
      </div>

      <h1 className="hero-title">
        <span className="gradient-text">Open</span>
        <span className="gradient-text-accent">Arg</span>
      </h1>

      <p className="hero-subtitle">
        Pregunt&aacute; lo que quieras sobre los datos p&uacute;blicos de Argentina.
        <br />
        IA multi-agente busca, analiza y visualiza informaci&oacute;n de{" "}
        <strong>26 portales</strong> en tiempo real.
      </p>

      <div className="hero-actions">
        <Link href="/chat" className="hero-cta">
          <span>Comenzar an&aacute;lisis</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        <Link href="/datasets" className="hero-cta-secondary">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>Explorar Datasets</span>
        </Link>
      </div>

      {/* Trust bar */}
      <div className="hero-trust">
        <div className="hero-trust-item">
          <span className="hero-trust-number">26</span>
          <span className="hero-trust-label">Portales</span>
        </div>
        <div className="hero-trust-divider" />
        <div className="hero-trust-item">
          <span className="hero-trust-number">1.2K+</span>
          <span className="hero-trust-label">Datasets</span>
        </div>
        <div className="hero-trust-divider" />
        <div className="hero-trust-item">
          <span className="hero-trust-number">&lt;5s</span>
          <span className="hero-trust-label">Respuesta</span>
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-card-header">
            <div className="feature-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5" stroke="var(--celeste)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M2 10l8 5 8-5" stroke="var(--celeste)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5"/>
              </svg>
            </div>
            <div className="feature-title">Multi-Agente</div>
          </div>
          <div className="feature-desc">
            4 agentes IA especializados trabajan en equipo: planificaci&oacute;n,
            recolecci&oacute;n, an&aacute;lisis y s&iacute;ntesis.
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-card-header">
            <div className="feature-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="8" width="3" height="10" rx="1" fill="var(--celeste)" opacity="0.4"/>
                <rect x="7" y="5" width="3" height="13" rx="1" fill="var(--celeste)" opacity="0.6"/>
                <rect x="12" y="2" width="3" height="16" rx="1" fill="var(--celeste)" opacity="0.8"/>
                <rect x="17" y="6" width="1" height="12" rx="0.5" fill="var(--sol)" opacity="0.7"/>
              </svg>
            </div>
            <div className="feature-title">Datos Reales</div>
          </div>
          <div className="feature-desc">
            Series de tiempo, presupuesto, BCRA, INDEC, compras p&uacute;blicas,
            DDJJ patrimoniales y m&aacute;s.
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-card-header">
            <div className="feature-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="var(--celeste)" strokeWidth="1.5" opacity="0.5"/>
                <path d="M10 6v4l3 2" stroke="var(--sol)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="feature-title">Tiempo Real</div>
          </div>
          <div className="feature-desc">
            Indicadores econ&oacute;micos, datos geogr&aacute;ficos y
            visualizaciones autom&aacute;ticas con gr&aacute;ficos interactivos.
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <span className="landing-footer-line" />
        <span>Powered by{" "}
          <a href="https://colossuslab.tech" target="_blank" rel="noopener noreferrer" className="landing-footer-link">
            ColossusLab.tech
          </a>
        </span>
      </footer>
    </main>
  );
}
