import FadeIn from '@/components/reactbits/FadeIn';
import { DATASETS, MCP_SITE_URL } from '@/lib/seo';

/*
 * Presenta el MCP en la home. Hasta ahora sólo figuraba como link en el menú,
 * así que ni la gente ni los buscadores lo encontraban leyendo la página.
 */
export default function McpEditorial() {
  return (
    <section className="ed-section" id="mcp">
      <div className="ed-container">
        <FadeIn direction="up" distance={8} duration={0.5}>
          <div className="ed-section-head">
            <p className="ed-eyebrow">
              <span className="ed-eyebrow-num">MCP</span>
              <span>Para tu asistente de IA</span>
            </p>
            <h2 className="ed-section-title">
              Los datos públicos de Argentina, <em>dentro de Claude, Cursor o tu agente.</em>
            </h2>
            <p className="ed-lead">
              Con el MCP de OpenArg, tu asistente busca entre más de {DATASETS} datasets oficiales —INDEC, BCRA,
              ministerios, provincias y municipios—, lee las tablas y te da el link al archivo de origen. Funciona
              en Claude, Cursor, VS Code y agentes propios, también en WhatsApp o n8n. La clave es gratis: 200
              consultas de datos y 10 preguntas por mes.
            </p>
          </div>
        </FadeIn>
        <FadeIn direction="up" distance={8} delay={0.1} duration={0.5}>
          <div className="ed-ecosystem-cta">
            <a href="/desarrolladores" className="ed-textlink">
              <span className="ed-textlink-arrow">→</span>
              <span>Sacá tu clave gratis</span>
            </a>
            <a href={`${MCP_SITE_URL}/empezar.html`} className="ed-textlink" style={{ marginLeft: '1.5rem' }}>
              <span className="ed-textlink-arrow">→</span>
              <span>Cómo conectarlo</span>
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
