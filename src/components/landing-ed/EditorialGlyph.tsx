'use client';

/**
 * Composiciones geométricas monocromáticas tipo símbolo de imprenta,
 * una por dashboard. Inspiración Polesello / Le Parc / Vasarely / Méndez Mosquera.
 * Cada glyph es un SVG inline en currentColor.
 */

interface EditorialGlyphProps {
  slug: string;
  className?: string;
}

function GlyphCABA() {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor">
      <rect x="10" y="50" width="80" height="2" />
      <rect x="20" y="10" width="60" height="60" fill="none" strokeWidth="2" />
      <rect x="35" y="25" width="30" height="30" />
    </svg>
  );
}

function GlyphCrec() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
      <path d="M10 80 Q30 30 50 50 T 90 20" strokeWidth="2" />
      <path d="M10 90 L 90 90" strokeWidth="1" />
      <circle cx="10" cy="80" r="2" fill="currentColor" />
      <circle cx="50" cy="50" r="2" fill="currentColor" />
      <circle cx="90" cy="20" r="2" fill="currentColor" />
    </svg>
  );
}

function GlyphEdu() {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor">
      <rect x="15" y="60" width="10" height="30" />
      <rect x="30" y="40" width="10" height="50" />
      <rect x="45" y="20" width="10" height="70" />
      <rect x="60" y="50" width="10" height="40" />
      <rect x="75" y="30" width="10" height="60" />
    </svg>
  );
}

function GlyphLujan() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
      <path d="M10 70 L 30 50 L 50 65 L 70 35 L 90 50" strokeWidth="2" />
      <path d="M10 90 L 90 90" strokeWidth="1" />
      <path d="M10 75 L 30 55 L 50 70 L 70 40 L 90 55 L 90 90 L 10 90 Z" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

function GlyphMzaCiudad() {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor">
      <circle cx="30" cy="30" r="12" />
      <circle cx="60" cy="50" r="18" />
      <circle cx="75" cy="75" r="8" />
      <circle cx="20" cy="70" r="6" />
    </svg>
  );
}

function GlyphMza() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
      <polygon points="50,15 85,80 15,80" strokeWidth="2" />
      <polygon points="50,30 70,72 30,72" fill="currentColor" />
    </svg>
  );
}

function GlyphMineria() {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor">
      <path d="M10 85 L30 55 L50 70 L70 45 L90 65 L90 85 Z" />
      <polygon points="50,20 60,45 40,45" fill="none" strokeWidth="2" />
      <circle cx="75" cy="25" r="6" />
    </svg>
  );
}

function GlyphPBA() {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor">
      <rect x="10" y="65" width="8" height="25" />
      <rect x="22" y="55" width="8" height="35" />
      <rect x="34" y="45" width="8" height="45" />
      <rect x="46" y="35" width="8" height="55" />
      <rect x="58" y="25" width="8" height="65" />
      <rect x="70" y="15" width="8" height="75" />
      <rect x="82" y="40" width="8" height="50" />
    </svg>
  );
}

function GlyphDatos() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
      <circle cx="50" cy="50" r="35" strokeWidth="2" />
      <circle cx="50" cy="50" r="22" strokeWidth="1" />
      <circle cx="50" cy="50" r="9" fill="currentColor" />
      <line x1="50" y1="15" x2="50" y2="85" strokeWidth="1" strokeDasharray="2 3" />
      <line x1="15" y1="50" x2="85" y2="50" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
  );
}

function GlyphVT() {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor">
      <rect x="15" y="15" width="30" height="30" />
      <rect x="55" y="15" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="15" y="55" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="55" y="55" width="30" height="30" />
    </svg>
  );
}

function GlyphSeguridad() {
  // 4x4 grid of dots, weighted toward the centre — abstract national territory
  return (
    <svg viewBox="0 0 100 100" fill="currentColor">
      <circle cx="20" cy="20" r="2" /><circle cx="40" cy="20" r="3" /><circle cx="60" cy="20" r="2" /><circle cx="80" cy="20" r="2" />
      <circle cx="20" cy="40" r="3" /><circle cx="40" cy="40" r="4" /><circle cx="60" cy="40" r="3" /><circle cx="80" cy="40" r="2" />
      <circle cx="20" cy="60" r="2" /><circle cx="40" cy="60" r="3" /><circle cx="60" cy="60" r="4" /><circle cx="80" cy="60" r="3" />
      <circle cx="20" cy="80" r="2" /><circle cx="40" cy="80" r="2" /><circle cx="60" cy="80" r="3" /><circle cx="80" cy="80" r="2" />
    </svg>
  );
}

function GlyphMoron() {
  // Filled inner square inside an outlined frame — municipal containment
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
      <rect x="10" y="10" width="80" height="80" strokeWidth="2" />
      <rect x="30" y="35" width="25" height="25" fill="currentColor" />
      <rect x="60" y="55" width="15" height="15" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function GlyphMapaEduGba() {
  // Faded grid + 3 highlighted markers — radios + colegios
  const grid = [15, 30, 45, 60, 75].flatMap((x) =>
    [20, 35, 50, 65, 80].map((y) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" opacity="0.35" />
    ))
  );
  return (
    <svg viewBox="0 0 100 100" fill="currentColor">
      {grid}
      <circle cx="30" cy="35" r="4" />
      <circle cx="60" cy="50" r="4" />
      <circle cx="45" cy="65" r="4" />
    </svg>
  );
}

function GlyphSegConurbano() {
  // Concentric rings around a centre — partidos around CABA
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
      <circle cx="50" cy="50" r="8" fill="currentColor" />
      <circle cx="50" cy="50" r="22" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="50" cy="50" r="36" strokeWidth="1.2" strokeDasharray="2 4" />
      <line x1="50" y1="14" x2="50" y2="86" strokeWidth="0.8" opacity="0.5" />
      <line x1="14" y1="50" x2="86" y2="50" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

function GlyphMonitorHcdn() {
  // Vertical bars on a baseline — parliamentary columns
  return (
    <svg viewBox="0 0 100 100" fill="currentColor">
      <rect x="15" y="35" width="6" height="55" />
      <rect x="27" y="25" width="6" height="65" />
      <rect x="39" y="40" width="6" height="50" />
      <rect x="51" y="20" width="6" height="70" />
      <rect x="63" y="30" width="6" height="60" />
      <rect x="75" y="45" width="6" height="45" />
      <rect x="10" y="90" width="80" height="3" />
    </svg>
  );
}

const GLYPHS: Record<string, React.FC> = {
  caba: GlyphCABA,
  'crecimiento-demografico': GlyphCrec,
  'educacion-caba': GlyphEdu,
  'lujan-de-cuyo': GlyphLujan,
  'mendoza-ciudad': GlyphMzaCiudad,
  mendoza: GlyphMza,
  mineria: GlyphMineria,
  pba: GlyphPBA,
  'datos-abiertos': GlyphDatos,
  'venado-tuerto': GlyphVT,
  seguridad: GlyphSeguridad,
  moron: GlyphMoron,
  'mapa-educacion-gba': GlyphMapaEduGba,
  'seguridad-conurbano': GlyphSegConurbano,
  'monitor-hcdn': GlyphMonitorHcdn,
};

export default function EditorialGlyph({ slug, className = '' }: EditorialGlyphProps) {
  const Glyph = GLYPHS[slug] ?? GlyphDatos;
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: '1.25rem',
      }}
      aria-hidden="true"
    >
      <Glyph />
    </div>
  );
}
