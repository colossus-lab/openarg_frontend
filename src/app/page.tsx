import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-container">
      <div className="hero-badge">
        <span>🇦🇷</span>
        <span>Plataforma de Inteligencia de Datos Abiertos</span>
      </div>

      <h1 className="hero-title">
        <span className="gradient-text">OpenArg</span>
      </h1>

      <p className="hero-subtitle">
        Preguntá lo que quieras sobre los datos públicos de Argentina.
        Nuestra IA multi-agente busca, analiza y visualiza información de{" "}
        <strong>datos.gob.ar</strong> y portales provinciales en tiempo real.
      </p>

      <Link href="/chat" className="hero-cta">
        <span>Comenzar análisis</span>
        <span>→</span>
      </Link>

      <Link
        href="/datasets"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          marginTop: "1rem",
          padding: "0.6rem 1.5rem",
          fontSize: "0.9rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          background: "transparent",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          textDecoration: "none",
          transition: "all 0.3s ease",
          animation: "fadeInUp 0.6s ease-out 0.35s both",
        }}
      >
        <span>Explorar Datasets</span>
      </Link>

      <div className="features-grid">
        <div className="feature-card glass">
          <div className="feature-icon">🧠</div>
          <div className="feature-title">IA Multi-Agente</div>
          <div className="feature-desc">
            4 agentes especializados (Planificador, Recolector, Analista, Memoria)
            trabajan en equipo para responder consultas complejas.
          </div>
        </div>

        <div className="feature-card glass">
          <div className="feature-icon">📊</div>
          <div className="feature-title">1200+ Datasets</div>
          <div className="feature-desc">
            Acceso directo a datos.gob.ar, CABA, Buenos Aires, Córdoba,
            Santa Fe, Mendoza y más portales provinciales.
          </div>
        </div>

        <div className="feature-card glass">
          <div className="feature-icon">⚡</div>
          <div className="feature-title">Análisis en Tiempo Real</div>
          <div className="feature-desc">
            Series de tiempo, indicadores económicos, datos geográficos.
            Visualizaciones automáticas con gráficos interactivos.
          </div>
        </div>
      </div>

      <footer style={{ marginTop: "4rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
        Powered by Colossuslab.tech
      </footer>
    </main>
  );
}
