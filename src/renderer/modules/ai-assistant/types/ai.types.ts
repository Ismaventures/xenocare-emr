/**
 * AI Clinical Assistant — TypeScript Types
 *
 * Shared type definitions for the AI module across main process,
 * renderer, and IPC boundaries.
 */

// =============================================================================
// Provider Configuration
// =============================================================================

export type AIProvider = 'openai' | 'gemini' | 'groq';

export interface AIConfig {
  provider: AIProvider;
  // OpenAI
  openaiApiKey?: string;
  openaiEmbeddingModel: string;
  openaiChatModel: string;
  // Gemini
  geminiApiKey?: string;
  geminiChatModel: string;
  geminiEmbeddingModel: string;
  // Groq
  groqApiKey?: string;
  groqChatModel: string;
  // Search tuning
  fulltextWeight: number;
  vectorWeight: number;
  similarityThreshold: number;
  maxContextTokens: number;
}

// =============================================================================
// Embedding Types
// =============================================================================

/** Tables that produce narrative embeddings */
export type EmbeddableTable =
  | 'consultations'
  | 'nursing_notes'
  | 'ward_round_notes'
  | 'daily_progress_notes'
  | 'radiology_requests'
  | 'scan_results'
  | 'lab_requests'
  | 'lab_results'
  | 'prescriptions'
  | 'dispense_records'
  | 'procedures'
  | 'vitals'
  | 'visits'
  | 'billing_orders'
  | 'billing_items'
  | 'referrals'
  | 'admissions';

export type ChunkType =
  | 'consultation'
  | 'nursing_note'
  | 'ward_round'
  | 'progress_note'
  | 'radiology'
  | 'imaging_report'
  | 'lab_result'
  | 'lab_report'
  | 'prescription'
  | 'dispensing'
  | 'procedure'
  | 'vital_signs'
  | 'encounter_summary'
  | 'billing'
  | 'billing_item'
  | 'referral'
  | 'admission'
  | 'discharge'
  | 'soap_note'
  | 'nursing';

export interface AIImageAttachment {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface EmbeddingRecord {
  id: string;
  patient_id: string;
  source_table: EmbeddableTable;
  source_id: string;
  chunk_index?: number;
  encounter_id?: string;
  chunk_text: string;
  chunk_type: ChunkType;
  embedding: number[];
  record_date: string;
  metadata: Record<string, unknown>;
}

// =============================================================================
// Search Types
// =============================================================================

export interface SearchResult {
  source_table: string;
  source_id: string;
  encounter_id: string | null;
  record_date: string;
  content_snippet: string;
  combined_score: number;
}

export interface FulltextResult {
  source_table: string;
  source_id: string;
  encounter_id: string | null;
  record_date: string;
  snippet: string;
  rank: number;
}

export interface VectorResult {
  source_table: string;
  source_id: string;
  encounter_id: string | null;
  record_date: string;
  chunk_text: string;
  chunk_type: string;
  similarity: number;
}

// =============================================================================
// AI Query & Response Types
// =============================================================================

export type AIRequestType =
  | 'query'
  | 'draft'
  | 'differential'
  | 'coding'
  | 'completeness'
  | 'trend'
  | 'timeline'
  | 'encounter_brief'
  | 'medication_intel'
  | 'claim_readiness';

export type AIAssistantScope = 'clinical' | 'pharmacy';

export interface AIQueryRequest {
  patientId?: string;
  encounterId?: string;
  query: string;
  imageAttachments?: AIImageAttachment[];
  conversationHistory?: Array<{
    query: string;
    answer: string;
    timestamp?: string;
  }>;
  requestType?: AIRequestType;
  assistantScope?: AIAssistantScope;
  /** Fields used by the IPC handler */
  facilityId?: string;
  userId?: string;
  searchType?: 'hybrid' | 'fulltext' | 'vector';
  maxResults?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface AISourceCitation {
  source_table: string;
  source_id: string;
  encounter_id?: string;
  record_date: string;
  snippet?: string;
}

export interface AIResponse {
  /** The primary answer text */
  answer: string;
  /** Structured sections (parsed from LLM output) */
  sections?: {
    directAnswer?: string;
    possibleConditions?: string;
    recommendedInvestigations?: string;
    supportingEvidence?: string;
    safetyAlerts?: string;
    missingData?: string;
    disclaimer?: string;
  };
  /** Source records the AI used */
  citations?: AISourceCitation[];
  /** Raw source records from search (returned by IPC handler) */
  sources?: Array<{
    source_table?: string;
    source_id?: string;
    encounter_date?: string;
    content?: string;
    similarity?: number;
  }>;
  /** Confidence level */
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Model that generated the response */
  model?: string;
  /** Search type used */
  searchType?: string;
  /** Number of records found */
  resultCount?: number;
  /** Response latency in ms */
  responseTimeMs?: number;
  /** Token usage */
  tokensUsed?: number | { input: number; output: number };
}

// =============================================================================
// Clinical Note Draft Types
// =============================================================================

export type NoteFormat = 'soap' | 'assessment_plan' | 'followup' | 'discharge';

export interface NoteDraftRequest {
  patientId: string;
  encounterId: string;
  format: NoteFormat;
}

export interface NoteDraftResponse {
  draft: string;
  format: NoteFormat;
  /** Fields the draft was based on */
  basedOn: AISourceCitation[];
  model: string;
}

// =============================================================================
// Trend Analysis Types
// =============================================================================

export type TrendDirection = 'rising' | 'falling' | 'stable' | 'fluctuating';

export interface TrendDataPoint {
  date: string;
  value: number;
  unit: string;
  is_critical?: boolean;
  is_abnormal?: boolean;
}

export interface TrendInsight {
  metric?: string; // e.g., 'Blood Pressure Systolic', 'Creatinine', 'HbA1c'
  parameter?: string; // human-readable name (e.g., 'Systolic BP')
  direction: TrendDirection;
  currentValue?: number;
  previousValue?: number;
  unit?: string;
  percentChange?: number;
  dataPoints: number | TrendDataPoint[];
  dateRange?: { from: string; to: string };
  severity?: 'normal' | 'warning' | 'critical';
  normalRange?: { low: number; high: number };
  summary?: string;
  clinicalNote?: string; // AI-generated interpretation
}

// =============================================================================
// Documentation Completeness Types
// =============================================================================

export interface CompletenessField {
  field: string;
  label: string;
  present: boolean;
  required: boolean;
}

export interface CompletenessScore {
  score: number; // 0-100
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  totalFields?: number;
  presentFields?: number | string[];
  missingFields?: string[];
  missingRequired?: CompletenessField[];
  missingOptional?: CompletenessField[];
  allFields?: CompletenessField[];
  suggestions?: string[];
}

// =============================================================================
// ICD Coding Suggestion Types
// =============================================================================

export interface CodingSuggestion {
  code: string; // e.g., 'E11.40'
  description: string; // e.g., 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified'
  confidence: 'high' | 'medium' | 'low' | 'HIGH' | 'MEDIUM' | 'LOW';
  basis?: string; // Which data supported this suggestion
  reasoning?: string; // Why this code was suggested
}

// =============================================================================
// Claim Readiness Types
// =============================================================================

export type ClaimType = 'nhis' | 'private' | 'ffs';

export interface ClaimGap {
  field: string;
  label: string;
  severity: 'critical' | 'warning';
  message: string;
}

export interface ClaimReadinessResult {
  claimType: ClaimType;
  ready: boolean;
  score: number; // 0-100
  gaps: ClaimGap[];
}

// =============================================================================
// Audit Log Types
// =============================================================================

export interface AIAuditLogEntry {
  user_id: string;
  staff_name: string;
  patient_id: string;
  encounter_id?: string;
  request_type: AIRequestType;
  query_text: string;
  response_summary: string;
  sources_used: AISourceCitation[];
  model_used: string;
  response_time_ms: number;
  tokens_used: { input: number; output: number };
}

// =============================================================================
// IPC Channel Names
// =============================================================================

export const AI_IPC_CHANNELS = {
  QUERY: 'ai:query',
  SEARCH: 'ai:search',
  DRAFT_NOTE: 'ai:draftNote',
  EMBED_PATIENT: 'ai:embedPatient',
  COMPLETENESS: 'ai:completeness',
  CODING: 'ai:coding',
  CLAIM_READINESS: 'ai:claimReadiness',
  TRENDS: 'ai:trends',
  TIMELINE: 'ai:timeline',
  ENCOUNTER_BRIEF: 'ai:encounterBrief',
} as const;
