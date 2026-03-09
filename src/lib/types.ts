// ============================================================
// OpenArg — Frontend Type Definitions
// Types used by UI components for the chat pipeline
// ============================================================

/** The phases of the agent pipeline */
export type AgentPhase = 'planning' | 'data_collection' | 'analysis' | 'synthesis';

/** Chart data for visualization */
export interface ChartData {
  type: 'line_chart' | 'bar_chart' | 'pie_chart' | 'heatmap' | 'scatter';
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  /** For heatmaps: the key containing the fill/intensity value */
  fillKey?: string;
}

/** Source attribution for transparency */
export interface SourceAttribution {
  name: string;
  url: string;
  portal: string;
  accessedAt: string;
}

/** Base fields shared by all structured documents */
export interface DocumentRecordBase {
  doc_type: string;
}

/** DDJJ patrimonial declaration */
export interface DDJJDocumentRecord extends DocumentRecordBase {
  doc_type: 'ddjj';
  cuit: string;
  nombre: string;
  cargo: string;
  organismo: string;
  anio_declaracion: string;
  tipo_declaracion: string;
  bienes_cierre: number;
  deudas_cierre: number;
  patrimonio_cierre: number;
  variacion_patrimonial: number;
  ingresos_trabajo_neto: number;
  gastos_personales: number;
  cantidad_bienes: number;
  bienes_detalle: { tipo: string; descripcion: string; importe: number; titularidad: string }[];
  resumen_bienes: Record<string, number>;
}

/** Discriminated union — extend with new doc types here */
export type DocumentRecord = DDJJDocumentRecord;

/** A message in the conversation */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  phase?: AgentPhase;
  chartData?: ChartData[];
  sources?: SourceAttribution[];
  documents?: DocumentRecord[];
  feedback?: 'up' | 'down' | null;
  feedbackComment?: string | null;
  /** Backend message ID (for feedback submission) */
  backendMessageId?: string | null;
  /** Backend conversation ID (for feedback submission) */
  conversationId?: string | null;
}

/** Streaming event sent from the API route */
export interface StreamEvent {
  type: 'phase_change' | 'thinking' | 'content' | 'chart' | 'sources' | 'documents' | 'conversation_saved' | 'assistant_message_saved' | 'error' | 'done';
  data: unknown;
}
