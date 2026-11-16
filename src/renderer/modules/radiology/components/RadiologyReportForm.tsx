import React, { useState, useCallback, useMemo } from 'react';
import {
  Save,
  AlertTriangle,
  Scan,
  FileText,
  CheckCircle,
  AlertCircle,
  Upload,
  Trash2,
  Eye,
  Star,
} from 'lucide-react';
import { Select } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';

import {
  RadiologyRequestDTO,
  validateRadiologyReportForm,
  RadiologyReportFormErrors,
  getModalityColor,
  ImagingModality,
  URGENCY_LEVELS,
  UrgencyLevel,
  CreateScanResultDTO,
  VIEW_PLANES,
  ViewPlane,
  UploadScanImageDTO,
} from '../dtos/radiology.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';
import {
  uploadFile,
  generateRadiologyImagePath,
  mapWithConcurrency,
  optimizeRadiologyUploadFile,
} from '../../../utils/storage';
import { useDraftRestore } from '../../../hooks/useDraftRestore';
import ImageGalleryModal, { GalleryImage } from './ImageGalleryModal';

// Image file with metadata
interface ImageFile {
  id: string;
  file: File;
  previewUrl: string | null;
  viewPlane: ViewPlane;
  isKeyImage: boolean;
  sequenceNumber: number;
}

interface ExistingImageItem {
  id: string;
  url: string;
  label: string;
  viewPlane?: string | null;
  notes?: string | null;
  fileName?: string | null;
  isKeyImage?: boolean;
  sequenceNumber?: number | null;
}

// =============================================================================
// Types
// =============================================================================

interface RadiologyReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateScanResultDTO) => Promise<void>;
  isLoading?: boolean;
  request: RadiologyRequestDTO | null;
}

const isPreviewableImage = (file: File): boolean =>
  file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.dcm');

const revokePreviewUrl = (previewUrl: string | null): void => {
  if (!previewUrl || !previewUrl.startsWith('blob:')) return;
  URL.revokeObjectURL(previewUrl);
};

const IMAGE_UPLOAD_CONCURRENCY = 3;

type ReportProfileId =
  | 'general'
  | 'chest-xray'
  | 'obstetric-ultrasound'
  | 'mammography'
  | 'bi-rads'
  | 'li-rads'
  | 'pi-rads'
  | 'ti-rads'
  | 'o-rads'
  | 'co-rads'
  | 'lung-rads'
  | 'cad-rads'
  | 'ni-rads'
  | 'neuro-cross-sectional'
  | 'musculoskeletal'
  | 'abdominal-pelvic-ultrasound';

interface StructuredReportState {
  examQuality: string;
  laterality: string;
  contrastUse: string;
  radiationDose: string;
  limitations: string;
  recommendations: string;
  standardFindings: string;
  standardImpression: string;
  biRadsCategory: string;
  liRadsCategory: string;
  piRadsCategory: string;
  tiRadsCategory: string;
  oRadsCategory: string;
  coRadsCategory: string;
  lungRadsCategory: string;
  cadRadsCategory: string;
  niRadsCategory: string;

  chestCardiomediastinal: string;
  chestLungs: string;
  chestPleura: string;
  chestBones: string;

  obstetricGestationalAge: string;
  obstetricFhr: string;
  obstetricPresentation: string;
  obstetricPlacenta: string;
  obstetricAfi: string;

  mammographyBirads: string;
  mammographyDensity: string;
  mammographyMassCalcification: string;

  neuroHemorrhage: string;
  neuroInfarct: string;
  neuroMassEffect: string;
  neuroMidlineShiftMm: string;

  mskBones: string;
  mskJoints: string;
  mskSoftTissues: string;

  abdominalLiver: string;
  abdominalGallbladder: string;
  abdominalKidneys: string;
  abdominalPelvis: string;
}

interface StructuredSelectOption {
  value: string;
  label: string;
}

const STRUCTURED_OTHER_VALUE = '__other__';

const REPORT_PROFILE_OPTIONS: Array<{ value: ReportProfileId; label: string }> =
  [
    { value: 'general', label: 'General imaging report' },
    { value: 'chest-xray', label: 'Chest X-Ray structured report' },
    { value: 'obstetric-ultrasound', label: 'Obstetric ultrasound report' },
    { value: 'mammography', label: 'Mammography (BI-RADS) report' },
    { value: 'bi-rads', label: 'BI-RADS breast imaging' },
    { value: 'li-rads', label: 'LI-RADS liver imaging' },
    { value: 'pi-rads', label: 'PI-RADS prostate MRI' },
    { value: 'ti-rads', label: 'TI-RADS thyroid ultrasound' },
    { value: 'o-rads', label: 'O-RADS adnexal ultrasound' },
    { value: 'co-rads', label: 'CO-RADS chest CT (COVID)' },
    { value: 'lung-rads', label: 'Lung-RADS screening CT' },
    { value: 'cad-rads', label: 'CAD-RADS coronary CTA' },
    { value: 'ni-rads', label: 'NI-RADS head/neck' },
    { value: 'neuro-cross-sectional', label: 'Neuro CT/MRI report' },
    { value: 'musculoskeletal', label: 'Musculoskeletal report' },
    {
      value: 'abdominal-pelvic-ultrasound',
      label: 'Abdominal/Pelvic ultrasound report',
    },
  ];

const getReportProfileLabel = (profile: ReportProfileId): string => {
  const match = REPORT_PROFILE_OPTIONS.find(
    (option) => option.value === profile,
  );
  return match ? match.label : profile;
};

const REPORT_TECHNIQUE_OPTIONS: StructuredSelectOption[] = [
  {
    value: 'Standard protocol for modality and region',
    label: 'Standard protocol for modality and region',
  },
  { value: 'Non-contrast protocol', label: 'Non-contrast protocol' },
  { value: 'Contrast-enhanced protocol', label: 'Contrast-enhanced protocol' },
  {
    value: 'Pre- and post-contrast protocol',
    label: 'Pre- and post-contrast protocol',
  },
  {
    value: 'Multiphasic CT (arterial/venous/delayed)',
    label: 'Multiphasic CT (arterial/venous/delayed)',
  },
  {
    value: 'Limited study / focused views',
    label: 'Limited study / focused views',
  },
  { value: 'Portable bedside technique', label: 'Portable bedside technique' },
  { value: 'Low-dose protocol', label: 'Low-dose protocol' },
];

const REPORT_COMPARISON_OPTIONS: StructuredSelectOption[] = [
  {
    value: 'No prior studies available for comparison',
    label: 'No prior studies available for comparison',
  },
  {
    value: 'Compared with prior study dated ____',
    label: 'Compared with prior study dated ____',
  },
  { value: 'Compared with prior CT/MRI', label: 'Compared with prior CT/MRI' },
  { value: 'Compared with prior X-ray', label: 'Compared with prior X-ray' },
  {
    value: 'Compared with prior ultrasound',
    label: 'Compared with prior ultrasound',
  },
  {
    value: 'Compared with outside facility study',
    label: 'Compared with outside facility study',
  },
  {
    value: 'Stable compared with prior study',
    label: 'Stable compared with prior study',
  },
  {
    value: 'Interval change since prior study',
    label: 'Interval change since prior study',
  },
];

const createEmptyStructuredReport = (): StructuredReportState => ({
  examQuality: '',
  laterality: '',
  contrastUse: '',
  radiationDose: '',
  limitations: '',
  recommendations: '',
  standardFindings: '',
  standardImpression: '',
  biRadsCategory: '',
  liRadsCategory: '',
  piRadsCategory: '',
  tiRadsCategory: '',
  oRadsCategory: '',
  coRadsCategory: '',
  lungRadsCategory: '',
  cadRadsCategory: '',
  niRadsCategory: '',

  chestCardiomediastinal: '',
  chestLungs: '',
  chestPleura: '',
  chestBones: '',

  obstetricGestationalAge: '',
  obstetricFhr: '',
  obstetricPresentation: '',
  obstetricPlacenta: '',
  obstetricAfi: '',

  mammographyBirads: '',
  mammographyDensity: '',
  mammographyMassCalcification: '',

  neuroHemorrhage: '',
  neuroInfarct: '',
  neuroMassEffect: '',
  neuroMidlineShiftMm: '',

  mskBones: '',
  mskJoints: '',
  mskSoftTissues: '',

  abdominalLiver: '',
  abdominalGallbladder: '',
  abdominalKidneys: '',
  abdominalPelvis: '',
});

const STRUCTURED_FIELD_OPTIONS: Partial<
  Record<keyof StructuredReportState, StructuredSelectOption[]>
> = {
  standardFindings: [
    {
      value: 'No acute abnormality identified',
      label: 'No acute abnormality identified',
    },
    {
      value: 'Study within normal limits',
      label: 'Study within normal limits',
    },
    {
      value: 'Findings consistent with infection/inflammation',
      label: 'Findings consistent with infection/inflammation',
    },
    {
      value: 'Findings suggestive of trauma',
      label: 'Findings suggestive of trauma',
    },
    {
      value: 'Findings consistent with degenerative changes',
      label: 'Findings consistent with degenerative changes',
    },
    {
      value: 'Indeterminate finding requiring correlation',
      label: 'Indeterminate finding requiring correlation',
    },
  ],
  standardImpression: [
    {
      value: 'No acute radiographic abnormality',
      label: 'No acute radiographic abnormality',
    },
    { value: 'Normal study', label: 'Normal study' },
    {
      value: 'Abnormal study as described',
      label: 'Abnormal study as described',
    },
    {
      value: 'Findings suspicious for malignancy',
      label: 'Findings suspicious for malignancy',
    },
    {
      value: 'Findings favor benign etiology',
      label: 'Findings favor benign etiology',
    },
    {
      value: 'Recommend follow-up imaging',
      label: 'Recommend follow-up imaging',
    },
  ],
  biRadsCategory: [
    {
      value: 'BI-RADS 0 - Incomplete, additional imaging needed',
      label: 'BI-RADS 0 - Incomplete',
    },
    { value: 'BI-RADS 1 - Negative', label: 'BI-RADS 1 - Negative' },
    {
      value: 'BI-RADS 2 - Benign finding',
      label: 'BI-RADS 2 - Benign finding',
    },
    {
      value: 'BI-RADS 3 - Probably benign, short-interval follow-up',
      label: 'BI-RADS 3 - Probably benign',
    },
    {
      value: 'BI-RADS 4 - Suspicious abnormality',
      label: 'BI-RADS 4 - Suspicious abnormality',
    },
    {
      value: 'BI-RADS 5 - Highly suggestive of malignancy',
      label: 'BI-RADS 5 - Highly suggestive of malignancy',
    },
    {
      value: 'BI-RADS 6 - Known biopsy-proven malignancy',
      label: 'BI-RADS 6 - Known malignancy',
    },
  ],
  liRadsCategory: [
    {
      value: 'LI-RADS LR-1 - Definitely benign',
      label: 'LI-RADS LR-1 - Definitely benign',
    },
    {
      value: 'LI-RADS LR-2 - Probably benign',
      label: 'LI-RADS LR-2 - Probably benign',
    },
    {
      value: 'LI-RADS LR-3 - Intermediate probability',
      label: 'LI-RADS LR-3 - Intermediate probability',
    },
    {
      value: 'LI-RADS LR-4 - Probably HCC',
      label: 'LI-RADS LR-4 - Probably HCC',
    },
    {
      value: 'LI-RADS LR-5 - Definite HCC',
      label: 'LI-RADS LR-5 - Definite HCC',
    },
    {
      value: 'LI-RADS LR-M - Probably malignant, not specific for HCC',
      label: 'LI-RADS LR-M - Probably malignant',
    },
    {
      value: 'LI-RADS LR-TIV - Tumor in vein',
      label: 'LI-RADS LR-TIV - Tumor in vein',
    },
    {
      value: 'LI-RADS LR-NC - Not categorizable',
      label: 'LI-RADS LR-NC - Not categorizable',
    },
  ],
  piRadsCategory: [
    {
      value: 'PI-RADS 1 - Very low (clinically significant cancer unlikely)',
      label: 'PI-RADS 1 - Very low',
    },
    {
      value: 'PI-RADS 2 - Low (clinically significant cancer unlikely)',
      label: 'PI-RADS 2 - Low',
    },
    {
      value: 'PI-RADS 3 - Intermediate (equivocal)',
      label: 'PI-RADS 3 - Intermediate',
    },
    {
      value: 'PI-RADS 4 - High (clinically significant cancer likely)',
      label: 'PI-RADS 4 - High',
    },
    {
      value:
        'PI-RADS 5 - Very high (clinically significant cancer highly likely)',
      label: 'PI-RADS 5 - Very high',
    },
  ],
  tiRadsCategory: [
    { value: 'TI-RADS TR1 - Benign', label: 'TI-RADS TR1 - Benign' },
    {
      value: 'TI-RADS TR2 - Not suspicious',
      label: 'TI-RADS TR2 - Not suspicious',
    },
    {
      value: 'TI-RADS TR3 - Mildly suspicious',
      label: 'TI-RADS TR3 - Mildly suspicious',
    },
    {
      value: 'TI-RADS TR4 - Moderately suspicious',
      label: 'TI-RADS TR4 - Moderately suspicious',
    },
    {
      value: 'TI-RADS TR5 - Highly suspicious',
      label: 'TI-RADS TR5 - Highly suspicious',
    },
  ],
  oRadsCategory: [
    {
      value: 'O-RADS 0 - Incomplete evaluation',
      label: 'O-RADS 0 - Incomplete',
    },
    { value: 'O-RADS 1 - Normal', label: 'O-RADS 1 - Normal' },
    {
      value: 'O-RADS 2 - Almost certainly benign',
      label: 'O-RADS 2 - Almost certainly benign',
    },
    { value: 'O-RADS 3 - Low risk', label: 'O-RADS 3 - Low risk' },
    {
      value: 'O-RADS 4 - Intermediate risk',
      label: 'O-RADS 4 - Intermediate risk',
    },
    { value: 'O-RADS 5 - High risk', label: 'O-RADS 5 - High risk' },
  ],
  coRadsCategory: [
    {
      value: 'CO-RADS 0 - Incomplete/insufficient quality',
      label: 'CO-RADS 0 - Incomplete',
    },
    {
      value: 'CO-RADS 1 - Very low suspicion',
      label: 'CO-RADS 1 - Very low suspicion',
    },
    { value: 'CO-RADS 2 - Low suspicion', label: 'CO-RADS 2 - Low suspicion' },
    { value: 'CO-RADS 3 - Indeterminate', label: 'CO-RADS 3 - Indeterminate' },
    {
      value: 'CO-RADS 4 - High suspicion',
      label: 'CO-RADS 4 - High suspicion',
    },
    {
      value: 'CO-RADS 5 - Very high suspicion',
      label: 'CO-RADS 5 - Very high suspicion',
    },
    { value: 'CO-RADS 6 - PCR proven', label: 'CO-RADS 6 - PCR proven' },
  ],
  lungRadsCategory: [
    { value: 'Lung-RADS 0 - Incomplete', label: 'Lung-RADS 0 - Incomplete' },
    { value: 'Lung-RADS 1 - Negative', label: 'Lung-RADS 1 - Negative' },
    {
      value: 'Lung-RADS 2 - Benign appearance',
      label: 'Lung-RADS 2 - Benign appearance',
    },
    {
      value: 'Lung-RADS 3 - Probably benign',
      label: 'Lung-RADS 3 - Probably benign',
    },
    { value: 'Lung-RADS 4A - Suspicious', label: 'Lung-RADS 4A - Suspicious' },
    {
      value: 'Lung-RADS 4B - Very suspicious',
      label: 'Lung-RADS 4B - Very suspicious',
    },
    {
      value: 'Lung-RADS 4X - Additional concerning features',
      label: 'Lung-RADS 4X - Additional features',
    },
  ],
  cadRadsCategory: [
    { value: 'CAD-RADS 0 - No plaque', label: 'CAD-RADS 0 - No plaque' },
    {
      value: 'CAD-RADS 1 - Minimal (1-24%) stenosis',
      label: 'CAD-RADS 1 - Minimal',
    },
    {
      value: 'CAD-RADS 2 - Mild (25-49%) stenosis',
      label: 'CAD-RADS 2 - Mild',
    },
    {
      value: 'CAD-RADS 3 - Moderate (50-69%) stenosis',
      label: 'CAD-RADS 3 - Moderate',
    },
    {
      value: 'CAD-RADS 4A - Severe (70-99%) stenosis',
      label: 'CAD-RADS 4A - Severe',
    },
    {
      value: 'CAD-RADS 4B - Left main >= 50% or 3-vessel >= 70%',
      label: 'CAD-RADS 4B - LM/3-vessel',
    },
    {
      value: 'CAD-RADS 4C - Very severe stenosis',
      label: 'CAD-RADS 4C - Very severe',
    },
    {
      value: 'CAD-RADS 5 - Total occlusion',
      label: 'CAD-RADS 5 - Total occlusion',
    },
    {
      value: 'CAD-RADS N - Nondiagnostic',
      label: 'CAD-RADS N - Nondiagnostic',
    },
  ],
  niRadsCategory: [
    {
      value: 'NI-RADS 1 - No evidence of recurrence',
      label: 'NI-RADS 1 - No recurrence',
    },
    { value: 'NI-RADS 2 - Low suspicion', label: 'NI-RADS 2 - Low suspicion' },
    {
      value: 'NI-RADS 3 - High suspicion',
      label: 'NI-RADS 3 - High suspicion',
    },
    {
      value: 'NI-RADS 4 - Definite recurrence',
      label: 'NI-RADS 4 - Definite recurrence',
    },
  ],
  examQuality: [
    {
      value: 'Adequate diagnostic quality',
      label: 'Adequate diagnostic quality',
    },
    {
      value: 'Limited quality due to motion artifact',
      label: 'Limited quality due to motion artifact',
    },
    {
      value: 'Suboptimal quality due to body habitus',
      label: 'Suboptimal quality due to body habitus',
    },
    { value: 'Nondiagnostic quality', label: 'Nondiagnostic quality' },
  ],
  laterality: [
    { value: 'Left side', label: 'Left side' },
    { value: 'Right side', label: 'Right side' },
    { value: 'Bilateral', label: 'Bilateral' },
    { value: 'Midline', label: 'Midline' },
    { value: 'Not applicable', label: 'Not applicable' },
  ],
  contrastUse: [
    { value: 'No contrast used', label: 'No contrast used' },
    { value: 'IV contrast used', label: 'IV contrast used' },
    {
      value: 'Pre- and post-contrast acquisition',
      label: 'Pre- and post-contrast acquisition',
    },
    { value: 'Oral contrast used', label: 'Oral contrast used' },
    { value: 'IV and oral contrast used', label: 'IV and oral contrast used' },
  ],
  chestCardiomediastinal: [
    {
      value: 'Normal cardiomediastinal silhouette',
      label: 'Normal cardiomediastinal silhouette',
    },
    { value: 'Cardiomegaly present', label: 'Cardiomegaly present' },
    {
      value: 'Mild cardiomediastinal widening',
      label: 'Mild cardiomediastinal widening',
    },
  ],
  chestLungs: [
    {
      value: 'Lungs are clear without focal consolidation',
      label: 'Lungs clear without focal consolidation',
    },
    {
      value: 'Focal consolidation present',
      label: 'Focal consolidation present',
    },
    {
      value: 'Diffuse interstitial opacities present',
      label: 'Diffuse interstitial opacities present',
    },
    {
      value: 'Pulmonary edema pattern present',
      label: 'Pulmonary edema pattern present',
    },
    {
      value: 'Hyperinflation suggestive of chronic airway disease',
      label: 'Hyperinflation suggestive of chronic airway disease',
    },
  ],
  chestPleura: [
    {
      value: 'No pleural effusion or pneumothorax',
      label: 'No pleural effusion or pneumothorax',
    },
    { value: 'Pleural effusion present', label: 'Pleural effusion present' },
    { value: 'Pneumothorax present', label: 'Pneumothorax present' },
    {
      value: 'Pleural thickening present',
      label: 'Pleural thickening present',
    },
  ],
  chestBones: [
    {
      value: 'No acute osseous abnormality',
      label: 'No acute osseous abnormality',
    },
    {
      value: 'Degenerative osseous changes noted',
      label: 'Degenerative osseous changes noted',
    },
    {
      value: 'Acute osseous abnormality identified',
      label: 'Acute osseous abnormality identified',
    },
  ],
  obstetricPresentation: [
    { value: 'Cephalic presentation', label: 'Cephalic presentation' },
    { value: 'Breech presentation', label: 'Breech presentation' },
    { value: 'Transverse lie', label: 'Transverse lie' },
    { value: 'Variable/unstable lie', label: 'Variable/unstable lie' },
  ],
  obstetricPlacenta: [
    {
      value: 'Anterior placenta, not low-lying',
      label: 'Anterior placenta, not low-lying',
    },
    {
      value: 'Posterior placenta, not low-lying',
      label: 'Posterior placenta, not low-lying',
    },
    { value: 'Fundal placenta', label: 'Fundal placenta' },
    {
      value: 'Low-lying placenta / placenta previa',
      label: 'Low-lying placenta / placenta previa',
    },
  ],
  mammographyBirads: [
    {
      value: 'BI-RADS 0 - Incomplete, additional imaging needed',
      label: 'BI-RADS 0 - Incomplete',
    },
    { value: 'BI-RADS 1 - Negative', label: 'BI-RADS 1 - Negative' },
    {
      value: 'BI-RADS 2 - Benign finding',
      label: 'BI-RADS 2 - Benign finding',
    },
    {
      value: 'BI-RADS 3 - Probably benign, short-interval follow-up',
      label: 'BI-RADS 3 - Probably benign',
    },
    {
      value: 'BI-RADS 4 - Suspicious abnormality',
      label: 'BI-RADS 4 - Suspicious abnormality',
    },
    {
      value: 'BI-RADS 5 - Highly suggestive of malignancy',
      label: 'BI-RADS 5 - Highly suggestive of malignancy',
    },
    {
      value: 'BI-RADS 6 - Known biopsy-proven malignancy',
      label: 'BI-RADS 6 - Known malignancy',
    },
  ],
  mammographyDensity: [
    {
      value: 'ACR A - Almost entirely fatty',
      label: 'ACR A - Almost entirely fatty',
    },
    {
      value: 'ACR B - Scattered fibroglandular densities',
      label: 'ACR B - Scattered densities',
    },
    {
      value: 'ACR C - Heterogeneously dense',
      label: 'ACR C - Heterogeneously dense',
    },
    { value: 'ACR D - Extremely dense', label: 'ACR D - Extremely dense' },
  ],
  mammographyMassCalcification: [
    {
      value: 'No suspicious mass or suspicious calcification',
      label: 'No suspicious mass or calcification',
    },
    {
      value: 'Benign-appearing calcifications present',
      label: 'Benign-appearing calcifications present',
    },
    {
      value: 'Suspicious clustered calcifications present',
      label: 'Suspicious clustered calcifications present',
    },
    {
      value: 'Spiculated/irregular mass identified',
      label: 'Spiculated/irregular mass identified',
    },
    {
      value: 'Focal asymmetry requiring further assessment',
      label: 'Focal asymmetry requiring further assessment',
    },
  ],
  neuroHemorrhage: [
    {
      value: 'No intracranial hemorrhage',
      label: 'No intracranial hemorrhage',
    },
    {
      value: 'Acute intracranial hemorrhage present',
      label: 'Acute intracranial hemorrhage present',
    },
    {
      value: 'Chronic hemorrhagic sequelae present',
      label: 'Chronic hemorrhagic sequelae present',
    },
  ],
  neuroInfarct: [
    {
      value: 'No acute territorial infarct',
      label: 'No acute territorial infarct',
    },
    {
      value: 'Acute ischemic infarct present',
      label: 'Acute ischemic infarct present',
    },
    {
      value: 'Chronic infarct changes present',
      label: 'Chronic infarct changes present',
    },
    {
      value: 'Lacunar ischemic changes present',
      label: 'Lacunar ischemic changes present',
    },
  ],
  neuroMassEffect: [
    {
      value: 'No significant mass effect',
      label: 'No significant mass effect',
    },
    { value: 'Mild mass effect', label: 'Mild mass effect' },
    { value: 'Moderate mass effect', label: 'Moderate mass effect' },
    { value: 'Severe mass effect', label: 'Severe mass effect' },
  ],
  mskBones: [
    {
      value: 'No acute fracture or malalignment',
      label: 'No acute fracture or malalignment',
    },
    { value: 'Acute fracture identified', label: 'Acute fracture identified' },
    {
      value: 'Dislocation/subluxation present',
      label: 'Dislocation/subluxation present',
    },
    {
      value: 'Degenerative osseous changes',
      label: 'Degenerative osseous changes',
    },
  ],
  mskJoints: [
    { value: 'No joint effusion', label: 'No joint effusion' },
    { value: 'Joint effusion present', label: 'Joint effusion present' },
    {
      value: 'Degenerative joint changes',
      label: 'Degenerative joint changes',
    },
    { value: 'Joint space narrowing', label: 'Joint space narrowing' },
  ],
  mskSoftTissues: [
    {
      value: 'No significant soft tissue abnormality',
      label: 'No significant soft tissue abnormality',
    },
    {
      value: 'Soft tissue swelling present',
      label: 'Soft tissue swelling present',
    },
    {
      value: 'Tendon or ligament injury suspected',
      label: 'Tendon or ligament injury suspected',
    },
    {
      value: 'Fluid collection/hematoma present',
      label: 'Fluid collection/hematoma present',
    },
  ],
  abdominalLiver: [
    {
      value: 'Liver size and echotexture are within normal limits',
      label: 'Liver normal size and echotexture',
    },
    {
      value: 'Diffuse fatty liver changes noted',
      label: 'Diffuse fatty liver changes noted',
    },
    {
      value: 'Focal hepatic lesion identified',
      label: 'Focal hepatic lesion identified',
    },
    { value: 'Hepatomegaly present', label: 'Hepatomegaly present' },
  ],
  abdominalGallbladder: [
    {
      value: 'No gallstones or biliary dilatation',
      label: 'No gallstones or biliary dilatation',
    },
    { value: 'Cholelithiasis present', label: 'Cholelithiasis present' },
    {
      value: 'Features suggestive of cholecystitis',
      label: 'Features suggestive of cholecystitis',
    },
    {
      value: 'Biliary duct dilatation present',
      label: 'Biliary duct dilatation present',
    },
  ],
  abdominalKidneys: [
    {
      value: 'Kidneys are normal in size and corticomedullary differentiation',
      label: 'Kidneys normal appearance',
    },
    { value: 'Hydronephrosis present', label: 'Hydronephrosis present' },
    { value: 'Renal calculi present', label: 'Renal calculi present' },
    {
      value: 'Renal cyst or mass identified',
      label: 'Renal cyst or mass identified',
    },
  ],
  abdominalPelvis: [
    {
      value: 'Pelvic organs are unremarkable',
      label: 'Pelvic organs unremarkable',
    },
    {
      value: 'Uterine/adnexal abnormality identified',
      label: 'Uterine/adnexal abnormality identified',
    },
    {
      value: 'Enlarged prostate with bladder outlet impression',
      label: 'Enlarged prostate with bladder outlet impression',
    },
    {
      value: 'Bladder wall thickening or intravesical lesion noted',
      label: 'Bladder wall thickening/intravesical lesion',
    },
  ],
  limitations: [
    {
      value: 'No significant technical limitation',
      label: 'No significant technical limitation',
    },
    {
      value: 'Patient motion limits fine-detail assessment',
      label: 'Patient motion limits detail',
    },
    {
      value: 'Body habitus limits acoustic/detail assessment',
      label: 'Body habitus limits assessment',
    },
    {
      value: 'Limited study due to reduced views/series',
      label: 'Limited study due to reduced views/series',
    },
  ],
  recommendations: [
    {
      value: 'No additional imaging follow-up required',
      label: 'No additional imaging follow-up required',
    },
    {
      value: 'Short-interval imaging follow-up recommended',
      label: 'Short-interval imaging follow-up recommended',
    },
    {
      value: 'Correlate with clinical and laboratory findings',
      label: 'Correlate with clinical and laboratory findings',
    },
    {
      value: 'Recommend targeted ultrasound correlation',
      label: 'Recommend targeted ultrasound correlation',
    },
    {
      value: 'Recommend contrast-enhanced CT/MRI for further characterization',
      label: 'Recommend contrast-enhanced CT/MRI',
    },
    {
      value: 'Urgent specialist review recommended',
      label: 'Urgent specialist review recommended',
    },
  ],
};

const getStructuredSelectValue = (
  value: string,
  options: StructuredSelectOption[],
): string => {
  if (!value) {
    return '';
  }

  if (options.some((option) => option.value === value)) {
    return value;
  }

  return STRUCTURED_OTHER_VALUE;
};

const getStructuredCustomValue = (value: string): string => {
  if (!value) {
    return '';
  }

  if (value.toLowerCase().startsWith('other:')) {
    return value.slice(6).trim();
  }

  return value;
};

const hasText = (value: string | null | undefined): boolean =>
  Boolean(value && value.trim().length > 0);

const deriveReportProfile = (
  req: RadiologyRequestDTO | null,
): ReportProfileId => {
  if (!req) return 'general';

  const modality = String(req.imaging_type || '').toLowerCase();
  const studyText =
    `${req.imaging?.imaging_name || ''} ${req.imaging?.category || ''} ${req.body_part || ''}`.toLowerCase();
  const isUltrasound = modality.includes('ultrasound');
  const isCt = modality.includes('ct');
  const isMri = modality.includes('mri');
  const isXray = modality.includes('x-ray');
  const isChest = studyText.includes('chest') || studyText.includes('thorax');
  const isBreast = studyText.includes('breast');
  const isLiver =
    studyText.includes('liver') ||
    studyText.includes('hepatic') ||
    studyText.includes('hepat') ||
    studyText.includes('hcc');
  const isProstate = studyText.includes('prostate');
  const isThyroid = studyText.includes('thyroid');
  const isAdnexal =
    studyText.includes('adnexa') ||
    studyText.includes('adnexal') ||
    studyText.includes('ovary') ||
    studyText.includes('ovarian');
  const isHeadNeck =
    studyText.includes('head') ||
    studyText.includes('neck') ||
    studyText.includes('nasopharynx') ||
    studyText.includes('oropharynx') ||
    studyText.includes('larynx') ||
    studyText.includes('hypopharynx');
  const isCovid =
    studyText.includes('covid') ||
    studyText.includes('coronavirus') ||
    studyText.includes('viral');
  const isLungScreen =
    studyText.includes('screen') ||
    studyText.includes('screening') ||
    studyText.includes('low dose') ||
    studyText.includes('ldct');
  const isCardiacCt =
    studyText.includes('coronary') ||
    studyText.includes('cardiac') ||
    studyText.includes('ccta') ||
    studyText.includes('cta');

  if (studyText.includes('bi-rads') || studyText.includes('birads')) {
    return 'bi-rads';
  }
  if (modality.includes('mammo')) {
    return 'mammography';
  }
  if (isBreast) {
    return 'bi-rads';
  }
  if (
    studyText.includes('li-rads') ||
    studyText.includes('lirads') ||
    ((isCt || isMri || isUltrasound) && isLiver)
  ) {
    return 'li-rads';
  }
  if (
    studyText.includes('pi-rads') ||
    studyText.includes('pirads') ||
    (isMri && isProstate)
  ) {
    return 'pi-rads';
  }
  if (
    studyText.includes('ti-rads') ||
    studyText.includes('tirads') ||
    (isUltrasound && isThyroid)
  ) {
    return 'ti-rads';
  }
  if (
    studyText.includes('o-rads') ||
    studyText.includes('orads') ||
    (isUltrasound && isAdnexal)
  ) {
    return 'o-rads';
  }
  if (
    studyText.includes('co-rads') ||
    studyText.includes('corads') ||
    (isCt && isChest && isCovid)
  ) {
    return 'co-rads';
  }
  if (
    studyText.includes('lung-rads') ||
    studyText.includes('lungrads') ||
    (isCt &&
      (studyText.includes('lung') || studyText.includes('pulmonary')) &&
      isLungScreen)
  ) {
    return 'lung-rads';
  }
  if (
    studyText.includes('cad-rads') ||
    studyText.includes('cadrads') ||
    (isCt && isCardiacCt)
  ) {
    return 'cad-rads';
  }
  if (
    studyText.includes('ni-rads') ||
    studyText.includes('nirads') ||
    ((isCt || isMri) && isHeadNeck)
  ) {
    return 'ni-rads';
  }

  if (isXray && isChest) {
    return 'chest-xray';
  }
  if (
    isUltrasound &&
    (studyText.includes('obstetric') ||
      studyText.includes('pregnan') ||
      studyText.includes('fetal'))
  ) {
    return 'obstetric-ultrasound';
  }
  if (
    (isCt || isMri) &&
    (studyText.includes('brain') ||
      studyText.includes('head') ||
      studyText.includes('neuro'))
  ) {
    return 'neuro-cross-sectional';
  }
  if (
    studyText.includes('joint') ||
    studyText.includes('limb') ||
    studyText.includes('spine') ||
    studyText.includes('musculo') ||
    studyText.includes('ortho')
  ) {
    return 'musculoskeletal';
  }
  if (
    isUltrasound &&
    (studyText.includes('abd') ||
      studyText.includes('pelvi') ||
      studyText.includes('hepat') ||
      studyText.includes('renal'))
  ) {
    return 'abdominal-pelvic-ultrasound';
  }

  return 'general';
};

function buildStructuredNarrative(
  profile: ReportProfileId,
  data: StructuredReportState,
): {
  findingsBlock: string;
  impressionBlock: string;
  notesBlock: string;
} {
  const findingsLines: string[] = [];
  const impressionLines: string[] = [];
  const notesLines: string[] = [];

  if (profile !== 'general') {
    const profileLabel = getReportProfileLabel(profile);
    if (profileLabel) {
      notesLines.push(`Report profile: ${profileLabel}`);
    }
  }

  if (hasText(data.examQuality))
    findingsLines.push(`Exam quality: ${data.examQuality.trim()}`);
  if (hasText(data.laterality))
    findingsLines.push(`Laterality: ${data.laterality.trim()}`);
  if (hasText(data.contrastUse))
    findingsLines.push(`Contrast: ${data.contrastUse.trim()}`);
  if (hasText(data.radiationDose))
    findingsLines.push(`Dose metrics: ${data.radiationDose.trim()}`);
  if (hasText(data.standardFindings))
    findingsLines.push(`Standard findings: ${data.standardFindings.trim()}`);
  if (hasText(data.standardImpression))
    impressionLines.push(
      `Standard impression: ${data.standardImpression.trim()}`,
    );
  if (hasText(data.limitations))
    notesLines.push(`Limitations: ${data.limitations.trim()}`);

  if (profile === 'chest-xray') {
    if (hasText(data.chestCardiomediastinal))
      findingsLines.push(
        `Cardiomediastinal silhouette: ${data.chestCardiomediastinal.trim()}`,
      );
    if (hasText(data.chestLungs))
      findingsLines.push(`Lung parenchyma: ${data.chestLungs.trim()}`);
    if (hasText(data.chestPleura))
      findingsLines.push(`Pleura: ${data.chestPleura.trim()}`);
    if (hasText(data.chestBones))
      findingsLines.push(
        `Visible osseous structures: ${data.chestBones.trim()}`,
      );
  }

  if (profile === 'obstetric-ultrasound') {
    if (hasText(data.obstetricGestationalAge))
      findingsLines.push(
        `Gestational age: ${data.obstetricGestationalAge.trim()}`,
      );
    if (hasText(data.obstetricFhr))
      findingsLines.push(`Fetal heart rate: ${data.obstetricFhr.trim()}`);
    if (hasText(data.obstetricPresentation))
      findingsLines.push(
        `Fetal presentation: ${data.obstetricPresentation.trim()}`,
      );
    if (hasText(data.obstetricPlacenta))
      findingsLines.push(
        `Placental location/grade: ${data.obstetricPlacenta.trim()}`,
      );
    if (hasText(data.obstetricAfi))
      findingsLines.push(`Amniotic fluid index: ${data.obstetricAfi.trim()}`);
  }

  if (profile === 'mammography') {
    if (hasText(data.mammographyDensity))
      findingsLines.push(`Breast density: ${data.mammographyDensity.trim()}`);
    if (hasText(data.mammographyMassCalcification))
      findingsLines.push(
        `Masses/calcifications: ${data.mammographyMassCalcification.trim()}`,
      );
    if (hasText(data.mammographyBirads))
      impressionLines.push(
        `BI-RADS category: ${data.mammographyBirads.trim()}`,
      );
  }

  if (profile === 'bi-rads') {
    if (hasText(data.biRadsCategory))
      impressionLines.push(`BI-RADS category: ${data.biRadsCategory.trim()}`);
  }

  if (profile === 'li-rads') {
    if (hasText(data.liRadsCategory))
      impressionLines.push(`LI-RADS category: ${data.liRadsCategory.trim()}`);
  }

  if (profile === 'pi-rads') {
    if (hasText(data.piRadsCategory))
      impressionLines.push(`PI-RADS category: ${data.piRadsCategory.trim()}`);
  }

  if (profile === 'ti-rads') {
    if (hasText(data.tiRadsCategory))
      impressionLines.push(`TI-RADS category: ${data.tiRadsCategory.trim()}`);
  }

  if (profile === 'o-rads') {
    if (hasText(data.oRadsCategory))
      impressionLines.push(`O-RADS category: ${data.oRadsCategory.trim()}`);
  }

  if (profile === 'co-rads') {
    if (hasText(data.coRadsCategory))
      impressionLines.push(`CO-RADS category: ${data.coRadsCategory.trim()}`);
  }

  if (profile === 'lung-rads') {
    if (hasText(data.lungRadsCategory))
      impressionLines.push(
        `Lung-RADS category: ${data.lungRadsCategory.trim()}`,
      );
  }

  if (profile === 'cad-rads') {
    if (hasText(data.cadRadsCategory))
      impressionLines.push(`CAD-RADS category: ${data.cadRadsCategory.trim()}`);
  }

  if (profile === 'ni-rads') {
    if (hasText(data.niRadsCategory))
      impressionLines.push(`NI-RADS category: ${data.niRadsCategory.trim()}`);
  }

  if (profile === 'neuro-cross-sectional') {
    if (hasText(data.neuroHemorrhage))
      findingsLines.push(`Hemorrhage: ${data.neuroHemorrhage.trim()}`);
    if (hasText(data.neuroInfarct))
      findingsLines.push(`Infarct/ischemia: ${data.neuroInfarct.trim()}`);
    if (hasText(data.neuroMassEffect))
      findingsLines.push(`Mass effect: ${data.neuroMassEffect.trim()}`);
    if (hasText(data.neuroMidlineShiftMm))
      findingsLines.push(
        `Midline shift (mm): ${data.neuroMidlineShiftMm.trim()}`,
      );
  }

  if (profile === 'musculoskeletal') {
    if (hasText(data.mskBones))
      findingsLines.push(`Bones/alignment: ${data.mskBones.trim()}`);
    if (hasText(data.mskJoints))
      findingsLines.push(`Joints/effusion: ${data.mskJoints.trim()}`);
    if (hasText(data.mskSoftTissues))
      findingsLines.push(`Soft tissues: ${data.mskSoftTissues.trim()}`);
  }

  if (profile === 'abdominal-pelvic-ultrasound') {
    if (hasText(data.abdominalLiver))
      findingsLines.push(`Liver: ${data.abdominalLiver.trim()}`);
    if (hasText(data.abdominalGallbladder))
      findingsLines.push(
        `Gallbladder/Biliary tree: ${data.abdominalGallbladder.trim()}`,
      );
    if (hasText(data.abdominalKidneys))
      findingsLines.push(
        `Kidneys/urinary tract: ${data.abdominalKidneys.trim()}`,
      );
    if (hasText(data.abdominalPelvis))
      findingsLines.push(`Pelvic organs: ${data.abdominalPelvis.trim()}`);
  }

  if (hasText(data.recommendations)) {
    notesLines.push(
      `Structured recommendation: ${data.recommendations.trim()}`,
    );
  }

  return {
    findingsBlock:
      findingsLines.length > 0
        ? `Structured observations:\n- ${findingsLines.join('\n- ')}`
        : '',
    impressionBlock:
      impressionLines.length > 0
        ? `Structured impression:\n- ${impressionLines.join('\n- ')}`
        : '',
    notesBlock: notesLines.length > 0 ? notesLines.join('\n') : '',
  };
}

// =============================================================================
// Component
// =============================================================================

export default function RadiologyReportForm({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  request,
}: RadiologyReportFormProps) {
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [technique, setTechnique] = useState('');
  const [comparison, setComparison] = useState('');
  const [notes, setNotes] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('Normal');
  const [isPreliminary, setIsPreliminary] = useState(false);
  const [errors, setErrors] = useState<RadiologyReportFormErrors>({});
  const [reportProfile, setReportProfile] =
    useState<ReportProfileId>('general');
  const [structured, setStructured] = useState<StructuredReportState>(
    createEmptyStructuredReport(),
  );

  // Image Upload State
  const [images, setImages] = useState<ImageFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedExistingImageId, setSelectedExistingImageId] = useState<
    string | null
  >(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const imagesRef = React.useRef<ImageFile[]>([]);

  const clearImagePreviews = useCallback((items: ImageFile[]) => {
    items.forEach((img) => revokePreviewUrl(img.previewUrl));
  }, []);

  React.useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  React.useEffect(
    () => () => {
      clearImagePreviews(imagesRef.current);
    },
    [clearImagePreviews],
  );

  const existingImages = useMemo<ExistingImageItem[]>(() => {
    if (!request) return [];

    if (request.scan_images && request.scan_images.length > 0) {
      return request.scan_images.map((img, index) => ({
        id: img.image_id || `${request.request_id}_existing_${index}`,
        url: img.image_url || img.image_path,
        label: img.file_name || `Image ${index + 1}`,
        viewPlane: img.view_plane || null,
        notes: img.notes || null,
        fileName: img.file_name || null,
        isKeyImage: img.is_key_image || false,
        sequenceNumber: img.sequence_number || null,
      }));
    }

    if (
      request.scan_result?.image_urls &&
      request.scan_result.image_urls.length > 0
    ) {
      return request.scan_result.image_urls.map((url, index) => ({
        id: `${request.request_id}_legacy_${index}`,
        url,
        label: `Image ${index + 1}`,
      }));
    }

    const fallbackUrl = request.result_file_url || request.image_url;
    if (fallbackUrl) {
      return [
        {
          id: `${request.request_id}_fallback`,
          url: fallbackUrl,
          label: 'Result image',
        },
      ];
    }

    return [];
  }, [request]);

  const existingGalleryImages = useMemo<GalleryImage[]>(
    () =>
      existingImages.map((img) => ({
        id: img.id,
        src: img.url,
        title: img.fileName || img.label,
        description: img.notes || 'No description provided.',
        viewPlane: img.viewPlane,
        isKeyImage: img.isKeyImage,
        meta: [
          ...(img.viewPlane
            ? [{ label: 'View plane', value: img.viewPlane }]
            : []),
          ...(img.sequenceNumber
            ? [{ label: 'Sequence', value: `${img.sequenceNumber}` }]
            : []),
        ],
      })),
    [existingImages],
  );

  const newGalleryImages = useMemo<GalleryImage[]>(
    () =>
      images.map((img) => ({
        id: img.id,
        src: img.previewUrl || '',
        title: img.file.name,
        description: 'Uploaded image for this report.',
        viewPlane: img.viewPlane,
        isKeyImage: img.isKeyImage,
        meta: [
          { label: 'View plane', value: img.viewPlane },
          { label: 'Sequence', value: `${img.sequenceNumber}` },
          {
            label: 'Size',
            value: `${(img.file.size / (1024 * 1024)).toFixed(2)} MB`,
          },
        ],
      })),
    [images],
  );

  const openGallery = useCallback(
    (items: GalleryImage[], selectedId?: string | null) => {
      if (!items.length) return;
      const index = selectedId
        ? Math.max(
            items.findIndex((img) => img.id === selectedId),
            0,
          )
        : 0;
      setGalleryImages(items);
      setGalleryIndex(index);
      setIsGalleryOpen(true);
    },
    [],
  );

  // ── Draft auto-save / restore ──────────────────────────────────────────
  const draftData = useMemo(
    () => ({
      findings,
      impression,
      technique,
      comparison,
      notes,
      reportProfile,
      structured,
    }),
    [
      findings,
      impression,
      technique,
      comparison,
      notes,
      reportProfile,
      structured,
    ],
  );

  const setDraftData = useCallback((d: typeof draftData) => {
    setFindings(d.findings);
    setImpression(d.impression);
    setTechnique(d.technique);
    setComparison(d.comparison);
    setNotes(d.notes);
    setReportProfile(d.reportProfile || 'general');
    setStructured(d.structured || createEmptyStructuredReport());
  }, []);

  const { clearDraft, saveDraft } = useDraftRestore(
    `radiology-report-${request?.request_id || 'new'}`,
    draftData,
    setDraftData,
    { enabled: isOpen },
  );

  const { showToast } = useToast();

  const handleSaveDraft = useCallback(() => {
    saveDraft();
    showToast({ type: 'success', title: 'Draft Saved', message: 'Your report draft has been saved.', duration: 3000 });
  }, [saveDraft, showToast]);

  const handlePrintPreview = useCallback(() => {
    const patientName = request?.patient ? formatPatientName(request.patient) : 'Patient';
    const examDate = new Date(request?.created_at || Date.now()).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
    const imagingName = request?.imaging?.imaging_name || request?.imaging_type || '';
    const doctorName = `Dr. ${request?.doctor?.first_name || ''} ${request?.doctor?.last_name || ''}`.trim();

    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Radiology Report — ${patientName}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;padding:40px;color:#111;max-width:800px;margin:0 auto}
  h1{font-size:20px;color:#15803d;margin-bottom:4px}
  .subtitle{font-size:13px;color:#6b7280;margin-bottom:16px}
  h2{font-size:14px;margin-top:24px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
  .field{margin:8px 0}
  .label{font-weight:700;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em}
  .value{font-size:14px;margin-top:2px}
  .meta{display:flex;flex-wrap:wrap;gap:24px;margin:16px 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb}
  .meta-item .label{font-size:10px;margin-bottom:2px}
  .meta-item .value{font-size:13px;font-weight:600}
  .modality{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;background:#dbeafe;color:#1e40af}
  .footer{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:12px;color:#6b7280}
  pre{white-space:pre-wrap;font-family:inherit;margin:4px 0}
  @media print{body{padding:20px}}
</style></head><body>
  <h1>Radiology Report</h1>
  <div class="subtitle">${imagingName} · <span class="modality">${request?.imaging_type || ''}</span></div>
  <div class="meta">
    <div class="meta-item"><div class="label">Patient Name</div><div class="value">${patientName}</div></div>
    <div class="meta-item"><div class="label">Age / Gender</div><div class="value">${request?.patient?.date_of_birth ? formatDetailedAge(request.patient.date_of_birth) : 'N/A'}${request?.patient?.gender ? ' · ' + request.patient.gender : ''}</div></div>
    <div class="meta-item"><div class="label">Request ID</div><div class="value">#${request?.request_id?.slice(0, 10).toUpperCase() || ''}</div></div>
    <div class="meta-item"><div class="label">Date of Exam</div><div class="value">${examDate}</div></div>
    <div class="meta-item"><div class="label">Requesting Physician</div><div class="value">${doctorName}</div></div>
  </div>
  ${technique ? `<div class="field"><div class="label">Technique</div><div class="value">${technique}</div></div>` : ''}
  ${comparison ? `<div class="field"><div class="label">Comparison</div><div class="value">${comparison}</div></div>` : ''}
  ${findings ? `<h2>Findings</h2><pre>${findings}</pre>` : ''}
  ${impression ? `<h2>Impression</h2><pre>${impression}</pre>` : ''}
  ${notes ? `<h2>Additional Notes</h2><pre>${notes}</pre>` : ''}
  <div class="footer">
    <strong>Reporting Physician:</strong> ${doctorName}<br>
    <strong>Report Date:</strong> ${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
    ${isPreliminary ? '<br><strong style="color:#b45309">⚠ PRELIMINARY REPORT — Pending final review</strong>' : ''}
    ${urgency === 'Critical' ? '<br><strong style="color:#dc2626">🔴 CRITICAL FINDING</strong>' : ''}
  </div>
</body></html>`;

    const filename = `radiology-report-${request?.request_id?.slice(0, 8) || 'draft'}.html`;
    window.electron.html.saveAndOpen(filename, htmlContent).catch(() => {
      // Fallback: open in new window if Electron bridge unavailable
      const w = window.open('', '_blank', 'width=800,height=900');
      if (w) { w.document.write(htmlContent); w.document.close(); w.focus(); w.print(); }
    });
  }, [request, technique, comparison, findings, impression, notes, isPreliminary, urgency]);

  // Defer heavy form content by one animation frame so the modal shell
  // (backdrop + header) renders immediately, then content fills in ~16ms.
  const [contentVisible, setContentVisible] = useState(false);
  React.useEffect(() => {
    if (!isOpen) {
      setContentVisible(false);
      return;
    }
    const frame = requestAnimationFrame(() => setContentVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && request) {
      // Load existing report data if available
      const existingResult = request.scan_result;
      setFindings(existingResult?.findings || request.findings || '');
      setImpression(existingResult?.impression || request.report || '');
      setTechnique(existingResult?.technique || '');
      setComparison(existingResult?.comparison || '');
      setNotes(existingResult?.notes || request.notes || '');
      setUrgency((existingResult?.urgency as UrgencyLevel) || 'Normal');
      setIsPreliminary(existingResult?.is_preliminary || false);
      setReportProfile(deriveReportProfile(request));
      setStructured(createEmptyStructuredReport());
      setErrors({});
      setImages((prev) => {
        clearImagePreviews(prev);
        return [];
      }); // Reset images
      setUploadError(null);
    }
  }, [isOpen, request, clearImagePreviews]);

  React.useEffect(() => {
    if (!isOpen) return;
    setSelectedExistingImageId(existingImages[0]?.id || null);
  }, [isOpen, existingImages]);

  const updateStructuredField = useCallback(
    (field: keyof StructuredReportState, value: string) => {
      setStructured((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const renderStructuredDropdownField = (
    field: keyof StructuredReportState,
    label: string,
    options: StructuredSelectOption[],
    placeholder: string,
    customPlaceholder: string,
    multilineCustom: boolean = false,
    className: string = '',
  ) => {
    const currentValue = structured[field] || '';
    const selectedValue = getStructuredSelectValue(currentValue, options);
    const customValue =
      selectedValue === STRUCTURED_OTHER_VALUE
        ? getStructuredCustomValue(currentValue)
        : '';

    return (
      <div className={className}>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          {label}
        </label>
        <Select
          value={selectedValue}
          onChange={(e) => {
            const next = e.target.value;
            if (next === STRUCTURED_OTHER_VALUE) {
              const existingCustom = getStructuredCustomValue(currentValue);
              updateStructuredField(
                field,
                existingCustom ? `Other: ${existingCustom}` : 'Other: ',
              );
              return;
            }

            updateStructuredField(field, next);
          }}
          options={[
            ...options,
            { value: STRUCTURED_OTHER_VALUE, label: 'Other (type custom)' },
          ]}
          placeholder={placeholder}
          className="w-full text-sm"
        />
        {selectedValue === STRUCTURED_OTHER_VALUE &&
          (multilineCustom ? (
            <textarea
              value={customValue}
              onChange={(e) =>
                updateStructuredField(field, `Other: ${e.target.value}`)
              }
              rows={2}
              placeholder={customPlaceholder}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          ) : (
            <input
              value={customValue}
              onChange={(e) =>
                updateStructuredField(field, `Other: ${e.target.value}`)
              }
              placeholder={customPlaceholder}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          ))}
      </div>
    );
  };

  const renderReportDropdownField = (
    value: string,
    onChange: (nextValue: string) => void,
    label: string,
    options: StructuredSelectOption[],
    placeholder: string,
    customPlaceholder: string,
    multilineCustom: boolean = false,
  ) => {
    const selectedValue = getStructuredSelectValue(value, options);
    const customValue =
      selectedValue === STRUCTURED_OTHER_VALUE
        ? getStructuredCustomValue(value)
        : '';

    return (
      <div>
        {label && (
          <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <Select
          value={selectedValue}
          onChange={(e) => {
            const next = e.target.value;
            if (next === STRUCTURED_OTHER_VALUE) {
              const existingCustom = getStructuredCustomValue(value);
              onChange(existingCustom ? `Other: ${existingCustom}` : 'Other: ');
              return;
            }

            onChange(next);
          }}
          options={[
            ...options,
            { value: STRUCTURED_OTHER_VALUE, label: 'Other (type custom)' },
          ]}
          placeholder={placeholder}
          className="w-full"
        />
        {selectedValue === STRUCTURED_OTHER_VALUE &&
          (multilineCustom ? (
            <textarea
              value={customValue}
              onChange={(e) => onChange(`Other: ${e.target.value}`)}
              rows={2}
              placeholder={customPlaceholder}
              className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 transition-colors"
            />
          ) : (
            <input
              value={customValue}
              onChange={(e) => onChange(`Other: ${e.target.value}`)}
              placeholder={customPlaceholder}
              className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 transition-colors"
            />
          ))}
      </div>
    );
  };

  // Image Upload Handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const generateId = () =>
    `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const validateFile = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024; // 50MB

    // Accept any image file or DICOM
    const isValidType =
      file.type.startsWith('image/') ||
      file.name.toLowerCase().endsWith('.dcm') ||
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg') ||
      file.name.toLowerCase().endsWith('.png');

    if (!isValidType) {
      setUploadError(
        'Invalid file type. Please upload JPEG, PNG, or DICOM files.',
      );
      return false;
    }

    if (file.size > maxSize) {
      setUploadError('File too large. Maximum size is 50MB.');
      return false;
    }

    setUploadError(null);
    return true;
  };

  const addImageFile = (file: File) => {
    if (!validateFile(file)) return;

    const id = generateId();
    const previewUrl = isPreviewableImage(file)
      ? URL.createObjectURL(file)
      : null;

    setImages((prev) => [
      ...prev,
      {
        id,
        file,
        previewUrl,
        viewPlane: 'Other',
        isKeyImage: false,
        sequenceNumber: prev.length + 1,
      },
    ]);

    setSelectedImageId((prev) => prev || id);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      console.log(
        'Files dropped:',
        files.map((f) => f.name),
      );
      files.forEach((file) => addImageFile(file));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      console.log(
        'Files selected:',
        files.map((f) => f.name),
      );
      files.forEach((file) => addImageFile(file));
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      revokePreviewUrl(removed?.previewUrl ?? null);

      const newImages = prev.filter((img) => img.id !== id);
      // Re-sequence
      return newImages.map((img, idx) => ({ ...img, sequenceNumber: idx + 1 }));
    });
    if (selectedImageId === id) {
      setSelectedImageId(null);
    }
  };

  const handleImageError = (id: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img;
        revokePreviewUrl(img.previewUrl);
        return { ...img, previewUrl: null };
      }),
    );
  };

  const updateImage = (id: string, updates: Partial<ImageFile>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...updates } : img)),
    );
  };

  const setAsKeyImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        isKeyImage: img.id === id,
      })),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const structuredNarrative = buildStructuredNarrative(
      reportProfile,
      structured,
    );
    const finalFindings = [findings.trim(), structuredNarrative.findingsBlock]
      .filter((value) => hasText(value))
      .join('\n\n');

    const finalImpression = [
      impression.trim(),
      structuredNarrative.impressionBlock,
    ]
      .filter((value) => hasText(value))
      .join('\n\n');

    const finalNotes = [notes.trim(), structuredNarrative.notesBlock]
      .filter((value) => hasText(value))
      .join('\n\n');

    const validationErrors = validateRadiologyReportForm(
      finalFindings,
      finalImpression,
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      // Upload images first
      const uploadedImages: UploadScanImageDTO[] =
        request && images.length > 0
          ? await mapWithConcurrency(
              images,
              IMAGE_UPLOAD_CONCURRENCY,
              async (img) => {
                const uploadFilePayload = await optimizeRadiologyUploadFile(
                  img.file,
                );
                const path = generateRadiologyImagePath(
                  request.request_id,
                  uploadFilePayload.name,
                );
                await uploadFile('radiology-images', path, uploadFilePayload);

                // For private buckets, store the path instead of public URL.
                return {
                  scan_request_id: request.request_id,
                  image_path: path,
                  file_name: uploadFilePayload.name,
                  file_size: uploadFilePayload.size,
                  mime_type: uploadFilePayload.type,
                  view_plane: img.viewPlane,
                  sequence_number: img.sequenceNumber,
                  is_key_image: img.isKeyImage,
                };
              },
            )
          : [];

      const resultData: CreateScanResultDTO = {
        scan_request_id: request?.request_id || '',
        findings: finalFindings,
        impression: finalImpression,
        technique: technique || undefined,
        comparison: comparison || undefined,
        urgency,
        is_preliminary: isPreliminary,
        notes: finalNotes || undefined,
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
      };

      await onSubmit(resultData);
      clearDraft();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      const errorMessage = error.message?.includes('row-level security')
        ? 'Permission denied. Please ask an administrator to configure storage policies.'
        : 'Failed to submit report. Please try again.';
      setUploadError(errorMessage);
    }
  };

  if (!isOpen || !request) return null;

  const profileLabel = getReportProfileLabel(reportProfile);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6">
          {/* Left: brand + report name + modality */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-primary-700 font-extrabold text-base tracking-tight whitespace-nowrap">
              Radiology Report
            </span>
            <span className="hidden sm:inline text-sm font-semibold text-gray-700 truncate max-w-[360px]">
              {request.imaging?.imaging_name || request.imaging_type}
            </span>
            <span className={`hidden md:inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${getModalityColor(request.imaging_type as ImagingModality)}`}>
              {request.imaging_type}
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || !contentVisible}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Patient Info Strip ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-4 lg:px-6 py-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
          {/* Patient Name */}
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Patient Name</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {request.patient ? formatPatientName(request.patient) : 'Unknown'}
            </p>
          </div>
          {/* Age & Gender */}
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Age / Gender</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {request.patient?.date_of_birth ? formatDetailedAge(request.patient.date_of_birth) : 'N/A'}{request.patient?.gender ? ` · ${request.patient.gender}` : ''}
            </p>
          </div>
          {/* Request ID */}
          <div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Request ID</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              #{request.request_id.slice(0, 10).toUpperCase()}
            </p>
          </div>
          {/* Requesting Doctor */}
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Requesting Dr.</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              Dr. {request.doctor?.first_name} {request.doctor?.last_name}
            </p>
          </div>
          {/* Date of Exam */}
          <div>
            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Date of Exam</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {new Date(request.created_at || Date.now()).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
          {/* Imaging Type + Status */}
          <div className="flex items-center gap-2 justify-end">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getModalityColor(request.imaging_type as ImagingModality)}`}>
              {request.imaging_type}
            </span>
            {(request.status === 'Completed' || request.status === 'Final Report') && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5" />
                Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Scrollable Content ────────────────────────────────────── */}
      {!contentVisible ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-sm text-gray-500">Preparing report…</p>
          </div>
        </div>
      ) : (
      <main className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} id="radiology-report-print-area">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-8">

            {/* ── Section: Technique & Comparison ──────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-primary-700" />
                <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Technique &amp; Comparison</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5">Study Technique</label>
                  {renderReportDropdownField(
                    technique,
                    setTechnique,
                    '',
                    REPORT_TECHNIQUE_OPTIONS,
                    'Select a technique protocol',
                    'Describe the imaging technique used…',
                    true,
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5">Comparison Study</label>
                  {renderReportDropdownField(
                    comparison,
                    setComparison,
                    '',
                    REPORT_COMPARISON_OPTIONS,
                    'Select a comparison statement',
                    'Reference to prior studies for comparison…',
                    true,
                  )}
                </div>
              </div>
            </section>

            {/* ── Section: Characterization Profile ────────────────────── */}
            <section>
              {/* Green gradient banner */}
              <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-primary-700 to-emerald-600 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Scan className="h-4 w-4 text-white/80" />
                  <h2 className="text-sm font-bold text-white">{profileLabel} Characterization Profile</h2>
                </div>
                <span className="text-[10px] font-semibold text-white/70 bg-white/15 rounded-full px-3 py-0.5 uppercase tracking-wider">
                  Version 2.4
                </span>
              </div>

              <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-5 space-y-5">
                {/* Exam Quality & Laterality toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {renderStructuredDropdownField(
                    'examQuality',
                    'Exam Quality',
                    STRUCTURED_FIELD_OPTIONS.examQuality || [],
                    'Choose exam quality',
                    'Type a more specific quality note',
                  )}
                  {renderStructuredDropdownField(
                    'laterality',
                    'Laterality & Focus',
                    STRUCTURED_FIELD_OPTIONS.laterality || [],
                    'Choose laterality',
                    'Type laterality detail',
                  )}
                </div>

                {/* Profile dropdown */}
                <div>
                  <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5">Report Profile</label>
                  <Select
                    value={reportProfile}
                    onChange={(e) => setReportProfile(e.target.value as ReportProfileId)}
                    options={REPORT_PROFILE_OPTIONS}
                    className="w-full"
                  />
                </div>

                {/* Structured fields 2-col grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderStructuredDropdownField(
                    'contrastUse',
                    'Contrast Use',
                    STRUCTURED_FIELD_OPTIONS.contrastUse || [],
                    'Choose contrast protocol',
                    'Type contrast protocol detail',
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Radiation Dose (CT/X-ray)</label>
                    <input
                      value={structured.radiationDose}
                      onChange={(e) => updateStructuredField('radiationDose', e.target.value)}
                      placeholder="CTDIvol / DLP or dose note"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
                    />
                  </div>
                  {renderStructuredDropdownField(
                    'standardFindings',
                    'Standard Findings',
                    STRUCTURED_FIELD_OPTIONS.standardFindings || [],
                    'Choose standard findings phrase',
                    'Type standard findings phrase',
                    true,
                  )}
                  {renderStructuredDropdownField(
                    'standardImpression',
                    'Standard Impression',
                    STRUCTURED_FIELD_OPTIONS.standardImpression || [],
                    'Choose standard impression phrase',
                    'Type standard impression phrase',
                    true,
                  )}
                </div>

                {/* Profile-specific fields */}
                {reportProfile === 'chest-xray' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderStructuredDropdownField('chestCardiomediastinal', 'Cardiomediastinal silhouette', STRUCTURED_FIELD_OPTIONS.chestCardiomediastinal || [], 'Choose cardiomediastinal pattern', 'Type cardiomediastinal detail')}
                    {renderStructuredDropdownField('chestLungs', 'Lung parenchyma', STRUCTURED_FIELD_OPTIONS.chestLungs || [], 'Choose lung pattern', 'Type lung parenchyma detail')}
                    {renderStructuredDropdownField('chestPleura', 'Pleura', STRUCTURED_FIELD_OPTIONS.chestPleura || [], 'Choose pleural finding', 'Type pleural detail')}
                    {renderStructuredDropdownField('chestBones', 'Visible osseous structures', STRUCTURED_FIELD_OPTIONS.chestBones || [], 'Choose osseous summary', 'Type osseous detail')}
                  </div>
                )}

                {reportProfile === 'obstetric-ultrasound' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Gestational age</label>
                      <input value={structured.obstetricGestationalAge} onChange={(e) => updateStructuredField('obstetricGestationalAge', e.target.value)} placeholder="e.g. 24 weeks + 3 days" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fetal heart rate</label>
                      <input value={structured.obstetricFhr} onChange={(e) => updateStructuredField('obstetricFhr', e.target.value)} placeholder="e.g. 142 bpm" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    {renderStructuredDropdownField('obstetricPresentation', 'Fetal presentation', STRUCTURED_FIELD_OPTIONS.obstetricPresentation || [], 'Choose fetal presentation', 'Type fetal presentation detail')}
                    {renderStructuredDropdownField('obstetricPlacenta', 'Placenta', STRUCTURED_FIELD_OPTIONS.obstetricPlacenta || [], 'Choose placental summary', 'Type placental location/grade detail')}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Amniotic fluid index (AFI)</label>
                      <input value={structured.obstetricAfi} onChange={(e) => updateStructuredField('obstetricAfi', e.target.value)} placeholder="e.g. 13.2 cm" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                )}

                {reportProfile === 'mammography' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderStructuredDropdownField('mammographyBirads', 'BI-RADS category', STRUCTURED_FIELD_OPTIONS.mammographyBirads || [], 'Choose BI-RADS category', 'Type BI-RADS detail')}
                    {renderStructuredDropdownField('mammographyDensity', 'Breast density', STRUCTURED_FIELD_OPTIONS.mammographyDensity || [], 'Choose ACR density', 'Type density detail')}
                    {renderStructuredDropdownField('mammographyMassCalcification', 'Mass / calcification pattern', STRUCTURED_FIELD_OPTIONS.mammographyMassCalcification || [], 'Choose mass/calcification pattern', 'Type detailed mass/calcification description', true, 'md:col-span-2')}
                  </div>
                )}

                {reportProfile === 'bi-rads' && (
                  <div>{renderStructuredDropdownField('biRadsCategory', 'BI-RADS category', STRUCTURED_FIELD_OPTIONS.biRadsCategory || [], 'Choose BI-RADS category', 'Type BI-RADS detail', true)}</div>
                )}
                {reportProfile === 'li-rads' && (
                  <div>{renderStructuredDropdownField('liRadsCategory', 'LI-RADS category', STRUCTURED_FIELD_OPTIONS.liRadsCategory || [], 'Choose LI-RADS category', 'Type LI-RADS detail', true)}</div>
                )}
                {reportProfile === 'pi-rads' && (
                  <div>{renderStructuredDropdownField('piRadsCategory', 'PI-RADS category', STRUCTURED_FIELD_OPTIONS.piRadsCategory || [], 'Choose PI-RADS category', 'Type PI-RADS detail', true)}</div>
                )}
                {reportProfile === 'ti-rads' && (
                  <div>{renderStructuredDropdownField('tiRadsCategory', 'TI-RADS category', STRUCTURED_FIELD_OPTIONS.tiRadsCategory || [], 'Choose TI-RADS category', 'Type TI-RADS detail', true)}</div>
                )}
                {reportProfile === 'o-rads' && (
                  <div>{renderStructuredDropdownField('oRadsCategory', 'O-RADS category', STRUCTURED_FIELD_OPTIONS.oRadsCategory || [], 'Choose O-RADS category', 'Type O-RADS detail', true)}</div>
                )}
                {reportProfile === 'co-rads' && (
                  <div>{renderStructuredDropdownField('coRadsCategory', 'CO-RADS category', STRUCTURED_FIELD_OPTIONS.coRadsCategory || [], 'Choose CO-RADS category', 'Type CO-RADS detail', true)}</div>
                )}
                {reportProfile === 'lung-rads' && (
                  <div>{renderStructuredDropdownField('lungRadsCategory', 'Lung-RADS category', STRUCTURED_FIELD_OPTIONS.lungRadsCategory || [], 'Choose Lung-RADS category', 'Type Lung-RADS detail', true)}</div>
                )}
                {reportProfile === 'cad-rads' && (
                  <div>{renderStructuredDropdownField('cadRadsCategory', 'CAD-RADS category', STRUCTURED_FIELD_OPTIONS.cadRadsCategory || [], 'Choose CAD-RADS category', 'Type CAD-RADS detail', true)}</div>
                )}
                {reportProfile === 'ni-rads' && (
                  <div>{renderStructuredDropdownField('niRadsCategory', 'NI-RADS category', STRUCTURED_FIELD_OPTIONS.niRadsCategory || [], 'Choose NI-RADS category', 'Type NI-RADS detail', true)}</div>
                )}

                {reportProfile === 'neuro-cross-sectional' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderStructuredDropdownField('neuroHemorrhage', 'Hemorrhage', STRUCTURED_FIELD_OPTIONS.neuroHemorrhage || [], 'Choose hemorrhage summary', 'Type hemorrhage location/detail')}
                    {renderStructuredDropdownField('neuroInfarct', 'Infarct/ischemia', STRUCTURED_FIELD_OPTIONS.neuroInfarct || [], 'Choose infarct/ischemia summary', 'Type infarct/ischemia detail')}
                    {renderStructuredDropdownField('neuroMassEffect', 'Mass effect', STRUCTURED_FIELD_OPTIONS.neuroMassEffect || [], 'Choose mass-effect grade', 'Type mass-effect detail')}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Midline shift (mm)</label>
                      <input value={structured.neuroMidlineShiftMm} onChange={(e) => updateStructuredField('neuroMidlineShiftMm', e.target.value)} placeholder="e.g. 4" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                )}

                {reportProfile === 'musculoskeletal' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderStructuredDropdownField('mskBones', 'Bones/alignment', STRUCTURED_FIELD_OPTIONS.mskBones || [], 'Choose bones/alignment summary', 'Type bones/alignment detail')}
                    {renderStructuredDropdownField('mskJoints', 'Joint findings', STRUCTURED_FIELD_OPTIONS.mskJoints || [], 'Choose joint summary', 'Type joint finding detail')}
                    {renderStructuredDropdownField('mskSoftTissues', 'Soft tissue findings', STRUCTURED_FIELD_OPTIONS.mskSoftTissues || [], 'Choose soft tissue summary', 'Type soft tissue detail', true, 'md:col-span-2')}
                  </div>
                )}

                {reportProfile === 'abdominal-pelvic-ultrasound' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderStructuredDropdownField('abdominalLiver', 'Liver', STRUCTURED_FIELD_OPTIONS.abdominalLiver || [], 'Choose liver summary', 'Type liver detail')}
                    {renderStructuredDropdownField('abdominalGallbladder', 'Gallbladder/Biliary', STRUCTURED_FIELD_OPTIONS.abdominalGallbladder || [], 'Choose gallbladder/biliary summary', 'Type gallbladder/biliary detail')}
                    {renderStructuredDropdownField('abdominalKidneys', 'Kidneys/urinary tract', STRUCTURED_FIELD_OPTIONS.abdominalKidneys || [], 'Choose renal/urinary summary', 'Type renal/urinary detail')}
                    {renderStructuredDropdownField('abdominalPelvis', 'Pelvic organs', STRUCTURED_FIELD_OPTIONS.abdominalPelvis || [], 'Choose pelvic summary', 'Type pelvic organ detail')}
                  </div>
                )}

                {/* Limitations & Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderStructuredDropdownField('limitations', 'Technical limitations', STRUCTURED_FIELD_OPTIONS.limitations || [], 'Choose technical limitation summary', 'Type technical limitation detail', true)}
                  {renderStructuredDropdownField('recommendations', 'Structured recommendation', STRUCTURED_FIELD_OPTIONS.recommendations || [], 'Choose recommendation', 'Type recommendation detail', true)}
                </div>
              </div>
            </section>

            {/* ── Section: Clinical Indication ─────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Clinical Indication</h2>
              </div>
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                {Array.isArray(request.diagnosis) && request.diagnosis.filter((d) => Boolean(d?.trim())).length > 0 ? (
                  <ul className="space-y-1 text-sm text-gray-800 list-disc list-inside">
                    {request.diagnosis.filter((d) => Boolean(d?.trim())).map((diag, idx) => (
                      <li key={`${diag}-${idx}`}>{diag}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">
                    {request.clinical_indication?.trim() || request.clinical_notes?.trim() || 'No diagnosis/clinical indication was provided for this request.'}
                  </p>
                )}
              </div>
            </section>

            {/* ── Section: Observations & Findings ─────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-primary-700" />
                <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Detail &amp; Observations</h2>
              </div>

              <div className="space-y-5">
                {/* Findings */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                      Findings <span className="text-red-500">*</span>
                    </label>
                    <TemplateSearchPopover
                      templateType="radiology"
                      currentValues={{ findings, impression, notes }}
                      onTemplateSelect={(data) => {
                        if (data.findings) setFindings(data.findings);
                        if (data.impression) setImpression(data.impression);
                        if (data.notes) setNotes(data.notes);
                        if (errors.findings) setErrors({ ...errors, findings: undefined });
                      }}
                    />
                  </div>
                  <textarea
                    value={findings}
                    onChange={(e) => {
                      setFindings(e.target.value);
                      if (errors.findings) setErrors({ ...errors, findings: undefined });
                    }}
                    rows={5}
                    placeholder="Describe specific findings, dimensions, vascularity, and internal characteristics here…"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 transition-colors resize-y ${
                      errors.findings ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.findings && <p className="mt-1 text-sm text-red-600">{errors.findings}</p>}
                </div>

                {/* Impression */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                      Impression <span className="text-red-500">*</span>
                    </label>
                    <TemplateSearchPopover
                      templateType="radiology"
                      currentValues={{ findings, impression, notes }}
                      onTemplateSelect={(data) => {
                        if (data.findings) setFindings(data.findings);
                        if (data.impression) setImpression(data.impression);
                        if (data.notes) setNotes(data.notes);
                        if (errors.report) setErrors({ ...errors, report: undefined });
                      }}
                    />
                  </div>
                  <textarea
                    value={impression}
                    onChange={(e) => {
                      setImpression(e.target.value);
                      if (errors.report) setErrors({ ...errors, report: undefined });
                    }}
                    rows={3}
                    placeholder="Summary and clinical impression…"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 transition-colors resize-y ${
                      errors.report ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.report && <p className="mt-1 text-sm text-red-600">{errors.report}</p>}
                </div>

                {/* Additional Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                      Additional Notes <span className="font-normal normal-case text-gray-400">(Optional)</span>
                    </label>
                    <TemplateSearchPopover
                      templateType="radiology"
                      currentValues={{ findings, impression, notes }}
                      onTemplateSelect={(data) => {
                        if (data.findings) setFindings(data.findings);
                        if (data.impression) setImpression(data.impression);
                        if (data.notes) setNotes(data.notes);
                      }}
                    />
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Any recommendations or follow-up notes…"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 transition-colors resize-y"
                  />
                </div>
              </div>
            </section>

            {/* ── Section: Imaging Results ─────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Imaging Results</h2>
              </div>

              {/* Existing images preview row */}
              {existingImages.length > 0 && (
                <div className="mb-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {existingImages.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => {
                          setSelectedExistingImageId(img.id);
                          openGallery(existingGalleryImages, img.id);
                        }}
                        className="group relative rounded-xl overflow-hidden bg-gray-900 aspect-[4/3] border-2 border-transparent hover:border-indigo-400 transition-all"
                      >
                        <img src={img.url} alt={img.label} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-2">
                          <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
                            {img.viewPlane || img.label}
                          </p>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-[10px] font-medium text-emerald-300 truncate">{img.fileName || img.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png,.dcm"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center pointer-events-none">
                  <div className={`p-3 rounded-full mb-3 ${dragActive ? 'bg-indigo-200' : 'bg-gray-100'}`}>
                    <Upload className={`h-6 w-6 ${dragActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">
                    {dragActive ? 'Drop images here' : 'Click or drag images to upload'}
                  </p>
                  <p className="text-xs text-gray-500">JPEG, PNG, DICOM — max 50 MB per file</p>
                </div>
              </div>

              {uploadError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {uploadError}
                </div>
              )}

              {/* New uploaded image thumbnails */}
              {images.length > 0 && (
                <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImageId(img.id)}
                      className={`group relative rounded-xl overflow-hidden bg-gray-900 aspect-[4/3] cursor-pointer border-2 transition-all ${
                        selectedImageId === img.id ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-transparent hover:border-indigo-400'
                      }`}
                    >
                      {img.previewUrl ? (
                        <img
                          src={img.previewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          onError={() => handleImageError(img.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Scan className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-2 flex items-start justify-between">
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate flex-1">
                          {img.viewPlane}
                        </p>
                        <div className="flex items-center gap-1">
                          {img.isKeyImage && <Star className="h-3 w-3 text-amber-400 fill-current" />}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                            className="p-0.5 rounded bg-black/30 hover:bg-red-600 text-white transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-[10px] font-medium text-emerald-300 truncate">{img.file.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected image details panel */}
              {selectedImageId && images.find((i) => i.id === selectedImageId) && (() => {
                const img = images.find((i) => i.id === selectedImageId)!;
                return (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 truncate max-w-[400px]">{img.file.name}</h4>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openGallery(newGalleryImages, img.id)} className="p-1.5 rounded-lg bg-gray-100 text-indigo-600 hover:bg-indigo-50" title="Full screen">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setAsKeyImage(img.id)} className={`p-1.5 rounded-lg transition-colors ${img.isKeyImage ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 hover:text-amber-500'}`} title="Set as Key Image">
                          <Star className={`h-4 w-4 ${img.isKeyImage ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">View Plane</label>
                        <Select
                          value={img.viewPlane}
                          onChange={(e) => updateImage(img.id, { viewPlane: e.target.value as ViewPlane })}
                          options={VIEW_PLANES.map((plane) => ({ value: plane, label: plane }))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Sequence</label>
                        <input
                          type="number"
                          value={img.sequenceNumber}
                          onChange={(e) => updateImage(img.id, { sequenceNumber: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <ImageGalleryModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                title="Radiology Image Viewer"
                images={galleryImages}
                initialIndex={galleryIndex}
              />
            </section>

            {/* ── Section: Urgency & Status ────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Urgency &amp; Report Status</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Urgency */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">Urgency Level</p>
                  <div className="space-y-2">
                    {URGENCY_LEVELS.map((level) => (
                      <label
                        key={level}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          urgency === level
                            ? level === 'Critical' ? 'bg-red-50 border-2 border-red-300'
                            : level === 'Urgent' ? 'bg-orange-50 border-2 border-orange-300'
                            : 'bg-green-50 border-2 border-green-300'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="radio" name="urgency" value={level} checked={urgency === level}
                          onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                          className="h-4 w-4 text-primary-700 focus:ring-primary-700"
                        />
                        <span className={`font-medium ${
                          urgency === level
                            ? level === 'Critical' ? 'text-red-700' : level === 'Urgent' ? 'text-orange-700' : 'text-green-700'
                            : 'text-gray-700'
                        }`}>{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preliminary status */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">Report Status</p>
                  <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                    isPreliminary ? 'bg-amber-50 border-2 border-amber-300' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}>
                    <input type="checkbox" checked={isPreliminary} onChange={(e) => setIsPreliminary(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                    <div>
                      <span className={`font-semibold ${isPreliminary ? 'text-amber-700' : 'text-gray-700'}`}>Preliminary Report</span>
                      <p className={`text-xs ${isPreliminary ? 'text-amber-600' : 'text-gray-500'}`}>Mark as preliminary, pending final review</p>
                    </div>
                  </label>
                  {isPreliminary && (
                    <div className="mt-3 p-3 bg-amber-100 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">This report will be marked as preliminary and will require verification before being finalized.</p>
                    </div>
                  )}
                </div>
              </div>

              {urgency === 'Critical' && (
                <div className="mt-4 bg-red-100 border border-red-300 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">Critical Finding Alert</p>
                    <p className="text-sm text-red-700">This report will be flagged as critical. The referring physician will be notified immediately.</p>
                  </div>
                </div>
              )}
            </section>

          </div>
        </form>
      </main>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-200 px-4 lg:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button type="button" onClick={handleSaveDraft} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors">
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button type="button" onClick={handlePrintPreview} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors">
              <FileText className="h-4 w-4" />
              Print Preview
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Reporting Physician</p>
              <p className="text-sm font-bold text-gray-900">
                Dr. {request.doctor?.first_name} {request.doctor?.last_name}
              </p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {request.doctor?.first_name?.charAt(0)}{request.doctor?.last_name?.charAt(0)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}



