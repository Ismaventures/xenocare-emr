/**
 * Chunk Builder — converts EMR rows into semantically chunked embedding payloads.
 *
 * Goals:
 * - Preserve module-specific clinical/admin context
 * - Produce chunks around 100-500 tokens (target ~220)
 * - Carry strict metadata needed for cross-module semantic retrieval
 * - Redact non-essential PII patterns from free text
 */
import type {
  ChunkType,
  EmbeddableTable,
} from '../../modules/ai-assistant/types/ai.types';

export interface TableMeta {
  idField: string;
  dateField: string;
  encounterField?: string;
  chunkType: ChunkType;
  criticalFields: string[];
  metadataFields: string[];
}

export interface TextChunk {
  patientId: string;
  sourceTable: EmbeddableTable;
  sourceId: string;
  encounterId?: string;
  encounterDate?: string;
  chunkType: ChunkType;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
}

const DEFAULT_MIN_TOKENS = 100;
const DEFAULT_TARGET_TOKENS = 220;
const DEFAULT_MAX_TOKENS = 500;

const TABLE_META: Record<EmbeddableTable, TableMeta> = {
  consultations: {
    idField: 'consultation_id',
    dateField: 'consultation_date',
    encounterField: 'encounter_id',
    chunkType: 'consultation',
    criticalFields: [
      'complaints',
      'history_of_present_illness',
      'past_medical_history',
      'family_history',
      'social_history',
      'review_of_systems',
      'examination_findings',
      'physical_examination',
      'assessment',
      'plan',
      'treatment_plan',
      'diagnosis_text',
      'diagnosis',
      'differential_diagnosis',
      'recommendations',
      'clinical_notes',
      'follow_up_notes',
    ],
    metadataFields: [
      'status',
      'doctor_id',
      'clinic_id',
      'visit_id',
      'icd10_codes',
      'requires_nurse_followup',
    ],
  },
  procedures: {
    idField: 'id',
    dateField: 'scheduled_date',
    encounterField: 'encounter_id',
    chunkType: 'procedure',
    criticalFields: [
      'procedure_number',
      'procedure_name',
      'procedure_code',
      'indication',
      'pre_procedure_diagnosis',
      'post_procedure_diagnosis',
      'anesthesia_type',
      'procedure_notes',
      'findings',
      'technique_description',
      'complications',
      'post_op_instructions',
      'notes',
    ],
    metadataFields: [
      'status',
      'priority',
      'location',
      'room_number',
      'estimated_blood_loss_ml',
      'billable',
      'billed',
    ],
  },
  lab_requests: {
    idField: 'request_id',
    dateField: 'created_at',
    encounterField: 'encounter_id',
    chunkType: 'lab_report',
    criticalFields: [
      'clinical_notes',
      'result_notes',
      'interpretation',
      'result_value',
      'result_unit',
      'reference_range',
      'result_status',
      'diagnosis',
    ],
    metadataFields: [
      'status',
      'priority',
      'test_id',
      'ordered_by',
      'processed_by',
      'is_critical',
      'result_date',
    ],
  },
  lab_results: {
    idField: 'id',
    dateField: 'reported_at',
    encounterField: 'encounter_id',
    chunkType: 'lab_result',
    criticalFields: [
      'result_value',
      'unit',
      'reference_range',
      'comments',
      'interpretation',
      'methodology',
      'sample_type',
      'structured_result',
    ],
    metadataFields: [
      'workflow_status',
      'is_abnormal',
      'is_critical',
      'request_id',
      'test_id',
      'collected_at',
      'reported_at',
    ],
  },
  prescriptions: {
    idField: 'prescription_id',
    dateField: 'created_at',
    encounterField: 'encounter_id',
    chunkType: 'prescription',
    criticalFields: [
      'drug_name',
      'dosage',
      'frequency',
      'duration',
      'route',
      'instructions',
      'clinical_notes',
      'notes',
      'diagnosis',
    ],
    metadataFields: [
      'status',
      'quantity_prescribed',
      'quantity_dispensed',
      'doctor_id',
      'visit_id',
      'payer_type',
      'nhis_approval_status',
      'billing_release_status',
      'execution_status',
      'allergy_checked',
      'drug_interaction_checked',
    ],
  },
  dispense_records: {
    idField: 'dispense_id',
    dateField: 'dispensed_at',
    encounterField: 'encounter_id',
    chunkType: 'dispensing',
    criticalFields: [
      'prescription_id',
      'quantity_dispensed',
      'substitution_reason',
      'notes',
    ],
    metadataFields: [
      'status',
      'drug_id',
      'batch_id',
      'pharmacist_id',
      'verified_by',
      'is_substitution',
      'nhis_claim_id',
      'nhis_amount',
      'patient_copay',
      'counseling_provided',
    ],
  },
  radiology_requests: {
    idField: 'request_id',
    dateField: 'created_at',
    encounterField: 'encounter_id',
    chunkType: 'radiology',
    criticalFields: [
      'imaging_type',
      'body_part',
      'clinical_indication',
      'clinical_history',
      'findings',
      'impression',
      'report',
      'diagnosis',
    ],
    metadataFields: [
      'status',
      'priority',
      'ordered_by',
      'scheduled_date',
      'performed_at',
      'payer_type',
      'nhis_approval_status',
    ],
  },
  scan_results: {
    idField: 'id',
    dateField: 'report_date',
    encounterField: 'encounter_id',
    chunkType: 'imaging_report',
    criticalFields: [
      'findings',
      'impression',
      'recommendation',
      'image_urls',
      'dicom_url',
    ],
    metadataFields: [
      'request_id',
      'imaging_id',
      'radiologist_id',
      'created_at',
      'updated_at',
    ],
  },
  visits: {
    idField: 'id',
    dateField: 'encounter_date',
    encounterField: 'id',
    chunkType: 'encounter_summary',
    criticalFields: [
      'visit_id',
      'encounter_number',
      'visit_type',
      'chief_complaint',
      'current_stage',
      'discharge_notes',
      'referral_reason',
      'referral_clinical_notes',
    ],
    metadataFields: [
      'status',
      'priority',
      'payment_category',
      'encounter_category',
      'ward_location',
      'bed_number',
      'clinic_id',
      'attending_doctor_id',
      'payer_type',
      'nhis_verification_status',
    ],
  },
  vitals: {
    idField: 'id',
    dateField: 'date_recorded',
    encounterField: 'encounter_id',
    chunkType: 'vital_signs',
    criticalFields: [
      'temperature',
      'blood_pressure',
      'blood_pressure_systolic',
      'blood_pressure_diastolic',
      'pulse',
      'respiratory_rate',
      'oxygen_saturation',
      'weight',
      'height',
      'bmi',
      'blood_glucose',
      'pain_level',
      'notes',
    ],
    metadataFields: [
      'is_critical',
      'nurse_id',
      'schedule_id',
      'was_overdue',
      'minutes_overdue',
    ],
  },
  billing_orders: {
    idField: 'id',
    dateField: 'created_at',
    encounterField: 'encounter_id',
    chunkType: 'billing',
    criticalFields: [
      'order_number',
      'source_module',
      'total_amount',
      'discount_amount',
      'tax_amount',
      'net_amount',
      'paid_amount',
      'balance_amount',
    ],
    metadataFields: [
      'status',
      'payment_method',
      'nhis_covered',
      'nhis_percentage',
      'nhis_payable',
      'patient_payable',
      'visit_id',
      'created_by',
    ],
  },
  billing_items: {
    idField: 'id',
    dateField: 'created_at',
    chunkType: 'billing_item',
    criticalFields: [
      'item_name',
      'service_name',
      'item_type',
      'quantity',
      'unit_price',
      'total_price',
      'gross_amount',
      'patient_payable',
      'nhis_payable',
      'rejection_reason',
    ],
    metadataFields: [
      'billing_order_id',
      'item_id',
      'status',
      'verification_status',
      'nhis_covered',
      'nhis_percentage',
      'stock_validated',
      'service_reference_id',
    ],
  },
  referrals: {
    idField: 'id',
    dateField: 'created_at',
    chunkType: 'referral',
    criticalFields: [
      'referral_number',
      'referral_type',
      'reason_for_referral',
      'clinical_summary',
    ],
    metadataFields: [
      'priority',
      'status',
      'visit_id',
      'source_department_id',
      'target_department_id',
      'referring_physician_id',
      'receiving_physician_id',
    ],
  },
  admissions: {
    idField: 'id',
    dateField: 'admission_date',
    encounterField: 'encounter_id',
    chunkType: 'admission',
    criticalFields: [
      'admission_number',
      'admitting_diagnosis',
      'admitting_diagnosis_icd10',
      'chief_complaint',
      'reason_for_admission',
      'secondary_diagnoses',
      'discharge_diagnosis',
      'discharge_summary',
      'discharge_instructions',
      'notes',
    ],
    metadataFields: [
      'admission_type',
      'admission_status',
      'acuity_level',
      'code_status',
      'isolation_required',
      'discharge_type',
      'actual_discharge_date',
      'admitting_doctor_id',
      'attending_physician_id',
      'primary_nurse_id',
    ],
  },
  nursing_notes: {
    idField: 'id',
    dateField: 'created_at',
    encounterField: 'encounter_id',
    chunkType: 'nursing_note',
    criticalFields: [
      'title',
      'content',
      'patient_condition',
      'pain_level',
      'interventions_performed',
      'patient_response',
      'follow_up_notes',
    ],
    metadataFields: [
      'note_type',
      'shift',
      'is_critical',
      'requires_doctor_review',
      'doctor_reviewed_by',
      'consultation_id',
    ],
  },
  daily_progress_notes: {
    idField: 'progress_id',
    dateField: 'note_date',
    encounterField: 'encounter_id',
    chunkType: 'progress_note',
    criticalFields: [
      'subjective',
      'objective',
      'assessment',
      'plan',
      'nursing_summary',
      'vital_signs_summary',
      'io_notes',
      'patient_condition',
    ],
    metadataFields: [
      'alert_level',
      'oral_intake_ml',
      'iv_intake_ml',
      'urine_output_ml',
      'other_output_ml',
      'recorded_by',
    ],
  },
  ward_round_notes: {
    idField: 'id',
    dateField: 'round_date',
    encounterField: 'encounter_id',
    chunkType: 'ward_round',
    criticalFields: [
      'round_type',
      'subjective_notes',
      'objective_findings',
      'assessment',
      'plan',
      'nursing_instructions',
      'patient_condition',
      'discharge_planning_notes',
      'vital_signs',
    ],
    metadataFields: [
      'admission_id',
      'attending_physician_id',
      'estimated_discharge_date',
      'participants',
    ],
  },
};

function sanitizeValue(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b(?:\+?\d[\d\s()\-]{7,}\d)\b/g, '[redacted-phone]')
    .replace(
      /\b(?:NHIS|NIN|BVN|Passport)\s*[:#-]?\s*[A-Z0-9\-]{4,}\b/gi,
      '[redacted-id]',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function stringifyFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyFieldValue(item))
      .filter(Boolean)
      .join('; ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function approxTokenCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function splitLargeBlockBySentence(text: string, maxTokens: number): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return splitByWordWindow(text, maxTokens);
  }

  const out: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = approxTokenCount(sentence);
    if (sentenceTokens >= maxTokens) {
      if (current.length > 0) {
        out.push(current.join(' ').trim());
        current = [];
        currentTokens = 0;
      }
      out.push(...splitByWordWindow(sentence, maxTokens));
      continue;
    }

    if (currentTokens + sentenceTokens > maxTokens) {
      out.push(current.join(' ').trim());
      current = [sentence];
      currentTokens = sentenceTokens;
      continue;
    }

    current.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (current.length > 0) {
    out.push(current.join(' ').trim());
  }

  return out.filter(Boolean);
}

function splitByWordWindow(text: string, maxTokens: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxTokens) return [text.trim()];

  const chunks: string[] = [];
  const stride = Math.max(60, Math.floor(maxTokens * 0.85));
  for (let i = 0; i < words.length; i += stride) {
    chunks.push(words.slice(i, i + maxTokens).join(' '));
    if (i + maxTokens >= words.length) break;
  }
  return chunks;
}

function splitSemantically(
  text: string,
  minTokens = DEFAULT_MIN_TOKENS,
  targetTokens = DEFAULT_TARGET_TOKENS,
  maxTokens = DEFAULT_MAX_TOKENS,
): string[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  const output: string[] = [];
  let current = '';
  let currentTokens = 0;

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) output.push(trimmed);
    current = '';
    currentTokens = 0;
  };

  for (const paragraph of paragraphs) {
    const paragraphTokens = approxTokenCount(paragraph);

    if (paragraphTokens > maxTokens) {
      if (currentTokens >= minTokens) {
        pushCurrent();
      }
      const splitParagraphs = splitLargeBlockBySentence(paragraph, maxTokens);
      for (const block of splitParagraphs) {
        const blockTokens = approxTokenCount(block);
        if (currentTokens > 0 && currentTokens + blockTokens > maxTokens) {
          pushCurrent();
        }
        if (blockTokens >= targetTokens || currentTokens === 0) {
          current = `${current}${current ? '\n\n' : ''}${block}`;
          currentTokens += blockTokens;
          if (currentTokens >= targetTokens) {
            pushCurrent();
          }
        } else {
          current = `${current}${current ? '\n\n' : ''}${block}`;
          currentTokens += blockTokens;
        }
      }
      continue;
    }

    if (currentTokens + paragraphTokens > maxTokens) {
      pushCurrent();
    }

    current = `${current}${current ? '\n\n' : ''}${paragraph}`;
    currentTokens += paragraphTokens;

    if (currentTokens >= targetTokens) {
      pushCurrent();
    }
  }

  if (currentTokens > 0) {
    pushCurrent();
  }

  const filtered = output.filter(Boolean);
  if (filtered.length <= 1) return filtered;

  const merged: string[] = [];
  for (const piece of filtered) {
    const pieceTokens = approxTokenCount(piece);

    if (merged.length === 0) {
      merged.push(piece);
      continue;
    }

    const previous = merged[merged.length - 1];
    const previousTokens = approxTokenCount(previous);
    const combinedTokens = previousTokens + pieceTokens;

    if (previousTokens < minTokens && combinedTokens <= maxTokens) {
      merged[merged.length - 1] = `${previous}\n\n${piece}`;
    } else {
      merged.push(piece);
    }
  }

  return merged;
}

function compactMetadata(
  row: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  for (const field of fields) {
    const value = row[field];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      metadata[field] = value;
    }
  }
  return metadata;
}

function isNoiseField(field: string): boolean {
  const lower = field.toLowerCase();
  return (
    lower === 'id' ||
    lower === 'patient_id' ||
    lower === 'created_by' ||
    lower === 'updated_by' ||
    lower === 'last_modified_by' ||
    lower === 'idempotency_key' ||
    lower === 'idempotency_hash' ||
    lower === 'idempotency_created_at' ||
    lower === 'version'
  );
}

function buildBaseNarrative(
  table: EmbeddableTable,
  row: Record<string, unknown>,
  patientId: string,
  meta: TableMeta,
): {
  narrative: string;
  sourceId: string;
  encounterId?: string;
  recordDate?: string;
  metadata: Record<string, unknown>;
} {
  const sourceId = String(row[meta.idField] ?? '').trim();
  if (!sourceId) {
    throw new Error(`Missing source id for table ${table}`);
  }

  const encounterIdRaw = meta.encounterField
    ? row[meta.encounterField]
    : undefined;
  const encounterId = encounterIdRaw ? String(encounterIdRaw) : undefined;
  const recordDateRaw = row[meta.dateField];
  const recordDate = recordDateRaw
    ? new Date(String(recordDateRaw)).toISOString()
    : undefined;

  const lines: string[] = [
    `module: ${table}`,
    `patient_id: ${patientId}`,
    `source_id: ${sourceId}`,
    encounterId ? `encounter_id: ${encounterId}` : '',
    recordDate ? `record_date: ${recordDate}` : '',
  ].filter(Boolean);

  const detailLines: string[] = [];
  const includedFields = new Set<string>(meta.criticalFields);

  for (const field of meta.criticalFields) {
    const raw = stringifyFieldValue(row[field]);
    const sanitized = sanitizeValue(raw);
    if (sanitized) {
      detailLines.push(`${field}: ${sanitized}`);
    }
  }

  // Include additional clinically relevant fields not explicitly listed above.
  Object.entries(row).forEach(([field, value]) => {
    if (includedFields.has(field)) return;
    if (meta.metadataFields.includes(field)) return;
    if (
      field === meta.idField ||
      field === meta.dateField ||
      field === meta.encounterField
    )
      return;
    if (isNoiseField(field)) return;

    const raw = stringifyFieldValue(value);
    const sanitized = sanitizeValue(raw);
    if (!sanitized) return;

    detailLines.push(`${field}: ${sanitized}`);
  });

  const metadata = compactMetadata(row, meta.metadataFields);
  metadata.source_created_at = row.created_at || null;
  metadata.source_updated_at =
    row.updated_at || row.created_at || recordDate || null;
  metadata.source_record_date = recordDate || null;
  metadata.patient_id = patientId;
  if (encounterId) {
    metadata.encounter_id = encounterId;
  }
  return {
    narrative: `${lines.join('\n')}\n\n${detailLines.join('\n')}`.trim(),
    sourceId,
    encounterId,
    recordDate,
    metadata,
  };
}

export function getEmbeddableTables(): EmbeddableTable[] {
  return Object.keys(TABLE_META) as EmbeddableTable[];
}

export function getTableMeta(table: EmbeddableTable): TableMeta {
  return TABLE_META[table];
}

export function buildChunk(
  table: EmbeddableTable,
  row: Record<string, unknown>,
  patientId: string,
): TextChunk[] {
  const meta = getTableMeta(table);
  const { narrative, sourceId, encounterId, recordDate, metadata } =
    buildBaseNarrative(table, row, patientId, meta);

  const semanticChunks = splitSemantically(narrative);
  if (semanticChunks.length === 0) return [];

  return semanticChunks.map((content, index) => ({
    patientId,
    sourceTable: table,
    sourceId,
    encounterId,
    encounterDate: recordDate,
    chunkType: meta.chunkType,
    chunkIndex: index,
    metadata: {
      ...metadata,
      chunk_index: index,
      chunk_count: semanticChunks.length,
      source_table: table,
    },
    content,
  }));
}

export function buildChunks(
  table: EmbeddableTable,
  rows: Record<string, unknown>[],
  patientId: string,
): TextChunk[] {
  const chunks: TextChunk[] = [];

  for (const row of rows) {
    try {
      chunks.push(...buildChunk(table, row, patientId));
    } catch {
      // Skip malformed records; keep sync resilient.
    }
  }

  return chunks;
}
