'use client';

/**
 * Treemap of dataset coverage across Argentine jurisdictions.
 * Block sizes are proportional to dataset volume (illustrative numbers).
 */

interface Region {
  key: string;
  label: string;
  color: string;
  textOn: 'dark' | 'cream';
  count: number;
  share: number;       // 0-100 for label display
  jurisdictions: string[];
  /** [left, top, width, height] in % of canvas — hand-tuned treemap */
  rect: [number, number, number, number];
}

const REGIONS: Region[] = [
  {
    key: 'nacion',
    label: 'Nación',
    color: 'var(--ed-cobalt)',
    textOn: 'dark',
    count: 9000,
    share: 54,
    jurisdictions: ['INDEC', 'BCRA', 'datos.gob.ar', '14 ministerios', 'organismos'],
    rect: [0, 0, 60, 75],
  },
  {
    key: 'caba',
    label: 'CABA',
    color: 'var(--ed-celeste)',
    textOn: 'dark',
    count: 2341,
    share: 14,
    jurisdictions: ['BA Data', 'Legislatura'],
    rect: [60, 0, 40, 22],
  },
  {
    key: 'pampa',
    label: 'Pampa',
    color: 'var(--ed-vermilion)',
    textOn: 'dark',
    count: 1820,
    share: 11,
    jurisdictions: ['PBA', 'La Plata'],
    rect: [60, 22, 40, 28],
  },
  {
    key: 'centro',
    label: 'Centro',
    color: 'var(--ed-ink)',
    textOn: 'dark',
    count: 1400,
    share: 8,
    jurisdictions: ['Córdoba', 'Santa Fe', 'Entre Ríos', 'Venado Tuerto', 'La Pampa'],
    rect: [60, 50, 40, 25],
  },
  {
    key: 'cuyo',
    label: 'Cuyo',
    color: 'var(--ed-chrome)',
    textOn: 'dark',
    count: 1200,
    share: 7,
    jurisdictions: ['Mendoza', 'San Juan', 'San Luis', 'Luján de C.', 'Mza. Ciudad'],
    rect: [0, 75, 30, 25],
  },
  {
    key: 'noa',
    label: 'NOA',
    color: 'rgba(246, 180, 14, 0.7)',
    textOn: 'dark',
    count: 800,
    share: 5,
    jurisdictions: ['Jujuy', 'Salta', 'Tucumán', 'Catamarca', 'La Rioja', 'Sgo. del E.'],
    rect: [30, 75, 22, 25],
  },
  {
    key: 'nea',
    label: 'NEA',
    color: 'rgba(116, 172, 223, 0.7)',
    textOn: 'dark',
    count: 500,
    share: 3,
    jurisdictions: ['Formosa', 'Chaco', 'Misiones', 'Corrientes'],
    rect: [52, 75, 16, 25],
  },
  {
    key: 'patagonia',
    label: 'Patagonia',
    color: 'var(--ed-paper-3)',
    textOn: 'cream',
    count: 400,
    share: 2,
    jurisdictions: ['Neuquén', 'Río Negro', 'Chubut', 'Sta. Cruz', 'T. del F.'],
    rect: [68, 75, 32, 25],
  },
];

/** Pre-sorted by count descending — for the aside legend */
const LEGEND_ORDER = [...REGIONS].sort((a, b) => b.count - a.count);

function fmt(n: number) {
  return n.toLocaleString('es-AR');
}

export default function GeoBlocksMap() {
  return (
    <div className="ed-geomap">
      <div
        className="ed-geomap-canvas"
        role="img"
        aria-label="Treemap de datasets por región argentina"
      >
        {REGIONS.map((r) => {
          const [left, top, width, height] = r.rect;
          // Number font size proportional to cell area (capped)
          const area = width * height;
          const numSize = Math.max(1.1, Math.min(3.5, area / 600 + 1.1));
          const showJur = area >= 350;
          return (
            <div
              key={r.key}
              className="ed-geomap-region"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
                background: r.color,
                color: r.textOn === 'cream' ? 'var(--ed-ink)' : '#06090F',
                borderColor: r.textOn === 'cream' ? 'rgba(116, 172, 223, 0.35)' : 'rgba(6, 9, 15, 0.15)',
              }}
            >
              <span className="ed-geomap-region-label">{r.label}</span>
              <span
                className="ed-geomap-region-num"
                style={{ fontSize: `${numSize}rem` }}
              >
                {fmt(r.count)}
              </span>
              <span className="ed-geomap-region-share">{r.share}%</span>
              {showJur && (
                <span className="ed-geomap-region-list">
                  {r.jurisdictions.slice(0, 3).join(' · ')}
                  {r.jurisdictions.length > 3 && ` · +${r.jurisdictions.length - 3}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <aside className="ed-geomap-aside">
        <p className="ed-meta">Treemap · datasets por región</p>
        <ul className="ed-geomap-legend">
          {LEGEND_ORDER.map((r) => (
            <li key={r.key}>
              <span className="ed-geomap-legend-swatch" style={{ background: r.color }} />
              <span>{r.label}</span>
              <span className="ed-geomap-legend-num">{fmt(r.count)}</span>
            </li>
          ))}
        </ul>
        <p className="ed-meta-mono">
          Total: 17.461 datasets · 24 jurisdicciones + nación.
          <br />
          <span style={{ opacity: 0.6 }}>* Cifras ilustrativas.</span>
        </p>
      </aside>
    </div>
  );
}
