import {
  RadiologyRequest,
  ImagingCatalogue,
  ScanResult,
  ScanImage,
  Patient,
  Staff,
} from '../../../types/database.types';

// =============================================================================
// Enums
// =============================================================================

// Extended status that includes application-level states
// Note: Database has 'In Progress' (with space) to match the application display
export const RADIOLOGY_REQUEST_STATUS = [
  'Pending',
  'Ordered',
  'Scheduled',
  'In Progress',
  'Imaging Completed',
  'Awaiting Report',
  'Preliminary Report',
  'Final Report',
  'Completed',
  'Reported',
  'Cancelled',
  'Accepted',
  'Rejected',
] as const;

export type RadiologyRequestStatus = (typeof RADIOLOGY_REQUEST_STATUS)[number];

export const IMAGING_MODALITIES = [
  'X-Ray',
  'Ultrasound',
  'CT',
  'MRI',
  'Mammography',
  'Fluoroscopy',
  'Other',
] as const;

export type ImagingModality = (typeof IMAGING_MODALITIES)[number];

// Scan categories by modality
export const SCAN_CATEGORIES = {
  'X-Ray': [
    'Chest',
    'Spine',
    'Skull/Face',
    'Abdomen',
    'Pelvis/Hip',
    'Upper Limb',
    'Lower Limb',
  ],
  Ultrasound: [
    'Abdomen/Hepatobiliary/Renal',
    'Pelvis/Urology',
    'Obstetric',
    'Breast/Thyroid/Neck',
    'Vascular Doppler',
    'Musculoskeletal',
    'Soft Tissue',
  ],
  CT: [
    'Neuro/Head-Neck',
    'Chest',
    'Abdomen/Pelvis',
    'Spine',
    'Angiography',
    'Musculoskeletal',
  ],
  MRI: [
    'Neuro',
    'Spine',
    'Musculoskeletal',
    'Abdomen/Pelvis',
    'Vascular',
    'Breast',
    'Cardiac',
  ],
  Mammography: ['Screening', 'Diagnostic', 'Unilateral'],
  Fluoroscopy: ['GI Contrast', 'GU Contrast', 'Duct/Tract Studies'],
  Other: [
    'Bone Density (DEXA)',
    'Cardiac Diagnostics',
    'Physiologic Monitoring',
  ],
} as const;

export type ScanCategory = string;

// View planes for images
export const VIEW_PLANES = [
  'AP', // Anterior-Posterior
  'PA', // Posterior-Anterior
  'Lateral', // Side view
  'Oblique', // Angled view
  'Axial', // Cross-section (CT/MRI)
  'Sagittal', // Side plane (CT/MRI)
  'Coronal', // Front plane (CT/MRI)
  'Other',
] as const;

export type ViewPlane = (typeof VIEW_PLANES)[number];

// Urgency levels for reports
export const URGENCY_LEVELS = ['Normal', 'Urgent', 'Critical'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

// =============================================================================
// DTOs
// =============================================================================

// Main Radiology Request DTO (SCAN_REQUEST equivalent)
export interface RadiologyRequestDTO extends Omit<RadiologyRequest, 'status'> {
  patient?: Patient;
  doctor?: Staff; // ordered_by / requested_by
  radiologist?: Staff; // performed_by
  imaging?: ImagingCatalogue; // scan catalogue
  // Override status to use our extended type
  status: RadiologyRequestStatus;
  // Alias properties for API compatibility
  clinical_notes?: string; // Maps to clinical_indication
  diagnosis?: string[]; // Array of diagnoses/indications from consultation
  report?: string; // Maps to impression (legacy)
  image_url?: string; // Maps to result_file_url (legacy)
  // New relations
  scan_result?: ScanResultDTO;
  scan_images?: ScanImageDTO[];
  image_count?: number;
  // Encounter relation for tracking
  encounter?: {
    id: string;
    visit_id: string;
    encounter_number: string | null;
    encounter_date: string | null;
    status: string;
  };
}

// Scan/Imaging Catalogue DTO (SCAN equivalent)
export interface ImagingDTO extends ImagingCatalogue {
  // Alias properties for field mapping
  scan_id?: string; // Maps to imaging_id
  scan_code?: string; // Maps to imaging_code
  scan_name?: string; // Maps to imaging_name
  scan_type?: ImagingModality; // Maps to imaging_type
  cost?: number; // Maps to price
  nhis_covered?: boolean; // Maps to nhis_eligible
}

// Scan Result DTO (SCAN_RESULT equivalent)
export interface ScanResultDTO extends ScanResult {
  reporter?: Staff; // reported_by relation
  verifier?: Staff; // verified_by relation
  request?: RadiologyRequestDTO;
}

// Scan Image DTO - extends base ScanImage with display helpers
export interface ScanImageDTO extends Partial<ScanImage> {
  image_id: string;
  image_path: string;
  image_url?: string; // Alias for image_path for display convenience
  description?: string; // Display description
  uploader?: Staff; // uploaded_by relation
}

// Create Scan Result DTO
export interface CreateScanResultDTO {
  scan_request_id: string;
  report?: string;
  findings: string;
  impression: string;
  technique?: string;
  comparison?: string;
  urgency?: UrgencyLevel;
  is_preliminary?: boolean;
  notes?: string;
  images?: UploadScanImageDTO[];
}

// Update Scan Result DTO
export interface UpdateScanResultDTO {
  scan_result_id: string;
  report?: string;
  findings?: string;
  impression?: string;
  technique?: string;
  comparison?: string;
  urgency?: UrgencyLevel;
  is_preliminary?: boolean;
  notes?: string;
  addendum?: string;
}

// Upload Scan Image DTO
export interface UploadScanImageDTO {
  scan_request_id: string;
  image_path: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  view_plane?: ViewPlane;
  sequence_number?: number;
  is_key_image?: boolean;
  notes?: string;
}

export interface UpdateRadiologyRequestDTO {
  request_id: string;
  status?: RadiologyRequestStatus;
  findings?: string; // Legacy - use ScanResultDTO
  report?: string; // Legacy - use ScanResultDTO
  impression?: string;
  image_url?: string; // Legacy - use ScanImageDTO
  notes?: string;
  scheduled_date?: string;
  performed_by?: string;
  performed_at?: string;
  report_uploaded_by?: string;
  report_uploaded_at?: string;
  scan_completed_by?: string;
  scan_completed_at?: string;
}

export interface RadiologyRequestFilters {
  page?: number;
  limit?: number;
  status?: RadiologyRequestStatus;
  statuses?: RadiologyRequestStatus[];
  patient_id?: string;
  imaging_id?: string;
  modality?: ImagingModality;
  category?: ScanCategory;
  date_from?: string;
  date_to?: string;
  search?: string;
  /**
   * If true, include requests with nhis_approval_status = 'pending'.
   * Default is false - pending NHIS requests are hidden from the Radiology queue
   * until they are approved by the NHIS desk.
   */
  includeNhisPending?: boolean;
}

export interface RadiologyStats {
  ordered: number;
  scheduled: number;
  in_progress: number;
  imaging_completed: number;
  awaiting_report: number;
  preliminary_report: number;
  final_report: number;
  reported_today: number;
}

// =============================================================================
// Helpers
// =============================================================================

export function getRadiologyStatusColor(
  status: RadiologyRequestStatus,
): 'warning' | 'info' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'Pending':
    case 'Ordered':
      return 'warning';
    case 'Scheduled':
      return 'info';
    case 'In Progress':
      return 'info';
    case 'Imaging Completed':
    case 'Awaiting Report':
    case 'Preliminary Report':
      return 'info';
    case 'Completed':
      return 'info';
    case 'Final Report':
    case 'Reported':
      return 'success';
    case 'Accepted':
      return 'info';
    case 'Rejected':
    case 'Cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getModalityColor(modality: ImagingModality): string {
  switch (normalizeImagingModality(modality)) {
    case 'X-Ray':
      return 'bg-blue-100 text-blue-800';
    case 'Ultrasound':
      return 'bg-purple-100 text-purple-800';
    case 'CT':
      return 'bg-orange-100 text-orange-800';
    case 'MRI':
      return 'bg-green-100 text-green-800';
    case 'Mammography':
      return 'bg-pink-100 text-pink-800';
    case 'Fluoroscopy':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function normalizeImagingModality(
  modality: string | null | undefined,
): ImagingModality | null {
  if (!modality) {
    return null;
  }

  const normalized = modality.trim().toLowerCase();

  if (normalized === 'ct scan' || normalized === 'ct') {
    return 'CT';
  }

  for (const known of IMAGING_MODALITIES) {
    if (known.toLowerCase() === normalized) {
      return known;
    }
  }

  return null;
}

// =============================================================================
// Validation
// =============================================================================

export interface RadiologyReportFormErrors {
  findings?: string;
  report?: string;
}

export function validateRadiologyReportForm(
  findings: string,
  report: string,
): RadiologyReportFormErrors {
  const errors: RadiologyReportFormErrors = {};

  if (!findings.trim()) {
    errors.findings = 'Findings are required';
  }

  if (!report.trim()) {
    errors.report = 'Report/Impression is required';
  }

  return errors;
}
