import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const GASTROENTEROLOGY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'gastro-os-liver',
    specialty_code: 'GASTROENTEROLOGY',
    set_name: 'Liver Disease Screen',
    description: 'Comprehensive hepatic investigation panel',
    clinical_scenario: 'Jaundice, hepatomegaly, or elevated liver enzymes',
    orders: {
      lab_tests: [
        {
          name: 'Liver Function Tests (LFTs)',
          code: 'LFT',
          specimen_type: 'Blood',
        },
        {
          name: 'Hepatitis B Surface Antigen (HBsAg)',
          code: 'HBSAG',
          specimen_type: 'Blood',
        },
        { name: 'Anti-HCV Antibodies', code: 'HCV_AB', specimen_type: 'Blood' },
        { name: 'Anti-HAV IgM', code: 'HAV_IGM', specimen_type: 'Blood' },
        {
          name: 'ANA / AMA / SMA (Autoimmune Screen)',
          code: 'AUTOIM',
          specimen_type: 'Blood',
        },
        {
          name: 'Iron Studies (Ferritin, TIBC)',
          code: 'IRON',
          specimen_type: 'Blood',
        },
        {
          name: 'AFP (Alpha-Fetoprotein)',
          code: 'AFP',
          specimen_type: 'Blood',
        },
        {
          name: 'Coagulation Screen (PT/INR, APTT)',
          code: 'COAG',
          specimen_type: 'Blood',
        },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'Liver / Abdominal Ultrasound',
          code: 'USS_ABD',
          modality: 'Ultrasound',
          body_part: 'Abdomen',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'gastro-os-upper-gi',
    specialty_code: 'GASTROENTEROLOGY',
    set_name: 'Upper GI Workup',
    description: 'Investigation panel for upper gastrointestinal symptoms',
    clinical_scenario: 'Dyspepsia, epigastric pain, haematemesis, or dysphagia',
    orders: {
      lab_tests: [
        {
          name: 'H. pylori Stool Antigen',
          code: 'HPYL_SA',
          specimen_type: 'Stool',
        },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'LFTs', code: 'LFT', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'Oesophagogastroduodenoscopy (OGD)',
          code: 'OGD',
          modality: 'Endoscopy',
          body_part: 'Upper GI',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'gastro-os-lower-gi',
    specialty_code: 'GASTROENTEROLOGY',
    set_name: 'Lower GI Workup',
    description:
      'Investigation panel for lower gastrointestinal symptoms or colorectal screening',
    clinical_scenario:
      'Rectal bleeding, change in bowel habit, or colorectal screening',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'Stool Occult Blood (FOBT)',
          code: 'FOBT',
          specimen_type: 'Stool',
        },
        { name: 'Stool M/C/S', code: 'STOOL_MCS', specimen_type: 'Stool' },
        { name: 'CEA', code: 'CEA', specimen_type: 'Blood' },
        { name: 'CRP / ESR', code: 'INFLAM', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'Colonoscopy',
          code: 'COLON',
          modality: 'Endoscopy',
          body_part: 'Colon / Rectum',
        },
        {
          name: 'CT Abdomen & Pelvis',
          code: 'CT_ABD_PELV',
          modality: 'CT',
          body_part: 'Abdomen and Pelvis',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'gastro-os-pancreatitis',
    specialty_code: 'GASTROENTEROLOGY',
    set_name: 'Pancreatitis Workup',
    description: 'Investigation panel for acute or chronic pancreatitis',
    clinical_scenario:
      'Severe epigastric pain radiating to back, vomiting, or elevated amylase',
    orders: {
      lab_tests: [
        { name: 'Serum Amylase', code: 'AMYL', specimen_type: 'Blood' },
        { name: 'Lipase', code: 'LIPASE', specimen_type: 'Blood' },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'LFTs + Bilirubin', code: 'LFT', specimen_type: 'Blood' },
        { name: 'Calcium', code: 'CA', specimen_type: 'Blood' },
        { name: 'Triglycerides', code: 'TG', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'CT Abdomen (Pancreas Protocol)',
          code: 'CT_PANC',
          modality: 'CT',
          body_part: 'Abdomen / Pancreas',
        },
        {
          name: 'MRCP',
          code: 'MRCP',
          modality: 'MRI',
          body_part: 'Hepatobiliary / Pancreatic',
        },
        {
          name: 'Abdominal Ultrasound',
          code: 'USS_ABD',
          modality: 'Ultrasound',
          body_part: 'Abdomen',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
