'use client';

import { useEffect, useReducer } from 'react';
import FadeIn from '@/components/reactbits/FadeIn';
import DataChart from '@/components/DataChart';
import { DEMO_SCENARIOS } from '@/lib/demo-script';

type Stage =
  | 'idle'
  | 'typing-question'
  | 'show-answer'
  | 'show-chart'
  | 'show-sources'
  | 'hold'
  | 'paused';

interface State {
  stage: Stage;
  typed: string;
  paused: boolean;
  /** Index into DEMO_SCENARIOS */
  scenarioIdx: number;
}

type Action =
  | { type: 'reset' }
  | { type: 'tick'; char: string }
  | { type: 'next' }
  | { type: 'toggle-pause' };

const initial: State = { stage: 'idle', typed: '', paused: false, scenarioIdx: 0 };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'reset': {
      // Rotate to next scenario on every loop
      const nextIdx = (s.scenarioIdx + 1) % DEMO_SCENARIOS.length;
      return { stage: 'idle', typed: '', paused: s.paused, scenarioIdx: nextIdx };
    }
    case 'tick':
      return { ...s, stage: 'typing-question', typed: s.typed + a.char };
    case 'next': {
      const order: Stage[] = ['typing-question', 'show-answer', 'show-chart', 'show-sources', 'hold'];
      const idx = order.indexOf(s.stage);
      return { ...s, stage: order[Math.min(idx + 1, order.length - 1)] };
    }
    case 'toggle-pause':
      return { ...s, paused: !s.paused };
    default:
      return s;
  }
}

const TYPING_MS = 30;
const ANSWER_HOLD_MS = 1800;
const CHART_HOLD_MS = 1600;
const SOURCES_HOLD_MS = 1800;
const LOOP_HOLD_MS = 9000;

function renderAnswer(md: string) {
  const lines = md.split('\n').filter(Boolean);
  return lines.map((line, i) => {
    const isBullet = line.trimStart().startsWith('- ');
    const content = isBullet ? line.trimStart().slice(2) : line;
    const parts: React.ReactNode[] = [];
    const regex = /\*\*([^*]+)\*\*/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIdx) parts.push(content.slice(lastIdx, match.index));
      parts.push(<strong key={`b-${i}-${key++}`}>{match[1]}</strong>);
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < content.length) parts.push(content.slice(lastIdx));
    // Attach superscript markers (footnote effect) to the first 3 bullets
    if (isBullet && i >= 1 && i <= 3) parts.push(<sup key={`sup-${i}`}>[{i}]</sup>);
    if (isBullet) {
      return (
        <p key={i} className="ed-transcript-bullet">
          <span>{parts}</span>
        </p>
      );
    }
    return <p key={i}>{parts}</p>;
  });
}

export default function TranscriptDemo() {
  const [state, dispatch] = useReducer(reducer, initial);
  const scenario = DEMO_SCENARIOS[state.scenarioIdx];

  useEffect(() => {
    if (state.paused) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    switch (state.stage) {
      case 'idle':
        t = setTimeout(() => dispatch({ type: 'tick', char: scenario.question[0] ?? '' }), 600);
        break;
      case 'typing-question':
        if (state.typed.length < scenario.question.length) {
          const next = scenario.question[state.typed.length];
          const jitter = Math.random() * 20;
          t = setTimeout(() => dispatch({ type: 'tick', char: next }), TYPING_MS + jitter);
        } else {
          t = setTimeout(() => dispatch({ type: 'next' }), 700);
        }
        break;
      case 'show-answer':
        t = setTimeout(() => dispatch({ type: 'next' }), ANSWER_HOLD_MS);
        break;
      case 'show-chart':
        t = setTimeout(() => dispatch({ type: 'next' }), CHART_HOLD_MS);
        break;
      case 'show-sources':
        t = setTimeout(() => dispatch({ type: 'next' }), SOURCES_HOLD_MS + LOOP_HOLD_MS);
        break;
      case 'hold':
        t = setTimeout(() => dispatch({ type: 'reset' }), 800);
        break;
    }
    return () => t && clearTimeout(t);
  }, [state.stage, state.typed, state.paused, scenario.question]);

  const showAnswer = ['show-answer', 'show-chart', 'show-sources', 'hold'].includes(state.stage);
  const showChart = ['show-chart', 'show-sources', 'hold'].includes(state.stage);
  const showSources = ['show-sources', 'hold'].includes(state.stage);
  const isTyping = state.stage === 'typing-question';

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

  return (
    <section className="ed-section" id="demo">
      <div className="ed-container">
        <FadeIn direction="up" distance={8} duration={0.5}>
          <div className="ed-section-head">
            <p className="ed-eyebrow">
              <span className="ed-eyebrow-num">II.</span>
              <span>Una pregunta</span>
            </p>
            <h2 className="ed-section-title">
              Ciudadanos asistidos por <em>inteligencia artificial.</em>
            </h2>
            <p className="ed-lead">
              Lo que sigue es una transcripción de una consulta sobre datos públicos —
              con su respuesta, su gráfico, y la lista de fuentes citadas. El loop
              alterna entre preguntas reales y se reinicia solo.
            </p>
          </div>
        </FadeIn>

        <FadeIn direction="up" distance={12} delay={0.1} duration={0.6}>
          <article className="ed-transcript" key={state.scenarioIdx}>
            <div className="ed-transcript-meta">
              <span>
                Transcripción · {dateStr} · 14:32 ART ·{' '}
                <span style={{ color: 'var(--ed-vermilion)' }}>
                  {String(state.scenarioIdx + 1).padStart(2, '0')} / {String(DEMO_SCENARIOS.length).padStart(2, '0')}
                </span>
              </span>
              <span className="ed-transcript-meta-controls">
                <button type="button" onClick={() => dispatch({ type: 'toggle-pause' })}>
                  {state.paused ? 'Reanudar' : 'Pausar'}
                </button>
                <a href="/chat" className="ed-textlink">
                  <span className="ed-textlink-arrow">→</span>
                  <span>Probar en vivo</span>
                </a>
              </span>
            </div>

            <div className="ed-transcript-question-col">
              <p className="ed-transcript-label">La pregunta</p>
              <p className="ed-transcript-question">
                {state.typed || ' '}
                {isTyping && <span className="ed-caret" aria-hidden="true" />}
              </p>
            </div>

            <div className="ed-transcript-answer-col">
              {showAnswer ? (
                <>
                  <p className="ed-transcript-label">La respuesta</p>
                  <div className="ed-transcript-answer">{renderAnswer(scenario.answer)}</div>
                </>
              ) : (
                <p className="ed-meta-mono" style={{ opacity: 0.5 }}>
                  Esperando…
                </p>
              )}

              {showChart && (
                <FadeIn direction="up" distance={8} duration={0.5}>
                  <figure className="ed-transcript-chart">
                    <DataChart chart={scenario.chart} />
                    <figcaption className="ed-transcript-chart-caption">
                      Fig. {state.scenarioIdx + 1} — {scenario.chart.title}.
                      Elaboración propia · datos ilustrativos.
                    </figcaption>
                  </figure>
                </FadeIn>
              )}

              {showSources && (
                <FadeIn direction="up" distance={8} duration={0.5}>
                  <div className="ed-transcript-sources">
                    <p className="ed-transcript-sources-head">Fuentes citadas</p>
                    <ol>
                      {scenario.sources.map((s) => (
                        <li key={s.url}>
                          <strong>{s.portal}</strong> — {s.name}.{' '}
                          <span className="ed-meta-mono">
                            URL: {s.url}. Consulta: {s.accessedAt}.
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="ed-transcript-disclaimer">
                      * Datos ilustrativos. La transcripción es una simulación con
                      fines de demostración; los números no corresponden a un cruce real.
                    </p>
                  </div>
                </FadeIn>
              )}
            </div>
          </article>
        </FadeIn>
      </div>
    </section>
  );
}
