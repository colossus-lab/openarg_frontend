/**
 * Scripted Chat Demo — fake conversation rendered on the landing page.
 * ALL data here is ILLUSTRATIVE — names and numbers are fabricated
 * (or plausible orders of magnitude). The chart card displays a
 * "Datos ilustrativos" disclaimer in the UI.
 */

import type { AgentPhase, ChartData, SourceAttribution } from './types';

export interface DemoScenario {
  question: string;
  answer: string;
  chart: ChartData;
  sources: SourceAttribution[];
}

export interface DemoPhase {
  key: AgentPhase;
  label: string;
  durationMs: number;
  cssColor: string;
  thinking: string;
}

export const DEMO_PHASES: DemoPhase[] = [
  {
    key: 'planning',
    label: 'Planificación',
    durationMs: 1400,
    cssColor: 'var(--phase-planning)',
    thinking: 'Descomponiendo la consulta y eligiendo fuentes…',
  },
  {
    key: 'data_collection',
    label: 'Recolección',
    durationMs: 2400,
    cssColor: 'var(--phase-data)',
    thinking: 'Consultando portales del Senado, BCRA y Oficina Anticorrupción…',
  },
  {
    key: 'analysis',
    label: 'Análisis',
    durationMs: 2000,
    cssColor: 'var(--phase-analysis)',
    thinking: 'Cruzando series y normalizando…',
  },
  {
    key: 'synthesis',
    label: 'Síntesis',
    durationMs: 1600,
    cssColor: 'var(--phase-synthesis)',
    thinking: 'Componiendo la respuesta con gráfico y citas…',
  },
];

/** ---------------- Scenario 1 — Patrimonio de senadores ---------------- */

const SCENARIO_PATRIMONIO: DemoScenario = {
  question:
    '¿Cómo evolucionó el patrimonio declarado de los senadores con mayor riqueza entre 2019 y 2024?',
  answer: `Entre **2019 y 2024**, los cinco senadores con mayor patrimonio declarado mostraron una trayectoria heterogénea:

- **Tres** acumularon incrementos por encima del **80%** en términos nominales, con saltos puntuales en años de actualización catastral.
- **Dos** mantuvieron variaciones por debajo de la inflación acumulada del período.
- El componente de **bienes inmuebles** explica el 62% de la variación total.

El siguiente gráfico muestra la evolución anual de cada uno, en millones de pesos argentinos corrientes.`,
  chart: {
    type: 'line_chart',
    title: 'Patrimonio declarado por senador (M ARS, valores nominales)',
    xKey: 'anio',
    yKeys: ['Senador A', 'Senador B', 'Senador C', 'Senador D', 'Senador E'],
    colors: ['#74ACDF', '#F6B40E', '#A78BFA', '#34D399', '#F87171'],
    data: [
      { anio: '2019', 'Senador A': 142, 'Senador B': 118, 'Senador C': 96,  'Senador D': 84,  'Senador E': 72  },
      { anio: '2020', 'Senador A': 158, 'Senador B': 126, 'Senador C': 102, 'Senador D': 88,  'Senador E': 81  },
      { anio: '2021', 'Senador A': 187, 'Senador B': 141, 'Senador C': 124, 'Senador D': 93,  'Senador E': 96  },
      { anio: '2022', 'Senador A': 232, 'Senador B': 162, 'Senador C': 148, 'Senador D': 101, 'Senador E': 118 },
      { anio: '2023', 'Senador A': 281, 'Senador B': 184, 'Senador C': 173, 'Senador D': 112, 'Senador E': 137 },
      { anio: '2024', 'Senador A': 326, 'Senador B': 198, 'Senador C': 209, 'Senador D': 119, 'Senador E': 151 },
    ],
  },
  sources: [
    {
      name: 'Declaraciones Juradas Patrimoniales — Senado de la Nación',
      url: 'https://www.argentina.gob.ar/anticorrupcion/declaracionesjuradas',
      portal: 'OA',
      accessedAt: '2026-05-08',
    },
    {
      name: 'Índice de Precios al Consumidor — INDEC',
      url: 'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31',
      portal: 'INDEC',
      accessedAt: '2026-05-08',
    },
    {
      name: 'Cotización oficial mayorista — BCRA',
      url: 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Cotizaciones_por_fecha_2.asp',
      portal: 'BCRA',
      accessedAt: '2026-05-08',
    },
    {
      name: 'Datasets — datos.gob.ar',
      url: 'https://datos.gob.ar/dataset',
      portal: 'datos.gob.ar',
      accessedAt: '2026-05-08',
    },
  ],
};

/** ---------------- Scenario 2 — Emisión, inflación y pobreza ---------------- */

const SCENARIO_MACRO: DemoScenario = {
  question:
    '¿Cómo se relacionaron la emisión monetaria del BCRA, la inflación y la pobreza en Argentina entre 2018 y 2024?',
  answer: `Entre **2018 y 2024**, las tres series muestran trayectorias paralelas pero con velocidades distintas:

- La **emisión M2** del BCRA creció un **1.080%** acumulado en pesos corrientes.
- La **inflación interanual** acompañó con un **1.220%** acumulado, levemente por encima de la emisión.
- La **pobreza por ingresos** subió del **25,4%** al **41,7%** según EPH del INDEC.

El gráfico normaliza las tres series a **base 100 = 2018** para que el lector compare velocidades, no niveles absolutos.`,
  chart: {
    type: 'line_chart',
    title: 'Emisión M2, IPC y pobreza por ingresos (base 100 = 2018)',
    xKey: 'anio',
    yKeys: ['Emisión M2', 'Inflación (IPC)', 'Pobreza por ingresos'],
    colors: ['#74ACDF', '#F6B40E', '#F87171'],
    data: [
      { anio: '2018', 'Emisión M2': 100,  'Inflación (IPC)': 100,  'Pobreza por ingresos': 100 },
      { anio: '2019', 'Emisión M2': 153,  'Inflación (IPC)': 156,  'Pobreza por ingresos': 135 },
      { anio: '2020', 'Emisión M2': 268,  'Inflación (IPC)': 213,  'Pobreza por ingresos': 167 },
      { anio: '2021', 'Emisión M2': 412,  'Inflación (IPC)': 318,  'Pobreza por ingresos': 152 },
      { anio: '2022', 'Emisión M2': 658,  'Inflación (IPC)': 506,  'Pobreza por ingresos': 154 },
      { anio: '2023', 'Emisión M2': 1080, 'Inflación (IPC)': 1220, 'Pobreza por ingresos': 162 },
      { anio: '2024', 'Emisión M2': 1180, 'Inflación (IPC)': 1320, 'Pobreza por ingresos': 164 },
    ],
  },
  sources: [
    {
      name: 'Agregados monetarios M2 — BCRA',
      url: 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp',
      portal: 'BCRA',
      accessedAt: '2026-05-08',
    },
    {
      name: 'IPC nacional — INDEC',
      url: 'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31',
      portal: 'INDEC',
      accessedAt: '2026-05-08',
    },
    {
      name: 'EPH · Incidencia de la pobreza e indigencia — INDEC',
      url: 'https://www.indec.gob.ar/indec/web/Nivel4-Tema-4-46-152',
      portal: 'INDEC',
      accessedAt: '2026-05-08',
    },
    {
      name: 'Series de tiempo macro — datos.gob.ar',
      url: 'https://datos.gob.ar/series',
      portal: 'datos.gob.ar',
      accessedAt: '2026-05-08',
    },
  ],
};

export const DEMO_SCENARIOS: DemoScenario[] = [SCENARIO_PATRIMONIO, SCENARIO_MACRO];

/** Back-compat singletons that pick the first scenario. */
export const DEMO_QUESTION = DEMO_SCENARIOS[0].question;
export const DEMO_ANSWER_MD = DEMO_SCENARIOS[0].answer;
export const DEMO_CHART = DEMO_SCENARIOS[0].chart;
export const DEMO_SOURCES = DEMO_SCENARIOS[0].sources;

/** Timing parameters for the demo player. */
export const DEMO_TIMING = {
  /** Pause before the user "starts typing" the question. */
  initialDelayMs: 600,
  /** Milliseconds per character while typing the user question. */
  typingSpeedMs: 28,
  /** Pause after the question is sent before the first phase starts. */
  preThinkingPauseMs: 350,
  /** Milliseconds per character while revealing the assistant answer. */
  answerRevealSpeedMs: 14,
  /** Pause between answer text complete and chart fade-in. */
  preChartPauseMs: 450,
  /** Pause between chart visible and sources fade-in. */
  preSourcesPauseMs: 800,
  /** Pause at the end before the loop restarts. */
  loopHoldMs: 6000,
};
