// ============================================================
// OpenArg — Agent System Types
// Multi-agent orchestration inspired by Agentic-Reasoning paper
// ============================================================

/** The phases of the agent pipeline */
export type AgentPhase = 'planning' | 'data_collection' | 'analysis' | 'synthesis';

/** A single step in the Planner's execution plan */
export interface PlanStep {
  id: string;
  action: 'search_ckan' | 'query_series' | 'query_georef' | 'query_ddjj' | 'query_argentina_datos' | 'analyze' | 'compare';
  description: string;
  params: Record<string, unknown>;
  dependsOn?: string[];
}

/** The structured plan output from the Planner Agent */
export interface ExecutionPlan {
  query: string;
  intent: string;
  steps: PlanStep[];
  suggestedVisualizations: ('line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'map')[];
}

/** Normalized data result from any connector */
export interface DataResult {
  source: string;
  portalName: string;
  portalUrl: string;
  datasetTitle: string;
  format: 'json' | 'csv' | 'time_series' | 'geo';
  records: Record<string, unknown>[];
  metadata: {
    totalRecords: number;
    fetchedAt: string;
    description?: string;
    lastUpdated?: string;
    units?: string;
  };
}

/** The accumulated data from all connectors for a single turn */
export interface CollectedData {
  results: DataResult[];
  errors: { step: string; error: string }[];
}

/** Analysis output from the Analysis Agent */
export interface AnalysisResult {
  markdown: string;
  thinking: string;
  chartData?: ChartData[];
  sources: SourceAttribution[];
}

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

/** Memory context maintained across conversation turns */
export interface MemoryContext {
  turnNumber: number;
  summaries: string[];
  keyFindings: string[];
  datasetsUsed: string[];
  pendingQuestions: string[];
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

/** Streaming event sent to the frontend */
export interface StreamEvent {
  type: 'phase_change' | 'thinking' | 'content' | 'chart' | 'sources' | 'error' | 'done';
  data: unknown;
}

/** The orchestrator's internal state */
export interface OrchestratorState {
  currentPhase: AgentPhase;
  plan: ExecutionPlan | null;
  collectedData: CollectedData | null;
  analysis: AnalysisResult | null;
  memory: MemoryContext;
  conversationHistory: ChatMessage[];
}
