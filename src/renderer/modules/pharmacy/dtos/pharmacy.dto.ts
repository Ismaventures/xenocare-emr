import {
  Prescription,
  DrugCatalogue,
  Patient,
  Staff,
  Dispense,
  DrugCategory as DrugCategoryType,
  DrugType as DrugTypeEnum,
  NewDispenseStatus,
} from '../../../types/database.types';

// =============================================================================
// Enums (Standard EMR)
// =============================================================================

// Legacy status for backward compatibility
export const PRESCRIPTION_STATUS = [
  'Pending',
  'Accepted',
  'Rejected',
  'Partial',
  'Dispensed',
  'Cancelled',
] as const;

export type PrescriptionStatus = (typeof PRESCRIPTION_STATUS)[number];

// New Dispense Status (Standard EMR)
export const DISPENSE_STATUS = [
  'Awaiting Payment',
  'Partially Dispensed',
  'Fully Dispensed',
  'Substituted',
  'Cancelled',
] as const;

export type DispenseStatusType = (typeof DISPENSE_STATUS)[number];

// Drug Categories (Standard EMR)
export const DRUG_CATEGORIES = [
  'Antibiotics',
  'Analgesics',
  'Antimalarials',
  'Antihypertensives',
  'Antidiabetics',
  'Antivirals',
  'Antifungals',
  'Vaccines',
  'IV Fluids',
  'Vitamins and Supplements',
] as const;

export type DrugCategory = (typeof DRUG_CATEGORIES)[number];

// NHIS Drug Categories (Official NHIA 2025 Classification)
export const NHIS_DRUG_CATEGORIES = [
  '1. 0 ANAESTHETICS',
  '2.1 Analgesics Narcotic',
  '2.5 Skeletal Muscle & Antispasmodics',
  '3.1 Antihistamines',
  '4.1 Specific Antidotes',
  '5.0 ANTI-CONVULSANTS (ANTI-EPILEPTICS)',
  '6.0 ANTI-INFECTIVE DRUGS',
  '6. 7 Antibacterial Drugs',
  '9.1 Anti-parkinsonism Drugs',
  '9.2 Drugs for Myasthenia Gravis',
  '9.3 Drugs for Subarachnoid Haemorrhage',
  '11.1 Anti-Aneamic Drugs',
  '11.3 Anti Platelets',
  '11.4 Anti Fibrinolytic and Haemostatic Drugs',
  '11.5 PLASMA SUBSTITUTES',
  '12.4 ANTIHYPERTENSIVES DRUGS',
  '12.5 CARDIAC GLYCOSIDE AND CARDIOTONICS',
  '12.6 LIPID – REGULATING DRUGS',
  '13.1 LOCAL ANAESTHETICS',
  '13.3 ANTI INFLAMMATORY DENTAL DRUGS',
  '14.3 ASTRINGENT DRUGS',
  '14.5 SCABICIDES AND PEDICULICIDES',
  '14.6 FUNGICIDES WITH ANTIBACTERIAL/ANTI-INFLAMMATORY AGENTS',
  '14.7 KERATOLYTIC/ PSORIASIS DRUGS',
  '15.1 EAR DRUGS',
  '15.2 NOSE DRUGS',
  '15.3 THROAT DRUGS',
  '16.1 ANTACID DRUGS',
  '16.2 ANTI-EMETIC DRUGS',
  '16.4 PURGATIVES / LAXATIVES AND LUBRICANTS',
  '16.5 ANTI-DIARRHOEAL DRUGS',
  '16.6 PREPARATIONS FOR HEAMORRHOID',
  '16.7 PEPTIC ULCER DRUGS',
  '17.1 CORTICOSTEROIDS & SYNTHETIC SUBSTITUTES',
  '17.2 OESTROGEN',
  '18.1 SERA AND IMMUNOGLOBULINS',
  '19.1 ANTI-INFECTIVE',
  '19.2 ANTI ALLERGIC',
  '19.3 ANTI INFLAMMATORY',
  '19.4 ANTI-GLAUCOMA AND MIOTICS',
  '19.5 MYDRIATICS',
  '19.6 DIAGNOSTIC EYE DRUGS & MISCELLANEOUS PREPARATIONS',
  '21.1 ORAL PREPARATIONS',
  '21.2 PARENTERAL PREPARATIONS',
  '23.3 ANTI PSYCHOTICS (MAJOR TRANQUILIZERS)',
  '28.0 MISCELLANEOUS DRUGS',
] as const;

export type NHISDrugCategory = (typeof NHIS_DRUG_CATEGORIES)[number];

// Drug Types (Standard EMR)
export const DRUG_TYPES = [
  'Tablets',
  'Capsules',
  'Syrups',
  'Injections',
  'Creams/Ointments',
  'IV Infusions',
] as const;

export type DrugType = (typeof DRUG_TYPES)[number];

// Legacy drug forms (for backward compatibility)
export const DRUG_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Cream',
  'Ointment',
  'Suspension',
  'Drops',
  'Inhaler',
  'Suppository',
  'Other',
] as const;

export type DrugForm = (typeof DRUG_FORMS)[number];

// Dosage Options (Standard EMR)
export const DOSAGE_OPTIONS = [
  '1 tablet',
  '2 tablets',
  '1 capsule',
  '2 capsules',
  '5ml',
  '10ml',
  '15ml',
  '1 teaspoon',
  '2 teaspoons',
  '1 tablespoon',
  '1 sachet',
  '2 sachets',
  '1 puff',
  '2 puffs',
  '1 drop',
  '2 drops',
  '1 application',
  '1 unit',
  '2 units',
  '0.5ml',
  '1ml',
  '2ml',
  '5 units',
  '10 units',
] as const;

export type DosageOption = (typeof DOSAGE_OPTIONS)[number];

// Frequency Options (Standard EMR)
export const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'Once weekly',
  'Twice weekly',
  'At bedtime',
  'In the morning',
  'Before meals',
  'After meals',
  'With meals',
  'As needed (PRN)',
  'Stat (Immediately)',
  'Once only',
] as const;

export type FrequencyOption = (typeof FREQUENCY_OPTIONS)[number];

// Duration Options (Standard EMR)
export const DURATION_OPTIONS = [
  '1 day',
  '2 days',
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '21 days',
  '28 days',
  '1 month',
  '2 months',
  '3 months',
  '6 months',
  'Continuous',
  'Until finished',
  'As directed',
] as const;

export type DurationOption = (typeof DURATION_OPTIONS)[number];

// Route of Administration Options
export const ROUTE_OPTIONS = [
  'Oral',
  'Sublingual',
  'Intravenous (IV)',
  'Intramuscular (IM)',
  'Subcutaneous (SC)',
  'Topical',
  'Rectal',
  'Inhalation',
  'Nasal',
  'Ophthalmic',
  'Otic',
  'Vaginal',
] as const;

export type RouteOption = (typeof ROUTE_OPTIONS)[number];

// Standard drug list with NDC categories
export const STANDARD_DRUGS = [
  // Antibiotics
  {
    drug_code: 'DRG001',
    drug_name: 'Amoxicillin',
    brand_name: 'Amoxil',
    category: 'Antibiotics',
    drug_type: 'Capsules',
    strength: '500mg',
  },
  {
    drug_code: 'DRG002',
    drug_name: 'Ciprofloxacin',
    brand_name: 'Cipro',
    category: 'Antibiotics',
    drug_type: 'Tablets',
    strength: '500mg',
  },
  {
    drug_code: 'DRG003',
    drug_name: 'Metronidazole',
    brand_name: 'Flagyl',
    category: 'Antibiotics',
    drug_type: 'Tablets',
    strength: '400mg',
  },
  {
    drug_code: 'DRG004',
    drug_name: 'Azithromycin',
    brand_name: 'Zithromax',
    category: 'Antibiotics',
    drug_type: 'Capsules',
    strength: '250mg',
  },
  {
    drug_code: 'DRG005',
    drug_name: 'Ceftriaxone',
    brand_name: 'Rocephin',
    category: 'Antibiotics',
    drug_type: 'Injections',
    strength: '1g',
  },
  // Analgesics
  {
    drug_code: 'DRG006',
    drug_name: 'Paracetamol',
    brand_name: 'Panadol',
    category: 'Analgesics',
    drug_type: 'Tablets',
    strength: '500mg',
  },
  {
    drug_code: 'DRG007',
    drug_name: 'Ibuprofen',
    brand_name: 'Brufen',
    category: 'Analgesics',
    drug_type: 'Tablets',
    strength: '400mg',
  },
  {
    drug_code: 'DRG008',
    drug_name: 'Diclofenac',
    brand_name: 'Voltaren',
    category: 'Analgesics',
    drug_type: 'Tablets',
    strength: '50mg',
  },
  {
    drug_code: 'DRG009',
    drug_name: 'Tramadol',
    brand_name: 'Tramal',
    category: 'Analgesics',
    drug_type: 'Capsules',
    strength: '50mg',
  },
  // Antimalarials
  {
    drug_code: 'DRG010',
    drug_name: 'Artemether-Lumefantrine',
    brand_name: 'Coartem',
    category: 'Antimalarials',
    drug_type: 'Tablets',
    strength: '20/120mg',
  },
  {
    drug_code: 'DRG011',
    drug_name: 'Artesunate',
    brand_name: 'Arinate',
    category: 'Antimalarials',
    drug_type: 'Injections',
    strength: '60mg',
  },
  {
    drug_code: 'DRG012',
    drug_name: 'Quinine',
    brand_name: 'Quinine Sulphate',
    category: 'Antimalarials',
    drug_type: 'Tablets',
    strength: '300mg',
  },
  // Antihypertensives
  {
    drug_code: 'DRG013',
    drug_name: 'Amlodipine',
    brand_name: 'Norvasc',
    category: 'Antihypertensives',
    drug_type: 'Tablets',
    strength: '5mg',
  },
  {
    drug_code: 'DRG014',
    drug_name: 'Lisinopril',
    brand_name: 'Zestril',
    category: 'Antihypertensives',
    drug_type: 'Tablets',
    strength: '10mg',
  },
  {
    drug_code: 'DRG015',
    drug_name: 'Losartan',
    brand_name: 'Cozaar',
    category: 'Antihypertensives',
    drug_type: 'Tablets',
    strength: '50mg',
  },
  {
    drug_code: 'DRG016',
    drug_name: 'Atenolol',
    brand_name: 'Tenormin',
    category: 'Antihypertensives',
    drug_type: 'Tablets',
    strength: '50mg',
  },
  // Antidiabetics
  {
    drug_code: 'DRG017',
    drug_name: 'Metformin',
    brand_name: 'Glucophage',
    category: 'Antidiabetics',
    drug_type: 'Tablets',
    strength: '500mg',
  },
  {
    drug_code: 'DRG018',
    drug_name: 'Glibenclamide',
    brand_name: 'Daonil',
    category: 'Antidiabetics',
    drug_type: 'Tablets',
    strength: '5mg',
  },
  {
    drug_code: 'DRG019',
    drug_name: 'Insulin NPH',
    brand_name: 'Humulin N',
    category: 'Antidiabetics',
    drug_type: 'Injections',
    strength: '100IU/ml',
  },
  // Antivirals
  {
    drug_code: 'DRG020',
    drug_name: 'Acyclovir',
    brand_name: 'Zovirax',
    category: 'Antivirals',
    drug_type: 'Tablets',
    strength: '200mg',
  },
  {
    drug_code: 'DRG021',
    drug_name: 'Oseltamivir',
    brand_name: 'Tamiflu',
    category: 'Antivirals',
    drug_type: 'Capsules',
    strength: '75mg',
  },
  // Antifungals
  {
    drug_code: 'DRG022',
    drug_name: 'Fluconazole',
    brand_name: 'Diflucan',
    category: 'Antifungals',
    drug_type: 'Capsules',
    strength: '150mg',
  },
  {
    drug_code: 'DRG023',
    drug_name: 'Clotrimazole',
    brand_name: 'Canesten',
    category: 'Antifungals',
    drug_type: 'Creams/Ointments',
    strength: '1%',
  },
  // Vaccines
  {
    drug_code: 'DRG024',
    drug_name: 'Tetanus Toxoid',
    brand_name: 'TT Vaccine',
    category: 'Vaccines',
    drug_type: 'Injections',
    strength: '0.5ml',
  },
  {
    drug_code: 'DRG025',
    drug_name: 'Hepatitis B Vaccine',
    brand_name: 'Engerix-B',
    category: 'Vaccines',
    drug_type: 'Injections',
    strength: '20mcg/ml',
  },
  // IV Fluids
  {
    drug_code: 'DRG026',
    drug_name: 'Normal Saline',
    brand_name: 'NS 0.9%',
    category: 'IV Fluids',
    drug_type: 'IV Infusions',
    strength: '0.9%',
  },
  {
    drug_code: 'DRG027',
    drug_name: 'Dextrose Saline',
    brand_name: 'D/S',
    category: 'IV Fluids',
    drug_type: 'IV Infusions',
    strength: '5%',
  },
  {
    drug_code: 'DRG028',
    drug_name: 'Ringers Lactate',
    brand_name: 'RL',
    category: 'IV Fluids',
    drug_type: 'IV Infusions',
    strength: '500ml',
  },
  // Vitamins and Supplements
  {
    drug_code: 'DRG029',
    drug_name: 'Vitamin C',
    brand_name: 'Cebion',
    category: 'Vitamins and Supplements',
    drug_type: 'Tablets',
    strength: '500mg',
  },
  {
    drug_code: 'DRG030',
    drug_name: 'Vitamin B Complex',
    brand_name: 'Neurovit',
    category: 'Vitamins and Supplements',
    drug_type: 'Tablets',
    strength: '-',
  },
  {
    drug_code: 'DRG031',
    drug_name: 'Ferrous Sulphate',
    brand_name: 'Ferograd',
    category: 'Vitamins and Supplements',
    drug_type: 'Tablets',
    strength: '200mg',
  },
  {
    drug_code: 'DRG032',
    drug_name: 'Folic Acid',
    brand_name: 'Foliron',
    category: 'Vitamins and Supplements',
    drug_type: 'Tablets',
    strength: '5mg',
  },
] as const;

// =============================================================================
// DTOs
// =============================================================================

export interface PrescriptionDTO extends Prescription {
  patient?: Patient;
  doctor?: Staff;
  pharmacist?: Staff;
  drug?: DrugCatalogue & { batches?: DrugBatchDTO[] };
  dispenses?: DispenseRecordDTO[];
  // Clinical context fields - diagnosis and notes from doctor
  diagnosis?: string[]; // ICD-10 codes/diagnoses - WHY this was prescribed
  clinical_notes?: string; // Indication/reason for prescription
  // Encounter relation for tracking
  encounter?: {
    id: string;
    visit_id: string;
    encounter_number: string | null;
    encounter_date: string | null;
    status: string;
  };
}

export interface DrugDTO extends DrugCatalogue {
  // Extended fields for legacy schema compatibility
  generic_name?: string;
  brand_name?: string;
  category?: string;
  drug_type?: string;
  formulation?: string;
  strength?: string;
  manufacturer?: string;
  quantity_in_stock?: number;
  unit_of_measure?: string;
  unit_cost?: number;
  selling_price?: number;
  nhis_eligible?: boolean;
  nhis_price?: number | null;
  nhis_percentage?: number;
  requires_prescription?: boolean;
  is_controlled?: boolean;
  supplier?: string;
  batch_number?: string;
  manufacturing_date?: string;
  expiry_date?: string;
  // NHIS categorization fields
  nhis_category?: string;
  nhis_subcategory?: string;
  // Batch aggregation fields
  batches?: DrugBatchDTO[];
  total_batch_stock?: number;
  earliest_expiry?: string;
  batch_count?: number;
}

// =============================================================================
// BATCH-BASED INVENTORY DTOs
// =============================================================================

export type BatchStatus =
  | 'active'
  | 'depleted'
  | 'expired'
  | 'recalled'
  | 'quarantine';

export interface DrugBatchDTO {
  batch_id: string;
  drug_id: string;
  batch_number: string;
  barcode?: string;
  quantity_received: number;
  quantity_remaining: number;
  manufacture_date?: string;
  expiry_date: string;
  received_date: string;
  cost_price: number;
  selling_price?: number;
  supplier_name?: string;
  supplier_batch_ref?: string;
  purchase_order_id?: string;
  received_by?: string;
  status: BatchStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined drug info (from getAllBatches)
  drug_name?: string;
  drug_code?: string;
  generic_name?: string;
  strength?: string;
  // Computed
  days_to_expiry?: number;
  is_expired?: boolean;
  is_near_expiry?: boolean;
}

export interface CreateBatchDTO {
  drug_id: string;
  batch_number: string;
  barcode?: string;
  quantity_received: number;
  manufacture_date?: string;
  expiry_date: string;
  cost_price: number;
  selling_price?: number;
  supplier_name?: string;
  supplier_batch_ref?: string;
  purchase_order_id?: string;
  received_by?: string;
  notes?: string;
}

export interface UpdateBatchDTO {
  batch_id: string;
  batch_number?: string;
  barcode?: string;
  quantity_remaining?: number;
  expiry_date?: string;
  cost_price?: number;
  selling_price?: number;
  status?: BatchStatus;
  notes?: string;
}

// FEFO batch selection result
export interface DispensableBatch {
  batch_id: string;
  batch_number: string;
  quantity_available: number;
  quantity_to_take: number;
  expiry_date: string;
  days_to_expiry: number;
  cost_price: number;
  selling_price?: number;
}

// Stock movement for audit trail
export type MovementType =
  | 'IN'
  | 'OUT'
  | 'ADJUSTMENT'
  | 'TRANSFER'
  | 'RETURN'
  | 'EXPIRED'
  | 'DAMAGED';

export interface StockMovementDTO {
  movement_id?: string;
  drug_id: string;
  batch_id?: string;
  item_id?: string; // For general inventory items
  movement_type: MovementType;
  quantity: number;
  reference_number?: string;
  encounter_id?: string;
  patient_id?: string;
  dispense_id?: string;
  reason?: string;
  notes?: string;
  performed_by: string;
  approved_by?: string;
  created_at?: string;
}

export interface CreateStockMovementDTO {
  drug_id?: string;
  item_id?: string;
  batch_id?: string;
  movement_type: MovementType;
  quantity: number;
  reference_number?: string;
  encounter_id?: string;
  patient_id?: string;
  dispense_id?: string;
  reason?: string;
  notes?: string;
  performed_by: string;
  approved_by?: string;
}

// Enhanced dispense with batch tracking
export interface BatchDispenseDTO {
  prescription_id: string;
  drug_id: string;
  patient_id: string;
  encounter_id: string;
  pharmacist_id: string;
  quantity_to_dispense: number;
  // Batch allocation (auto or manual)
  batch_allocations?: {
    batch_id: string;
    quantity: number;
  }[];
  // Substitution
  is_substitution?: boolean;
  original_drug_id?: string;
  substitution_reason?: string;
  // NHIS
  nhis_claim_id?: string;
  nhis_amount?: number;
  patient_copay?: number;
  // Other
  counseling_provided?: boolean;
  notes?: string;
}

// Dispense record from database
export interface DispenseRecordWithBatchDTO {
  dispense_id: string;
  prescription_id?: string;
  patient_id: string;
  encounter_id: string;
  drug_id: string;
  batch_id?: string;
  batch?: DrugBatchDTO;
  quantity_dispensed: number;
  pharmacist_id: string;
  pharmacist?: Staff;
  verified_by?: string;
  dispensed_at: string;
  is_substitution: boolean;
  original_drug_id?: string;
  substitution_reason?: string;
  nhis_claim_id?: string;
  nhis_amount: number;
  patient_copay: number;
  status: 'dispensed' | 'returned' | 'cancelled';
  counseling_provided: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PHARMACY INVENTORY STATS
// =============================================================================

export interface PharmacyInventoryStats {
  total_drugs: number;
  total_batches: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_30_days: number;
  expiring_60_days: number;
  expiring_90_days: number;
  expired_batches: number;
  total_stock_value_cost: number;
  total_stock_value_selling: number;
  dispensed_today_count: number;
  received_today_count: number;
}

export interface NearExpiryDrug {
  batch_id: string;
  drug_id: string;
  drug_code: string;
  drug_name: string;
  generic_name?: string;
  batch_number: string;
  quantity_remaining: number;
  expiry_date: string;
  days_to_expiry: number;
  cost_price: number;
  batch_value: number;
  urgency_level: 'critical' | 'warning' | 'caution';
}

export interface ExpiredDrug {
  batch_id: string;
  drug_id: string;
  drug_code: string;
  drug_name: string;
  generic_name?: string;
  batch_number: string;
  quantity_remaining: number;
  expiry_date: string;
  days_expired: number;
  cost_price: number;
  loss_value: number;
  status: BatchStatus;
}

export interface DrugInventorySummary {
  drug_id: string;
  drug_code: string;
  drug_name: string;
  generic_name?: string;
  category: string;
  drug_type: string;
  strength?: string;
  selling_price: number;
  reorder_level: number;
  is_active: boolean;
  total_stock: number;
  batch_count: number;
  earliest_expiry?: string;
  stock_cost_value: number;
  expiring_soon_qty: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

// =============================================================================
// BATCH FILTERS
// =============================================================================

export interface BatchFilters {
  drug_id?: string;
  status?: BatchStatus;
  expiring_within_days?: number;
  expired?: boolean;
  has_stock?: boolean;
  search?: string;
}

// Legacy DispenseDTO for backward compatibility
export interface DispenseDTO {
  prescription_id: string;
  quantity_to_dispense: number;
  notes?: string;
}

// New Dispense Record DTO (Standard EMR)
export interface DispenseRecordDTO extends Dispense {
  prescription?: PrescriptionDTO;
  pharmacist?: Staff;
  substituted_drug?: DrugCatalogue;
}

// Create Dispense DTO
export interface CreateDispenseDTO {
  prescription_id: string;
  quantity_dispensed: number;
  dispense_status: DispenseStatusType;
  substituted_drug_id?: string;
  substitution_reason?: string;
  batch_number?: string;
  notes?: string;
}

// Update Dispense DTO
export interface UpdateDispenseDTO {
  dispense_id: string;
  quantity_dispensed?: number;
  dispense_status?: DispenseStatusType;
  notes?: string;
}

// Create Drug DTO
export interface CreateDrugDTO {
  drug_code: string;
  drug_name: string;
  generic_name?: string;
  brand_name?: string;
  category?: string;
  drug_type?: string;
  formulation?: string;
  dosage_form?: string;
  strength?: string;
  strengths?: string;
  presentation?: string;
  manufacturer?: string;
  unit_of_measure?: string;
  price?: number;
  selling_price?: number;
  unit_cost?: number;
  reorder_level?: number;
  is_nhis_covered?: boolean;
  nhis_eligible?: boolean;
  nhis_price?: number | null;
  nhis_percentage?: number;
  requires_prescription?: boolean;
  is_controlled?: boolean;
  is_active?: boolean;
}

export interface UpdateDrugDTO {
  drug_id: string;
  drug_code?: string;
  drug_name?: string;
  generic_name?: string;
  brand_name?: string;
  category?: string;
  drug_type?: string;
  formulation?: string;
  dosage_form?: string;
  strength?: string;
  strengths?: string;
  presentation?: string;
  manufacturer?: string;
  unit_of_measure?: string;
  price?: number;
  selling_price?: number;
  unit_cost?: number;
  quantity_in_stock?: number;
  reorder_level?: number;
  is_nhis_covered?: boolean;
  nhis_eligible?: boolean;
  nhis_price?: number | null;
  nhis_percentage?: number;
  requires_prescription?: boolean;
  is_controlled?: boolean;
  is_active?: boolean;
}

export interface PrescriptionFilters {
  page?: number;
  limit?: number;
  status?: PrescriptionStatus;
  dispense_status?: DispenseStatusType;
  category?: DrugCategory;
  patient_id?: string;
  consultation_id?: string;
  encounter_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  /**
   * If true, include prescriptions with nhis_approval_status = 'pending'.
   * Default is false - pending NHIS prescriptions are hidden from the Pharmacy queue
   * until they are approved by the NHIS desk.
   */
  includeNhisPending?: boolean;
}

export interface DrugFilters {
  page?: number;
  limit?: number;
  category?: DrugCategory;
  drug_type?: DrugType;
  low_stock?: boolean;
  nhis_only?: boolean;
  search?: string;
}

export interface PharmacyStats {
  pending_prescriptions: number;
  awaiting_payment: number;
  partially_dispensed: number;
  fully_dispensed_today: number;
  dispensed_today: number;
  low_stock_items: number;
  out_of_stock: number;
}

// =============================================================================
// Helpers
// =============================================================================

export function getPrescriptionStatusColor(
  status: PrescriptionStatus,
): 'warning' | 'info' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'Pending':
      return 'warning';
    case 'Accepted':
      return 'info';
    case 'Rejected':
      return 'danger';
    case 'Partial':
      return 'info';
    case 'Dispensed':
      return 'success';
    case 'Cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

// New dispense status color helper (Standard EMR)
export function getDispenseStatusColor(
  status: DispenseStatusType,
): 'warning' | 'info' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'Awaiting Payment':
      return 'warning';
    case 'Partially Dispensed':
      return 'info';
    case 'Fully Dispensed':
      return 'success';
    case 'Substituted':
      return 'neutral';
    case 'Cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getDispenseStatusStyle(status: DispenseStatusType): string {
  switch (status) {
    case 'Awaiting Payment':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Partially Dispensed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Fully Dispensed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Substituted':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getDrugCategoryColor(category: DrugCategory): string {
  switch (category) {
    case 'Antibiotics':
      return 'bg-red-100 text-red-800';
    case 'Analgesics':
      return 'bg-blue-100 text-blue-800';
    case 'Antimalarials':
      return 'bg-yellow-100 text-yellow-800';
    case 'Antihypertensives':
      return 'bg-purple-100 text-purple-800';
    case 'Antidiabetics':
      return 'bg-green-100 text-green-800';
    case 'Antivirals':
      return 'bg-pink-100 text-pink-800';
    case 'Antifungals':
      return 'bg-teal-100 text-teal-800';
    case 'Vaccines':
      return 'bg-indigo-100 text-indigo-800';
    case 'IV Fluids':
      return 'bg-cyan-100 text-cyan-800';
    case 'Vitamins and Supplements':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getDrugTypeColor(drugType: DrugType): string {
  switch (drugType) {
    case 'Tablets':
      return 'bg-slate-100 text-slate-800';
    case 'Capsules':
      return 'bg-amber-100 text-amber-800';
    case 'Syrups':
      return 'bg-pink-100 text-pink-800';
    case 'Injections':
      return 'bg-red-100 text-red-800';
    case 'Creams/Ointments':
      return 'bg-lime-100 text-lime-800';
    case 'IV Infusions':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStockLevelColor(current: number, reorder: number): string {
  if (current === 0) return 'text-red-600';
  if (current <= reorder) return 'text-orange-600';
  return 'text-green-600';
}

export function formatPrescriptionDetails(rx: PrescriptionDTO): string {
  const parts = [];
  if (rx.dose) parts.push(rx.dose);
  if (rx.dosage) parts.push(rx.dosage);
  if (rx.frequency) parts.push(rx.frequency);
  if (rx.duration) parts.push(`for ${rx.duration}`);
  if (rx.route) parts.push(`(${rx.route})`);
  return parts.join(' ');
}

export function formatDrugDisplay(drug: DrugCatalogue | DrugDTO): string {
  const parts = [drug.drug_name];
  // Check both brand_name (DrugDTO) and strengths (DrugCatalogue)
  const drugDto = drug as DrugDTO;
  if (drugDto.brand_name) parts.push(`(${drugDto.brand_name})`);
  if (drugDto.strength) parts.push(drugDto.strength);
  else if (drug.strengths) parts.push(drug.strengths);
  return parts.join(' ');
}

// =============================================================================
// Validation
// =============================================================================

export interface DispenseFormErrors {
  quantity?: string;
}

export function validateDispenseForm(
  quantity: number,
  available: number,
  prescribed: number,
  alreadyDispensed: number,
): DispenseFormErrors {
  const errors: DispenseFormErrors = {};
  const remaining = prescribed - alreadyDispensed;

  if (quantity <= 0) {
    errors.quantity = 'Quantity must be greater than 0';
  } else if (quantity > available) {
    errors.quantity = `Only ${available} available in stock`;
  } else if (quantity > remaining) {
    errors.quantity = `Only ${remaining} remaining to dispense`;
  }

  return errors;
}
