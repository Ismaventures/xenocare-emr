/**
 * Clinical Export System - JSON Exporter
 * NDC MEDICAL CENTRE EMR
 *
 * HL7 FHIR-compatible JSON export for system integration and interoperability
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

import type { PatientJourneyExport, MultiPatientExport } from '../api';
import type { JSONExportOptions, ExportModule } from '../types';
import { getICD10ChapterCode } from '../standards';

// ==================== FHIR TYPES ====================

interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
    source?: string;
  };
  identifier?: FHIRIdentifier[];
  status?: string;
}

interface FHIRIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: {
    coding?: FHIRCoding[];
    text?: string;
  };
  system?: string;
  value?: string;
  period?: FHIRPeriod;
}

interface FHIRCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

interface FHIRPeriod {
  start?: string;
  end?: string;
}

interface FHIRReference {
  reference?: string;
  type?: string;
  display?: string;
}

interface FHIRHumanName {
  use?:
    | 'usual'
    | 'official'
    | 'temp'
    | 'nickname'
    | 'anonymous'
    | 'old'
    | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FHIRPeriod;
}

interface FHIRAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface FHIRContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
}

// ==================== FHIR RESOURCE INTERFACES ====================

interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  active?: boolean;
  name?: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: FHIRAddress[];
  maritalStatus?: {
    coding?: FHIRCoding[];
    text?: string;
  };
  contact?: {
    relationship?: { coding?: FHIRCoding[]; text?: string }[];
    name?: FHIRHumanName;
    telecom?: FHIRContactPoint[];
  }[];
  extension?: {
    url: string;
    valueString?: string;
    valueCode?: string;
    valueInteger?: number;
  }[];
}

interface FHIREncounter extends FHIRResource {
  resourceType: 'Encounter';
  class: FHIRCoding;
  type?: { coding?: FHIRCoding[]; text?: string }[];
  subject: FHIRReference;
  participant?: {
    type?: { coding?: FHIRCoding[] }[];
    individual?: FHIRReference;
  }[];
  period?: FHIRPeriod;
  reasonCode?: { coding?: FHIRCoding[]; text?: string }[];
  diagnosis?: {
    condition: FHIRReference;
    use?: { coding?: FHIRCoding[] };
    rank?: number;
  }[];
  location?: { location: FHIRReference; status?: string }[];
  serviceProvider?: FHIRReference;
}

interface FHIRCondition extends FHIRResource {
  resourceType: 'Condition';
  clinicalStatus?: {
    coding: FHIRCoding[];
  };
  verificationStatus?: {
    coding: FHIRCoding[];
  };
  category?: { coding?: FHIRCoding[] }[];
  code: {
    coding?: FHIRCoding[];
    text: string;
  };
  subject: FHIRReference;
  encounter?: FHIRReference;
  onsetDateTime?: string;
  recordedDate?: string;
  recorder?: FHIRReference;
  note?: { text: string }[];
}

interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  category?: { coding?: FHIRCoding[] }[];
  code: {
    coding?: FHIRCoding[];
    text?: string;
  };
  subject: FHIRReference;
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  issued?: string;
  performer?: FHIRReference[];
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  interpretation?: { coding?: FHIRCoding[] }[];
  referenceRange?: {
    low?: { value?: number; unit?: string };
    high?: { value?: number; unit?: string };
    text?: string;
  }[];
  component?: {
    code: { coding?: FHIRCoding[]; text?: string };
    valueQuantity?: { value?: number; unit?: string };
  }[];
}

interface FHIRMedicationRequest extends FHIRResource {
  resourceType: 'MedicationRequest';
  intent:
    | 'proposal'
    | 'plan'
    | 'order'
    | 'original-order'
    | 'reflex-order'
    | 'filler-order'
    | 'instance-order'
    | 'option';
  medicationCodeableConcept?: {
    coding?: FHIRCoding[];
    text: string;
  };
  subject: FHIRReference;
  encounter?: FHIRReference;
  authoredOn?: string;
  requester?: FHIRReference;
  dosageInstruction?: {
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: string;
        duration?: number;
        durationUnit?: string;
      };
    };
    route?: { coding?: FHIRCoding[]; text?: string };
    doseAndRate?: {
      doseQuantity?: { value?: number; unit?: string };
    }[];
  }[];
  dispenseRequest?: {
    quantity?: { value?: number; unit?: string };
    expectedSupplyDuration?: { value?: number; unit?: string };
  };
  substitution?: { allowedBoolean?: boolean };
}

interface FHIRServiceRequest extends FHIRResource {
  resourceType: 'ServiceRequest';
  intent:
    | 'proposal'
    | 'plan'
    | 'directive'
    | 'order'
    | 'original-order'
    | 'reflex-order'
    | 'filler-order'
    | 'instance-order'
    | 'option';
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  code: {
    coding?: FHIRCoding[];
    text: string;
  };
  subject: FHIRReference;
  encounter?: FHIRReference;
  authoredOn?: string;
  requester?: FHIRReference;
  reasonCode?: { coding?: FHIRCoding[]; text?: string }[];
  bodySite?: { coding?: FHIRCoding[]; text?: string }[];
  note?: { text: string }[];
}

interface FHIRDiagnosticReport extends FHIRResource {
  resourceType: 'DiagnosticReport';
  category?: { coding?: FHIRCoding[] }[];
  code: {
    coding?: FHIRCoding[];
    text?: string;
  };
  subject: FHIRReference;
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  issued?: string;
  performer?: FHIRReference[];
  result?: FHIRReference[];
  conclusion?: string;
  conclusionCode?: { coding?: FHIRCoding[] }[];
}

interface FHIRProcedure extends FHIRResource {
  resourceType: 'Procedure';
  code: {
    coding?: FHIRCoding[];
    text: string;
  };
  subject: FHIRReference;
  encounter?: FHIRReference;
  performedDateTime?: string;
  performer?: {
    actor: FHIRReference;
    function?: { coding?: FHIRCoding[] };
  }[];
  outcome?: { coding?: FHIRCoding[]; text?: string };
  complication?: { coding?: FHIRCoding[]; text?: string }[];
  note?: { text: string }[];
}

interface FHIRBundle {
  resourceType: 'Bundle';
  id?: string;
  type:
    | 'document'
    | 'message'
    | 'transaction'
    | 'transaction-response'
    | 'batch'
    | 'batch-response'
    | 'history'
    | 'searchset'
    | 'collection';
  timestamp?: string;
  total?: number;
  link?: { relation: string; url: string }[];
  entry?: {
    fullUrl?: string;
    resource: FHIRResource;
  }[];
  meta?: {
    lastUpdated?: string;
    source?: string;
  };
}

// ==================== FHIR CONVERSION FUNCTIONS ====================

/**
 * Convert patient data to FHIR Patient resource
 */
function toFHIRPatient(patient: PatientJourneyExport['patient']): FHIRPatient {
  const names: FHIRHumanName[] = [
    {
      use: 'official',
      family: patient.surname,
      given: [patient.first_name, patient.middle_name].filter(
        Boolean,
      ) as string[],
      text: `${patient.first_name} ${patient.middle_name || ''} ${patient.surname}`.trim(),
    },
  ];

  const telecoms: FHIRContactPoint[] = [];
  if (patient.contact_phone) {
    telecoms.push({
      system: 'phone',
      value: patient.contact_phone,
      use: 'home',
    });
  }
  if (patient.contact_email) {
    telecoms.push({ system: 'email', value: patient.contact_email });
  }

  const addresses: FHIRAddress[] = [];
  if (patient.address) {
    addresses.push({
      use: 'home',
      type: 'physical',
      text: patient.address,
      city: patient.city || undefined,
      state: patient.state || undefined,
      country: patient.nationality || 'Nigeria',
    });
  }

  const extensions: FHIRPatient['extension'] = [];
  if (patient.blood_group) {
    extensions.push({
      url: 'http://hl7.org/fhir/StructureDefinition/patient-bloodType',
      valueString: patient.blood_group,
    });
  }
  if (patient.genotype) {
    extensions.push({
      url: 'http://ndc-emr.ng/fhir/StructureDefinition/genotype',
      valueString: patient.genotype,
    });
  }
  if (patient.patient_category) {
    extensions.push({
      url: 'http://ndc-emr.ng/fhir/StructureDefinition/patient-category',
      valueString: patient.patient_category,
    });
  }

  return {
    resourceType: 'Patient',
    id: patient.id,
    meta: {
      lastUpdated: patient.updated_at || patient.created_at,
      source: 'ndc-emr',
    },
    identifier: [
      {
        use: 'official',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR',
            },
          ],
          text: 'Medical Record Number',
        },
        system: 'http://ndc-emr.ng/fhir/patient-id',
        value: patient.emr_number,
      },
      ...(patient.nhis_number
        ? [
            {
              use: 'secondary' as const,
              type: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                    code: 'NI',
                  },
                ],
                text: 'NHIS Number',
              },
              system: 'http://nhis.gov.ng/fhir/beneficiary-id',
              value: patient.nhis_number,
            },
          ]
        : []),
    ],
    active: patient.status === 'active',
    name: names,
    telecom: telecoms.length > 0 ? telecoms : undefined,
    gender: patient.gender?.toLowerCase() as
      | 'male'
      | 'female'
      | 'other'
      | 'unknown',
    birthDate: patient.date_of_birth,
    address: addresses.length > 0 ? addresses : undefined,
    maritalStatus: patient.marital_status
      ? {
          text: patient.marital_status,
        }
      : undefined,
    contact: patient.emergency_contact
      ? [
          {
            relationship: [{ text: patient.emergency_contact.relationship }],
            name: { text: patient.emergency_contact.name },
            telecom: [
              { system: 'phone', value: patient.emergency_contact.phone },
            ],
          },
        ]
      : undefined,
    extension: extensions.length > 0 ? extensions : undefined,
  };
}

/**
 * Convert encounter to FHIR Encounter resource
 */
function toFHIREncounter(
  encounter: PatientJourneyExport['encounters'][0],
  patientRef: FHIRReference,
): FHIREncounter {
  const classMapping: Record<string, FHIRCoding> = {
    outpatient: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory',
    },
    inpatient: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'IMP',
      display: 'inpatient encounter',
    },
    emergency: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'EMER',
      display: 'emergency',
    },
  };

  const statusMapping: Record<string, string> = {
    active: 'in-progress',
    completed: 'finished',
    cancelled: 'cancelled',
    discharged: 'finished',
  };

  return {
    resourceType: 'Encounter',
    id: encounter.id,
    meta: {
      lastUpdated: encounter.updated_at || encounter.created_at,
      source: 'ndc-emr',
    },
    identifier: encounter.encounter_number
      ? [
          {
            system: 'http://ndc-emr.ng/fhir/encounter-id',
            value: encounter.encounter_number,
          },
        ]
      : undefined,
    status: statusMapping[encounter.status] || encounter.status,
    class: classMapping[encounter.encounter_type] || {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
    },
    type: [
      {
        text: encounter.encounter_type,
      },
    ],
    subject: patientRef,
    participant: encounter.attending_doctor_name
      ? [
          {
            type: [
              {
                coding: [
                  {
                    system:
                      'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                    code: 'ATND',
                    display: 'attender',
                  },
                ],
              },
            ],
            individual: {
              display: encounter.attending_doctor_name,
            },
          },
        ]
      : undefined,
    period: {
      start: encounter.encounter_date,
    },
    reasonCode: encounter.chief_complaint
      ? [
          {
            text: encounter.chief_complaint,
          },
        ]
      : undefined,
    location: encounter.department_name
      ? [
          {
            location: {
              display: `${encounter.department_name}${encounter.clinic_name ? ` - ${encounter.clinic_name}` : ''}`,
            },
          },
        ]
      : undefined,
    serviceProvider: encounter.facility_name
      ? { display: encounter.facility_name }
      : undefined,
  };
}

/**
 * Convert diagnosis to FHIR Condition resource
 */
function toFHIRCondition(
  diagnosis: PatientJourneyExport['diagnoses'][0],
  patientRef: FHIRReference,
  encounterRef?: FHIRReference,
): FHIRCondition {
  const verificationStatusMapping: Record<string, string> = {
    provisional: 'provisional',
    confirmed: 'confirmed',
    working: 'provisional',
    final: 'confirmed',
    differential: 'differential',
  };

  return {
    resourceType: 'Condition',
    id: diagnosis.id,
    meta: {
      lastUpdated: diagnosis.updated_at || diagnosis.created_at,
      source: 'ndc-emr',
    },
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code:
            verificationStatusMapping[diagnosis.certainty || ''] || 'confirmed',
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code:
              diagnosis.diagnosis_type === 'primary'
                ? 'encounter-diagnosis'
                : 'problem-list-item',
          },
        ],
      },
    ],
    code: {
      coding: diagnosis.icd10_code
        ? [
            {
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: diagnosis.icd10_code,
              display: diagnosis.diagnosis_text,
            },
          ]
        : undefined,
      text: diagnosis.diagnosis_text,
    },
    subject: patientRef,
    encounter: encounterRef,
    onsetDateTime: diagnosis.diagnosed_at,
    recordedDate: diagnosis.created_at,
    recorder: diagnosis.diagnosed_by_name
      ? { display: diagnosis.diagnosed_by_name }
      : undefined,
    note: diagnosis.notes ? [{ text: diagnosis.notes }] : undefined,
  };
}

/**
 * Convert vitals to FHIR Observation resources
 */
function toFHIRVitalsObservations(
  vitals: PatientJourneyExport['vitals'][0],
  patientRef: FHIRReference,
  encounterRef?: FHIRReference,
): FHIRObservation[] {
  const observations: FHIRObservation[] = [];
  const baseObs = {
    subject: patientRef,
    encounter: encounterRef,
    effectiveDateTime: vitals.recorded_at,
    performer: vitals.recorded_by_name
      ? [{ display: vitals.recorded_by_name }]
      : undefined,
  };

  // Blood Pressure (compound observation)
  if (
    vitals.blood_pressure_systolic !== undefined ||
    vitals.blood_pressure_diastolic !== undefined
  ) {
    observations.push({
      resourceType: 'Observation',
      id: `${vitals.id}-bp`,
      meta: { source: 'ndc-emr' },
      status: 'final',
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '85354-9',
            display: 'Blood pressure panel with all children optional',
          },
        ],
        text: 'Blood Pressure',
      },
      ...baseObs,
      component: [
        ...(vitals.blood_pressure_systolic !== undefined
          ? [
              {
                code: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '8480-6',
                      display: 'Systolic blood pressure',
                    },
                  ],
                },
                valueQuantity: {
                  value: vitals.blood_pressure_systolic,
                  unit: 'mmHg',
                },
              },
            ]
          : []),
        ...(vitals.blood_pressure_diastolic !== undefined
          ? [
              {
                code: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '8462-4',
                      display: 'Diastolic blood pressure',
                    },
                  ],
                },
                valueQuantity: {
                  value: vitals.blood_pressure_diastolic,
                  unit: 'mmHg',
                },
              },
            ]
          : []),
      ],
    });
  }

  // Temperature
  if (vitals.temperature !== undefined) {
    observations.push({
      resourceType: 'Observation',
      id: `${vitals.id}-temp`,
      meta: { source: 'ndc-emr' },
      status: 'final',
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8310-5',
            display: 'Body temperature',
          },
        ],
        text: 'Body Temperature',
      },
      ...baseObs,
      valueQuantity: {
        value: vitals.temperature,
        unit: '°C',
        system: 'http://unitsofmeasure.org',
        code: 'Cel',
      },
    });
  }

  // Pulse Rate
  if (vitals.pulse_rate !== undefined) {
    observations.push({
      resourceType: 'Observation',
      id: `${vitals.id}-hr`,
      meta: { source: 'ndc-emr' },
      status: 'final',
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
            },
          ],
        },
      ],
      code: {
        coding: [
          { system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' },
        ],
        text: 'Heart Rate',
      },
      ...baseObs,
      valueQuantity: {
        value: vitals.pulse_rate,
        unit: '/min',
        system: 'http://unitsofmeasure.org',
        code: '/min',
      },
    });
  }

  // Respiratory Rate
  if (vitals.respiratory_rate !== undefined) {
    observations.push({
      resourceType: 'Observation',
      id: `${vitals.id}-rr`,
      meta: { source: 'ndc-emr' },
      status: 'final',
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '9279-1',
            display: 'Respiratory rate',
          },
        ],
        text: 'Respiratory Rate',
      },
      ...baseObs,
      valueQuantity: {
        value: vitals.respiratory_rate,
        unit: '/min',
        system: 'http://unitsofmeasure.org',
        code: '/min',
      },
    });
  }

  // Oxygen Saturation
  if (vitals.oxygen_saturation !== undefined) {
    observations.push({
      resourceType: 'Observation',
      id: `${vitals.id}-spo2`,
      meta: { source: 'ndc-emr' },
      status: 'final',
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '2708-6',
            display: 'Oxygen saturation in Arterial blood',
          },
        ],
        text: 'Oxygen Saturation',
      },
      ...baseObs,
      valueQuantity: {
        value: vitals.oxygen_saturation,
        unit: '%',
        system: 'http://unitsofmeasure.org',
        code: '%',
      },
    });
  }

  // Weight
  if (vitals.weight !== undefined) {
    observations.push({
      resourceType: 'Observation',
      id: `${vitals.id}-weight`,
      meta: { source: 'ndc-emr' },
      status: 'final',
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '29463-7',
            display: 'Body weight',
          },
        ],
        text: 'Body Weight',
      },
      ...baseObs,
      valueQuantity: {
        value: vitals.weight,
        unit: 'kg',
        system: 'http://unitsofmeasure.org',
        code: 'kg',
      },
    });
  }

  // Height
  if (vitals.height !== undefined) {
    observations.push({
      resourceType: 'Observation',
      id: `${vitals.id}-height`,
      meta: { source: 'ndc-emr' },
      status: 'final',
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8302-2',
            display: 'Body height',
          },
        ],
        text: 'Body Height',
      },
      ...baseObs,
      valueQuantity: {
        value: vitals.height,
        unit: 'cm',
        system: 'http://unitsofmeasure.org',
        code: 'cm',
      },
    });
  }

  return observations;
}

/**
 * Convert prescription to FHIR MedicationRequest
 */
function toFHIRMedicationRequest(
  prescription: PatientJourneyExport['prescriptions'][0],
  patientRef: FHIRReference,
  encounterRef?: FHIRReference,
): FHIRMedicationRequest {
  return {
    resourceType: 'MedicationRequest',
    id: prescription.id,
    meta: {
      lastUpdated: prescription.updated_at || prescription.created_at,
      source: 'ndc-emr',
    },
    status:
      prescription.status === 'Dispensed'
        ? 'completed'
        : prescription.status === 'Cancelled'
          ? 'cancelled'
          : 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: prescription.atc_code
        ? [
            {
              system: 'http://www.whocc.no/atc',
              code: prescription.atc_code,
              display: prescription.drug_name,
            },
          ]
        : undefined,
      text: prescription.drug_name,
    },
    subject: patientRef,
    encounter: encounterRef,
    authoredOn: prescription.prescribed_at,
    requester: prescription.prescribed_by_name
      ? { display: prescription.prescribed_by_name }
      : undefined,
    dosageInstruction: [
      {
        text: `${prescription.dosage || ''} ${prescription.route} ${prescription.frequency}`.trim(),
        route: {
          text: prescription.route,
        },
      },
    ],
    dispenseRequest: {
      quantity: {
        value: prescription.quantity_prescribed,
        unit: 'units',
      },
    },
  };
}

/**
 * Convert lab request to FHIR ServiceRequest
 */
function toFHIRLabServiceRequest(
  labRequest: PatientJourneyExport['labRequests'][0],
  patientRef: FHIRReference,
  encounterRef?: FHIRReference,
): FHIRServiceRequest {
  return {
    resourceType: 'ServiceRequest',
    id: labRequest.id,
    meta: {
      lastUpdated: labRequest.updated_at || labRequest.created_at,
      source: 'ndc-emr',
    },
    status:
      labRequest.status === 'Completed'
        ? 'completed'
        : labRequest.status === 'Cancelled'
          ? 'revoked'
          : 'active',
    intent: 'order',
    priority:
      labRequest.priority === 'Urgent'
        ? 'urgent'
        : labRequest.priority === 'STAT'
          ? 'stat'
          : 'routine',
    code: {
      coding: labRequest.loinc_code
        ? [
            {
              system: 'http://loinc.org',
              code: labRequest.loinc_code,
              display: labRequest.test_name,
            },
          ]
        : undefined,
      text: labRequest.test_name,
    },
    subject: patientRef,
    encounter: encounterRef,
    authoredOn: labRequest.ordered_at,
    requester: labRequest.ordered_by_name
      ? { display: labRequest.ordered_by_name }
      : undefined,
    note: labRequest.clinical_notes
      ? [{ text: labRequest.clinical_notes }]
      : undefined,
  };
}

/**
 * Convert procedure to FHIR Procedure
 */
function toFHIRProcedure(
  procedure: PatientJourneyExport['procedures'][0],
  patientRef: FHIRReference,
  encounterRef?: FHIRReference,
): FHIRProcedure {
  return {
    resourceType: 'Procedure',
    id: procedure.id,
    meta: {
      lastUpdated: procedure.updated_at || procedure.created_at,
      source: 'ndc-emr',
    },
    status:
      procedure.status === 'completed'
        ? 'completed'
        : procedure.status === 'cancelled'
          ? 'not-done'
          : 'in-progress',
    code: {
      coding: [
        ...(procedure.cpt_code
          ? [
              {
                system: 'http://www.ama-assn.org/go/cpt',
                code: procedure.cpt_code,
                display: procedure.procedure_name,
              },
            ]
          : []),
        ...(procedure.icd10_pcs_code
          ? [
              {
                system: 'http://www.cms.gov/Medicare/Coding/ICD10',
                code: procedure.icd10_pcs_code,
                display: procedure.procedure_name,
              },
            ]
          : []),
      ],
      text: procedure.procedure_name,
    },
    subject: patientRef,
    encounter: encounterRef,
    performedDateTime: procedure.performed_at || procedure.scheduled_at,
    performer: procedure.performed_by_name
      ? [
          {
            actor: { display: procedure.performed_by_name },
          },
        ]
      : undefined,
    outcome: procedure.outcome ? { text: procedure.outcome } : undefined,
    complication: procedure.complications
      ? [{ text: procedure.complications }]
      : undefined,
    note: procedure.notes ? [{ text: procedure.notes }] : undefined,
  };
}

// ==================== JSON EXPORTER CLASS ====================

/**
 * Clinical JSON Exporter class
 */
export class ClinicalJSONExporter {
  private options: JSONExportOptions;

  constructor(options: JSONExportOptions) {
    this.options = options;
  }

  /**
   * Generate FHIR Bundle
   */
  public generateFHIRBundle(data: PatientJourneyExport): FHIRBundle {
    const entries: FHIRBundle['entry'] = [];
    const patientRef: FHIRReference = {
      reference: `Patient/${data.patient.id}`,
      display: `${data.patient.first_name} ${data.patient.surname}`,
    };

    // Add Patient resource
    entries.push({
      fullUrl: `urn:uuid:${data.patient.id}`,
      resource: toFHIRPatient(data.patient),
    });

    // Create encounter references map
    const encounterRefMap = new Map<string, FHIRReference>();

    // Add Encounter resources
    for (const encounter of data.encounters) {
      const encRef: FHIRReference = {
        reference: `Encounter/${encounter.id}`,
        display:
          encounter.encounter_number ||
          `Encounter on ${encounter.encounter_date}`,
      };
      encounterRefMap.set(encounter.id, encRef);

      entries.push({
        fullUrl: `urn:uuid:${encounter.id}`,
        resource: toFHIREncounter(encounter, patientRef),
      });
    }

    // Add Condition resources (diagnoses)
    for (const diagnosis of data.diagnoses) {
      const encRef = diagnosis.encounter_id
        ? encounterRefMap.get(diagnosis.encounter_id)
        : undefined;
      entries.push({
        fullUrl: `urn:uuid:${diagnosis.id}`,
        resource: toFHIRCondition(diagnosis, patientRef, encRef),
      });
    }

    // Add Observation resources (vitals)
    for (const vital of data.vitals) {
      const encRef = vital.encounter_id
        ? encounterRefMap.get(vital.encounter_id)
        : undefined;
      const observations = toFHIRVitalsObservations(vital, patientRef, encRef);
      for (const obs of observations) {
        entries.push({
          fullUrl: `urn:uuid:${obs.id}`,
          resource: obs,
        });
      }
    }

    // Add MedicationRequest resources
    for (const prescription of data.prescriptions) {
      const encRef = prescription.encounter_id
        ? encounterRefMap.get(prescription.encounter_id)
        : undefined;
      entries.push({
        fullUrl: `urn:uuid:${prescription.id}`,
        resource: toFHIRMedicationRequest(prescription, patientRef, encRef),
      });
    }

    // Add ServiceRequest resources (lab)
    for (const labRequest of data.labRequests) {
      const encRef = labRequest.encounter_id
        ? encounterRefMap.get(labRequest.encounter_id)
        : undefined;
      entries.push({
        fullUrl: `urn:uuid:${labRequest.id}`,
        resource: toFHIRLabServiceRequest(labRequest, patientRef, encRef),
      });
    }

    // Add Procedure resources
    for (const procedure of data.procedures) {
      const encRef = procedure.encounter_id
        ? encounterRefMap.get(procedure.encounter_id)
        : undefined;
      entries.push({
        fullUrl: `urn:uuid:${procedure.id}`,
        resource: toFHIRProcedure(procedure, patientRef, encRef),
      });
    }

    return {
      resourceType: 'Bundle',
      id: data.exportMetadata.exportId,
      type: 'collection',
      timestamp: new Date().toISOString(),
      total: entries.length,
      meta: {
        lastUpdated: new Date().toISOString(),
        source: 'ndc-emr',
      },
      entry: entries,
    };
  }

  /**
   * Generate raw JSON export (non-FHIR)
   */
  public generateRawJSON(data: PatientJourneyExport): PatientJourneyExport {
    return data;
  }

  /**
   * Generate export based on options
   */
  public async generate(data: PatientJourneyExport): Promise<Blob> {
    const output = this.options.includeFHIRFormat
      ? this.generateFHIRBundle(data)
      : this.generateRawJSON(data);

    const jsonString = this.options.pretty
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);

    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Generate and download JSON
   */
  public async download(
    data: PatientJourneyExport,
    filename?: string,
  ): Promise<void> {
    const blob = await this.generate(data);

    const suffix = this.options.includeFHIRFormat ? '_FHIR' : '';
    const defaultFilename = `${data.patient.emr_number}_Clinical_Export${suffix}_${data.exportMetadata.exportDate}.json`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}

// ==================== EXPORT FUNCTIONS ====================

/**
 * Generate clinical export JSON
 */
export async function generateClinicalExportJSON(
  data: PatientJourneyExport,
  options?: Partial<JSONExportOptions>,
): Promise<Blob> {
  const defaultOptions: JSONExportOptions = {
    fhirCompliant: true,
    prettyPrint: true,
    includeMetadata: true,
    includeNulls: false,
  };

  const exporter = new ClinicalJSONExporter({ ...defaultOptions, ...options });
  return exporter.generate(data);
}

/**
 * Download clinical export JSON
 */
export async function downloadClinicalExportJSON(
  data: PatientJourneyExport,
  options?: Partial<JSONExportOptions>,
  filename?: string,
): Promise<void> {
  const defaultOptions: JSONExportOptions = {
    fhirCompliant: true,
    prettyPrint: true,
    includeMetadata: true,
    includeNulls: false,
  };

  const exporter = new ClinicalJSONExporter({ ...defaultOptions, ...options });
  return exporter.download(data, filename);
}

/**
 * Generate FHIR Bundle from patient journey
 */
export function generateFHIRBundle(data: PatientJourneyExport): FHIRBundle {
  const exporter = new ClinicalJSONExporter({
    fhirCompliant: true,
    prettyPrint: false,
    includeMetadata: true,
    includeNulls: false,
  });
  return exporter.generateFHIRBundle(data);
}

/**
 * Export types for external use
 */
export type {
  FHIRBundle,
  FHIRPatient,
  FHIREncounter,
  FHIRCondition,
  FHIRObservation,
  FHIRMedicationRequest,
  FHIRServiceRequest,
  FHIRProcedure,
  FHIRDiagnosticReport,
};
