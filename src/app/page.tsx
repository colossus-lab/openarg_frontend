import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-container">
      <div className="hero-badge">
        <span>Plataforma de Inteligencia de Datos Abiertos</span>
      </div>

      <h1 className="hero-title">
        <span className="gradient-text">OpenArg</span>
      </h1>

      <p className="hero-subtitle">
        Pregunta lo que quieras sobre los datos publicos de Argentina.
        IA multi-agente busca, analiza y visualiza informacion de{" "}
        <strong>datos.gob.ar</strong> y portales provinciales en tiempo real.
      </p>

      <Link href="/chat" className="hero-cta">
        <span>Comenzar analisis</span>
        <span>&rarr;</span>
      </Link>

      <Link href="/datasets" className="hero-cta-secondary">
        <span>Explorar Datasets</span>
      </Link>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">IA</div>
          <div className="feature-title">Multi-Agente</div>
          <div className="feature-desc">
            4 agentes especializados trabajan en equipo para responder
            consultas complejas sobre datos publicos.
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">1.2K</div>
          <div className="feature-title">Datasets</div>
          <div className="feature-desc">
            Acceso directo a datos.gob.ar, CABA, Buenos Aires, Cordoba,
            Santa Fe, Mendoza y mas portales.
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">&lt;5s</div>
          <div className="feature-title">Tiempo Real</div>
          <div className="feature-desc">
            Series de tiempo, indicadores economicos, datos geograficos.
            Visualizaciones automaticas con graficos interactivos.
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        Powered by Colossuslab.tech
      </footer>
    </main>
  );
}
