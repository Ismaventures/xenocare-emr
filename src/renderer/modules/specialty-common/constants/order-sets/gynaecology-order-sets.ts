import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const GYNAECOLOGY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'gynae-os-cervical-screening',
    specialty_code: 'GYNAECOLOGY',
    set_name: 'Cervical Screening',
    description: 'Cervical cancer screening investigations',
    clinical_scenario:
      'Routine cervical screening, abnormal smear result, or HPV+',
    orders: {
      lab_tests: [
        {
          name: 'Pap Smear / Cervical Cytology',
          code: 'PAP',
          specimen_type: 'Cervical cells',
        },
        {
          name: 'HPV DNA Test',
          code: 'HPV_DNA',
          specimen_type: 'Cervical swab',
        },
        {
          name: 'High Vaginal Swab M&CS',
          code: 'HVS',
          specimen_type: 'Vaginal swab',
        },
        {
          name: 'Endocervical Swab (Chlamydia / Gonorrhoea PCR)',
          code: 'STI_PCR',
          specimen_type: 'Endocervical swab',
        },
      ],
      imaging: [
        {
          name: 'Colposcopy',
          code: 'COLPO',
          modality: 'Endoscopy',
          body_part: 'Cervix',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'gynae-os-fertility',
    specialty_code: 'GYNAECOLOGY',
    set_name: 'Fertility / Subfertility Workup',
    description:
      'Comprehensive investigation panel for subfertility assessment',
    clinical_scenario:
      'Couple trying to conceive for >12 months without success',
    orders: {
      lab_tests: [
        { name: 'FSH (Day 2-3)', code: 'FSH', specimen_type: 'Blood' },
        { name: 'LH (Day 2-3)', code: 'LH', specimen_type: 'Blood' },
        { name: 'Oestradiol (E2)', code: 'E2', specimen_type: 'Blood' },
        { name: 'Progesterone (Day 21)', code: 'PROG', specimen_type: 'Blood' },
        {
          name: 'AMH (Anti-Müllerian Hormone)',
          code: 'AMH',
          specimen_type: 'Blood',
        },
        { name: 'Prolactin', code: 'PRL', specimen_type: 'Blood' },
        { name: 'TSH', code: 'TSH', specimen_type: 'Blood' },
        {
          name: 'Rubella Immunity (IgG)',
          code: 'RUBELLA',
          specimen_type: 'Blood',
        },
      ],
      imaging: [
        {
          name: 'Pelvic Ultrasound (Transvaginal)',
          code: 'TVS',
          modality: 'Ultrasound',
          body_part: 'Pelvis (transvaginal)',
        },
        {
          name: 'Hysterosalpingography (HSG)',
          code: 'HSG',
          modality: 'Fluoroscopy',
          body_part: 'Uterus / Fallopian tubes',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'gynae-os-menorrhagia',
    specialty_code: 'GYNAECOLOGY',
    set_name: 'Menorrhagia / Abnormal Uterine Bleeding Workup',
    description:
      'Investigation panel for heavy or irregular menstrual bleeding',
    clinical_scenario:
      'Heavy periods, intermenstrual bleeding, or postmenopausal bleeding',
    orders: {
      lab_tests: [
        {
          name: 'Full Blood Count (Anaemia)',
          code: 'FBC',
          specimen_type: 'Blood',
        },
        { name: 'Coagulation Screen', code: 'COAG', specimen_type: 'Blood' },
        { name: 'TSH', code: 'TSH', specimen_type: 'Blood' },
        {
          name: 'Beta-hCG (Pregnancy Test)',
          code: 'BHCG',
          specimen_type: 'Blood / Urine',
        },
        {
          name: 'Endometrial Biopsy (Pipelle)',
          code: 'ENDOM_BX',
          specimen_type: 'Endometrial sample',
        },
      ],
      imaging: [
        {
          name: 'Pelvic / Transvaginal Ultrasound',
          code: 'PELV_USS',
          modality: 'Ultrasound',
          body_part: 'Pelvis',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
