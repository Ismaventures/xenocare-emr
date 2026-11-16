import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const PAEDIATRICS_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'paed-os-neonatal',
    specialty_code: 'PAEDIATRICS',
    set_name: 'Neonatal Workup',
    description:
      'Investigation panel for a neonate with suspected infection, jaundice, or metabolic issues',
    clinical_scenario:
      'Neonate (<28 days) — fever, poor feeding, jaundice, or abnormal newborn screen',
    orders: {
      lab_tests: [
        {
          name: 'Full Blood Count + Differential',
          code: 'FBC',
          specimen_type: 'Blood',
        },
        { name: 'CRP', code: 'CRP', specimen_type: 'Blood' },
        { name: 'Blood Culture', code: 'BC', specimen_type: 'Blood' },
        {
          name: 'Urea & Electrolytes + Glucose',
          code: 'UEG',
          specimen_type: 'Blood',
        },
        {
          name: 'Serum Bilirubin (Total + Direct)',
          code: 'BILI',
          specimen_type: 'Blood',
        },
        {
          name: 'Blood Gas (Capillary / Arterial)',
          code: 'ABG',
          specimen_type: 'Blood',
        },
        {
          name: 'Urine (M&CS)',
          code: 'URIN_MC',
          specimen_type: 'Urine (bag / catheter)',
        },
        {
          name: 'Lumbar Puncture (if meningitis suspect)',
          code: 'LP',
          specimen_type: 'CSF',
        },
      ],
      imaging: [
        {
          name: 'Chest X-Ray',
          code: 'CXR',
          modality: 'X-Ray',
          body_part: 'Chest',
        },
        {
          name: 'Cranial Ultrasound',
          code: 'CRANIAL_USS',
          modality: 'Ultrasound',
          body_part: 'Brain',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'paed-os-febrile-child',
    specialty_code: 'PAEDIATRICS',
    set_name: 'Febrile Child',
    description:
      'Investigation panel for a febrile child with suspected bacterial infection',
    clinical_scenario:
      'Child with fever >38°C; no obvious source, or signs of serious bacterial infection',
    orders: {
      lab_tests: [
        {
          name: 'Full Blood Count + Differential',
          code: 'FBC',
          specimen_type: 'Blood',
        },
        { name: 'CRP', code: 'CRP', specimen_type: 'Blood' },
        { name: 'Blood Culture', code: 'BC', specimen_type: 'Blood' },
        { name: 'Urine (M&CS)', code: 'URIN_MC', specimen_type: 'Urine' },
        {
          name: 'Malaria RDT (if endemic area)',
          code: 'MAL_RDT',
          specimen_type: 'Blood',
        },
        {
          name: 'Malaria Film (Thick & Thin)',
          code: 'MAL_FILM',
          specimen_type: 'Blood',
        },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'Blood Glucose', code: 'BG', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'Chest X-Ray (if respiratory signs)',
          code: 'CXR',
          modality: 'X-Ray',
          body_part: 'Chest',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'paed-os-growth',
    specialty_code: 'PAEDIATRICS',
    set_name: 'Growth & Developmental Assessment',
    description:
      'Investigation panel for failure to thrive or growth faltering',
    clinical_scenario:
      'Child with weight or height below 3rd centile, or crossing centile lines downward',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'Urea & Electrolytes + eGFR',
          code: 'UE_EGFR',
          specimen_type: 'Blood',
        },
        {
          name: 'Thyroid Function (TSH, fT4)',
          code: 'TFT',
          specimen_type: 'Blood',
        },
        {
          name: 'IGF-1 / IGFBP-3 (Growth Hormone screen)',
          code: 'GH_SCREEN',
          specimen_type: 'Blood',
        },
        {
          name: 'Coeliac Screen (tTG IgA + total IgA)',
          code: 'COELIAC',
          specimen_type: 'Blood',
        },
        {
          name: 'Stool M&CS + Ova & Parasites',
          code: 'STOOL',
          specimen_type: 'Stool',
        },
      ],
      imaging: [
        {
          name: 'Left Hand / Wrist X-Ray (Bone Age)',
          code: 'BONE_AGE',
          modality: 'X-Ray',
          body_part: 'Left hand / wrist',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
