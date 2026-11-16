import {
  Patient,
  Gender,
  StaffCategory,
  MilitaryBranch,
  PatientStatus,
  PayerInfo,
} from '../../../types';

// =============================================================================
// Patient Category Types
// =============================================================================

export type PatientCategory =
  | 'Military'
  | 'Civilian'
  | 'Military Participant'
  | 'Civilian Participant'
  | 'Security Services';
export type PatientType = 'Principal' | 'Dependent' | 'Private';
export type InsuranceType =
  | 'Private'
  | 'Military_NHIS'
  | 'Civilian_NHIS'
  | 'Retainership'
  | 'GIFSHIP'
  | 'DHML'
  | 'Security_Services_NHIS';

// Security Services/Paramilitary Organizations
export type SecurityOrganization =
  | 'NPF' // Nigeria Police Force
  | 'NSCDC' // Nigeria Security and Civil Defence Corps
  | 'NIS' // Nigeria Immigration Service
  | 'NCS' // Nigeria Customs Service
  | 'FFS' // Federal Fire Service
  | 'DSS' // Department of State Services
  | 'NCoS' // Nigeria Correctional Service
  | 'FRSC' // Federal Road Safety Corps
  | 'NDLEA' // National Drug Law Enforcement Agency
  | 'EFCC' // Economic and Financial Crimes Commission
  | 'ICPC' // Independent Corrupt Practices Commission
  | 'NIA'; // Nigeria Intelligence Agency
export type MilitaryCoverageType = 'Military_NHIS'; // Replaces old DHML type
export type CivilianCoverageType =
  | 'Civilian_NHIS'
  | 'Private'
  | 'Retainership'
  | 'GIFSHIP';

// NHIS Patient Source (Internal vs Referral)
export type NHISPatientSource = 'Internal' | 'Referral';
export type ReferralStatus = 'Active' | 'Expired' | 'Used' | 'Cancelled';

// Military-specific fields
export interface MilitaryPatientInfo {
  service_number: string;
  rank: string;
  military_branch: MilitaryBranch;
  unit?: string;
  nhis_number?: string;
  coverage_type?: MilitaryCoverageType;
}

// Civilian-specific fields
export interface CivilianPatientInfo {
  occupation?: string;
  employer?: string;
  nhis_number?: string;
  coverage_type?: CivilianCoverageType;
}

// NHIS Referral Information
export interface NHISReferralInfo {
  referral_code: string;
  referring_facility_name: string;
  referring_facility_nhis_id?: string;
  referral_date: string;
  referral_reason: string;
  referral_status: ReferralStatus;
  referral_expiry_date?: string;
  clinical_summary?: string;
}

// =============================================================================
// Patient DTOs
// =============================================================================

export interface PatientDTO extends Patient {
  // Extended fields (not in base Patient interface)
  military_info?: MilitaryPatientInfo;
  civilian_info?: CivilianPatientInfo;
}

export interface CreatePatientDTO {
  first_name: string;
  middle_name?: string;
  surname: string;
  gender: Gender;
  date_of_birth?: string;
  nationality?: string;
  state_of_origin?: string;
  lga?: string;
  contact_phone?: string;
  email?: string;
  residential_address?: string;
  nok_name?: string;
  nok_relationship?: string;
  nok_phone?: string;
  nok_address?: string;
  blood_group?: string;
  known_allergies?: string[];
  photo_url?: string;
  payer_info?: PayerInfo;
  // New category fields (emr_number is auto-generated, not sent)
  patient_category?: PatientCategory;
  insurance_type?: InsuranceType;
  patient_type?: PatientType;
  principal_id?: string;
  relationship_to_principal?: string;
  // Military-specific fields
  service_number?: string;
  rank?: string;
  military_branch?: MilitaryBranch;
  unit?: string;
  // Civilian-specific fields
  occupation?: string;
  employer?: string;
  title?: string; // Title/Rank for Civilian and Civilian Participant
  // Participant-specific fields (for Military Participant and Civilian Participant)
  course?: string; // Course name e.g., "Course 34"
  // GIFSHIP Specific
  enrollment_type?: 'Individual' | 'Family' | 'Group';
  // Security Services NHIS specific fields
  security_organization?: SecurityOrganization;
  security_service_number?: string; // Force number for paramilitary/security services
  // Common NHIS field
  nhis_number?: string;
  national_id?: string; // National Identification Number
  // NHIS Source & Referral fields
  nhis_patient_source?: NHISPatientSource; // Internal or Referral
  referral_code?: string;
  referring_facility_name?: string;
  referring_facility_nhis_id?: string;
  referral_date?: string;
  referral_reason?: string;
  referral_status?: ReferralStatus;
  referral_expiry_date?: string;
  clinical_summary?: string;
  // Legacy fields (kept for backward compatibility)
  staff_category?: StaffCategory;
}

export interface UpdatePatientDTO extends Partial<CreatePatientDTO> {
  patient_id: string;
  status?: PatientStatus;
}

// =============================================================================
// Search & Filter DTOs
// =============================================================================

export interface PatientSearchParams {
  query?: string;
  status?: PatientStatus;
  staff_category?: StaffCategory;
  patient_category?: PatientCategory;
  patient_type?: PatientType;
  insurance_type?: InsuranceType;
  nhis_patient_source?: NHISPatientSource;
  gender?: Gender;
  registration_date_from?: string;
  registration_date_to?: string;
  page?: number;
  limit?: number;
}

export interface PatientSearchResult {
  patients: PatientDTO[];
  total: number;
  page: number;
  totalPages: number;
}

// =============================================================================
// Form Validation
// =============================================================================

export interface PatientFormErrors {
  first_name?: string;
  surname?: string;
  gender?: string;
  contact_phone?: string;
  email?: string;
  date_of_birth?: string;
  service_number?: string;
  rank?: string;
  military_branch?: string;
  principal_id?: string;
  relationship_to_principal?: string;
  // NHIS Referral errors
  referral_code?: string;
  referring_facility_name?: string;
  referral_date?: string;
  referral_reason?: string;
}

/**
 * Capitalize the first letter of each word in a name
 * Handles hyphenated names and multi-word names properly
 */
export function capitalizePatientName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .split(/([\s-]+)/)
    .map((part) => {
      if (part.match(/^[\s-]+$/)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

/**
 * Format patient name with proper capitalization for display
 */
export function formatProperName(
  firstName?: string,
  middleName?: string,
  surname?: string,
): string {
  const parts = [
    capitalizePatientName(surname || ''),
    capitalizePatientName(firstName || ''),
    middleName ? capitalizePatientName(middleName) : '',
  ].filter(Boolean);
  return parts.join(' ');
}

export function validatePatientForm(data: CreatePatientDTO): PatientFormErrors {
  const errors: PatientFormErrors = {};

  // Name validations - Required
  if (!data.first_name?.trim()) {
    errors.first_name = 'First name is required';
  } else if (data.first_name.trim().length < 2) {
    errors.first_name = 'First name must be at least 2 characters';
  }

  if (!data.surname?.trim()) {
    errors.surname = 'Surname is required';
  } else if (data.surname.trim().length < 2) {
    errors.surname = 'Surname must be at least 2 characters';
  }

  // Date of Birth - Required
  if (!data.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required';
  } else {
    const dob = new Date(data.date_of_birth);
    const today = new Date();
    if (dob > today) {
      errors.date_of_birth = 'Date of birth cannot be in the future';
    }
    // Check if reasonable age (not more than 150 years)
    const age = today.getFullYear() - dob.getFullYear();
    if (age > 150) {
      errors.date_of_birth = 'Please enter a valid date of birth';
    }
  }

  if (!data.gender) {
    errors.gender = 'Gender is required';
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (data.contact_phone && !/^[\d+\-\s()]{10,}$/.test(data.contact_phone)) {
    errors.contact_phone = 'Invalid phone number format';
  }

  // Military validation
  if (data.patient_category === 'Military') {
    if (!data.service_number) {
      errors.service_number =
        'Service number is required for military personnel';
    }
    if (!data.rank) {
      errors.rank = 'Rank is required for military personnel';
    }
    if (!data.military_branch) {
      errors.military_branch =
        'Military branch is required for military personnel';
    }
  }

  // Dependent validation
  if (data.patient_type === 'Dependent') {
    if (!data.principal_id) {
      errors.principal_id = 'Principal is required for dependents';
    }
    if (!data.relationship_to_principal) {
      errors.relationship_to_principal =
        'Relationship to principal is required';
    }
  }

  // NOTE: NHIS Referral fields (referral_code, referring_facility_name, referral_date, referral_reason)
  // are optional at patient registration. They can be filled in during NHIS verification process.

  return errors;
}

// =============================================================================
// Helper Functions
// =============================================================================

export function calculateAge(
  dateOfBirth: string | null | undefined,
): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculate detailed age with years, months, and days
 */
export function calculateDetailedAge(
  dateOfBirth: string | null | undefined,
): { years: number; months: number; days: number } | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();

  // Adjust for negative days
  if (days < 0) {
    months--;
    // Get the last day of the previous month
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

/**
 * Format detailed age as a readable string
 */
export function formatDetailedAge(
  dateOfBirth: string | null | undefined,
): string {
  const age = calculateDetailedAge(dateOfBirth);
  if (!age) return 'N/A';

  // For very young children (< 1 month), show in weeks and days
  if (age.years === 0 && age.months === 0) {
    const totalDays = age.days;
    if (totalDays === 0) return '0 days';
    const weeks = Math.floor(totalDays / 7);
    const remainingDays = totalDays % 7;
    if (weeks > 0 && remainingDays > 0) return `${weeks}w ${remainingDays}d`;
    if (weeks > 0) return `${weeks}w`;
    return `${totalDays}d`;
  }

  // For infants (< 1 year), show months, weeks, days
  if (age.years === 0) {
    const weeks = Math.floor(age.days / 7);
    const remainingDays = age.days % 7;
    const parts: string[] = [`${age.months}m`];
    if (weeks > 0) parts.push(`${weeks}w`);
    if (remainingDays > 0) parts.push(`${remainingDays}d`);
    return parts.join(' ');
  }

  // For children and adults, show years, months, days
  const parts: string[] = [`${age.years}y`];
  if (age.months > 0) parts.push(`${age.months}m`);
  if (age.days > 0) parts.push(`${age.days}d`);
  return parts.join(' ');
}

export function formatPatientName(patient: Patient | PatientDTO): string {
  const parts = [patient.surname, patient.first_name];
  if (patient.middle_name) parts.push(patient.middle_name);
  return parts.join(' ');
}

export function getPatientInitials(patient: Patient | PatientDTO): string {
  return `${patient.first_name.charAt(0)}${patient.surname.charAt(0)}`.toUpperCase();
}
