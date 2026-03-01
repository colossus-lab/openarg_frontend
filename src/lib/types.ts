// ============================================================
// OpenArg — Frontend Type Definitions
// Types used by UI components for the chat pipeline
// ============================================================

/** The phases of the agent pipeline */
export type AgentPhase = 'planning' | 'data_collection' | 'analysis' | 'synthesis';

/** Chart data for visualization */
export interface ChartData {
  type: 'line_chart' | 'bar_chart' | 'pie_chart';
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
}

/** Source attribution for transparency */
export interface SourceAttribution {
  name: string;
  url: string;
  portal: string;
  accessedAt: string;
}

/** A message in the conversation */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  phase?: AgentPhase;
  chartData?: ChartData[];
  sources?: SourceAttribution[];
}

/** Streaming event sent from the API route */
export interface StreamEvent {
  type: 'phase_change' | 'thinking' | 'content' | 'chart' | 'sources' | 'error' | 'done';
  data: unknown;
}
