import React, { useMemo, useState } from 'react';
import {
  FileText,
  User,
  Calendar,
  Sparkles,
  Wand2,
  ShieldCheck,
} from 'lucide-react';
import ReactQuill from 'react-quill';
import {
  Button,
  Input,
  Select,
  Textarea,
} from '../../../components/ui/FormElements';
import {
  useCreateMedicalReport,
  useReportTemplates,
} from '../hooks/useMedicalReports';
import {
  CreateMedicalReportDTO,
  REPORT_TYPES,
  ReportType,
} from '../dtos/medical-reports.dto';
import { usePatients } from '../../patient-registration/hooks/usePatient';
import { PatientDTO } from '../../patient-registration/dtos/patient.dto';
import { queryAI } from '../../ai-assistant/api/ai.api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import 'react-quill/dist/quill.snow.css';

interface ReportDraftContext {
  reportType: ReportType;
  reportTitle: string;
  validFrom?: string;
  validTo?: string;
  patient?: PatientDTO;
  clinicianName: string;
  templateContent?: string;
  recipient?: string;
  clinicalHighlights?: string;
  supportingFacts?: string;
  deathCertificateContext?: {
    placeOfDeath?: string;
    immediateCause?: string;
    underlyingCause?: string;
    intervalFromOnset?: string;
  };
}

type AIAssistMode = 'draft' | 'improve' | 'quality-check';

const REPORT_GUIDANCE: Record<ReportType, string> = {
  'Medical Certificate':
    'State diagnosis/clinical findings briefly, period of treatment, and explicit recommendation for work/school exemption where appropriate.',
  'Sick Leave':
    'Include fit-to-resume date, duration of sick leave, activity restrictions, and recommended follow-up review.',
  'Fitness Report':
    'Clearly state whether patient is fit, temporarily unfit, or fit with restrictions, and reference the examination basis.',
  'Referral Letter':
    'Summarize presenting complaints, relevant findings, treatment already provided, and specific reason for referral.',
  'Discharge Summary':
    'Cover admission reason, key interventions, discharge condition, medications, counseling, and follow-up plan.',
  'Death Certificate':
    'Use respectful formal wording. Include medically defensible cause of death statement only if supported by records; otherwise mark uncertain fields clearly for clinician completion.',
  'Medical Report':
    'Prepare a concise but complete medico-clinical narrative suitable for administrative review.',
};

const REPORT_CHECKLIST: Record<ReportType, string[]> = {
  'Medical Certificate': [
    'Clear diagnosis or clinical impression',
    'Functional limitation stated',
    'Recommended exemption period',
    'Follow-up recommendation',
  ],
  'Sick Leave': [
    'Leave start and end date',
    'Fitness-to-resume date',
    'Restriction note where needed',
    'Review date documented',
  ],
  'Fitness Report': [
    'Exam basis and date',
    'Fit/unfit conclusion',
    'Specific restrictions if applicable',
    'Duration of validity',
  ],
  'Referral Letter': [
    'Reason for referral',
    'Key clinical findings',
    'Interventions already done',
    'Specific specialist request',
  ],
  'Discharge Summary': [
    'Admission reason and key events',
    'Final diagnosis',
    'Medication at discharge',
    'Follow-up and red-flag advice',
  ],
  'Death Certificate': [
    'Time/place of death',
    'Immediate and underlying cause',
    'Cause sequence medically defensible',
    'Pending data placeholders flagged',
  ],
  'Medical Report': [
    'Clinical history summary',
    'Objective findings',
    'Professional opinion',
    'Administrative purpose alignment',
  ],
};

const DEFAULT_REPORT_TEMPLATES: Record<
  ReportType,
  { title: string; content: string }
> = {
  'Medical Certificate': {
    title: 'Medical Certificate',
    content: [
      'To Whom It May Concern,',
      '',
      'This is to certify that {patient_name} was seen and evaluated at XenoCare on {date}.',
      'Clinical findings are consistent with [brief diagnosis/condition].',
      'The patient is advised to be exempted from regular duties from [start_date] to [end_date].',
      'Review is recommended on [review_date].',
      '',
      'Signed,',
      '{doctor_name}',
    ].join('\n'),
  },
  'Sick Leave': {
    title: 'Sick Leave Certificate',
    content: [
      'SICK LEAVE CERTIFICATE',
      '',
      'Patient: {patient_name}',
      'Assessment Date: {date}',
      'Clinical summary: [insert concise condition summary].',
      'Sick leave period: [start_date] to [end_date].',
      'Fit to resume duties on: [fit_to_resume_date].',
      'Restrictions (if any): [restrictions].',
      '',
      'Attending Clinician:',
      '{doctor_name}',
    ].join('\n'),
  },
  'Fitness Report': {
    title: 'Fitness Report',
    content: [
      'FITNESS REPORT',
      '',
      'Patient: {patient_name}',
      'Exam Date: {date}',
      'Based on examination and available records, patient is assessed as:',
      '[Fit / Temporarily Unfit / Fit with Restrictions]',
      'Restrictions (if applicable): [details].',
      'Validity: [validity_period].',
      '',
      'Clinician:',
      '{doctor_name}',
    ].join('\n'),
  },
  'Referral Letter': {
    title: 'Referral Letter',
    content: [
      'REFERRAL LETTER',
      '',
      'Dear Colleague,',
      'I am referring {patient_name} for specialist evaluation regarding [reason for referral].',
      'Key findings: [findings].',
      'Interventions/treatment already provided: [interventions].',
      'Specific request: [question for receiving specialist].',
      '',
      'Thank you.',
      '{doctor_name}',
    ].join('\n'),
  },
  'Discharge Summary': {
    title: 'Discharge Summary',
    content: [
      'DISCHARGE SUMMARY',
      '',
      'Patient: {patient_name}',
      'Date: {date}',
      'Reason for admission: [reason].',
      'Key events/interventions: [summary].',
      'Discharge diagnosis: [final diagnosis].',
      'Medications on discharge: [medications].',
      'Follow-up plan and warning signs: [follow-up details].',
      '',
      'Prepared by:',
      '{doctor_name}',
    ].join('\n'),
  },
  'Death Certificate': {
    title: 'Death Certificate (Clinical Statement)',
    content: [
      'CLINICAL DEATH STATEMENT',
      '',
      'Patient: {patient_name}',
      'Date: {date}',
      'Place of death: [place_of_death].',
      'Immediate cause of death: [immediate_cause].',
      'Underlying cause of death: [underlying_cause].',
      'Approximate interval from onset to death: [interval].',
      'Other significant conditions: [other_conditions].',
      '',
      'Note: This statement is based on available clinical records and clinician assessment.',
      '{doctor_name}',
    ].join('\n'),
  },
  'Medical Report': {
    title: 'Medical Report',
    content: [
      'MEDICAL REPORT',
      '',
      'Patient: {patient_name}',
      'Date: {date}',
      'Background: [clinical background].',
      'Findings: [objective findings].',
      'Clinical impression: [impression].',
      'Recommendations: [recommendations].',
      '',
      'Attending Clinician:',
      '{doctor_name}',
    ].join('\n'),
  },
};

function getDefaultTemplate(reportType: ReportType): {
  title: string;
  content: string;
} {
  return DEFAULT_REPORT_TEMPLATES[reportType];
}

function getPatientDisplayName(patient?: PatientDTO): string {
  if (!patient) return 'the patient';
  return [patient.first_name, patient.middle_name, patient.surname]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function buildAIAssistPrompt(
  context: ReportDraftContext,
  mode: AIAssistMode,
  currentContent: string,
): string {
  const patientName = getPatientDisplayName(context.patient);
  const patientDemographics = [
    context.patient?.gender ? `Gender: ${context.patient.gender}` : null,
    context.patient?.date_of_birth
      ? `DOB: ${context.patient.date_of_birth}`
      : null,
    context.patient?.patient_category
      ? `Category: ${context.patient.patient_category}`
      : null,
    context.patient?.insurance_type
      ? `Insurance: ${context.patient.insurance_type}`
      : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const modeInstruction: Record<AIAssistMode, string> = {
    draft:
      'Create a complete first draft from scratch. Keep it concise, clinically accurate, and issuance-ready.',
    improve:
      'Improve the existing draft for clarity, legal/administrative quality, and structure while preserving clinical meaning.',
    'quality-check':
      'Perform a strict quality check and return: (1) corrected report body and (2) a short checklist of unresolved gaps.',
  };

  const deathContext = context.deathCertificateContext
    ? [
        context.deathCertificateContext.placeOfDeath
          ? `Place of death: ${context.deathCertificateContext.placeOfDeath}`
          : null,
        context.deathCertificateContext.immediateCause
          ? `Immediate cause of death: ${context.deathCertificateContext.immediateCause}`
          : null,
        context.deathCertificateContext.underlyingCause
          ? `Underlying cause of death: ${context.deathCertificateContext.underlyingCause}`
          : null,
        context.deathCertificateContext.intervalFromOnset
          ? `Interval from onset to death: ${context.deathCertificateContext.intervalFromOnset}`
          : null,
      ]
        .filter(Boolean)
        .join(' | ')
    : '';

  return [
    'You are a senior clinical documentation assistant for an EMR in a Nigerian tertiary setting.',
    `Work on a professional ${context.reportType} for ${patientName}.`,
    patientDemographics ? `Patient context: ${patientDemographics}.` : '',
    context.recipient ? `Primary recipient/purpose: ${context.recipient}.` : '',
    context.clinicalHighlights
      ? `Doctor highlights: ${context.clinicalHighlights}`
      : '',
    context.supportingFacts
      ? `Supporting facts that must be reflected: ${context.supportingFacts}`
      : '',
    deathContext ? `Death-certificate context: ${deathContext}.` : '',
    context.reportTitle
      ? `Preferred report title: ${context.reportTitle}.`
      : '',
    context.validFrom ? `Validity starts: ${context.validFrom}.` : '',
    context.validTo ? `Validity ends: ${context.validTo}.` : '',
    `Clinician signatory: ${context.clinicianName}.`,
    `Report guidance: ${REPORT_GUIDANCE[context.reportType]}`,
    `Mode instruction: ${modeInstruction[mode]}`,
    currentContent.trim()
      ? `Current draft content:\n${currentContent}`
      : 'Current draft content: [none]',
    context.templateContent
      ? `Reference this local template and preserve useful structure/phrasing where appropriate:\n${context.templateContent}`
      : '',
    'Output requirements:',
    mode === 'quality-check'
      ? '1) Return in two blocks: BLOCK A = corrected report body text only. BLOCK B = short quality checklist with unresolved gaps.'
      : '1) Return plain report body text only, no markdown and no bullet-list prefixes unless clinically necessary.',
    '2) Keep the language formal, factual, and ready for direct issuance.',
    '3) If critical facts are missing, insert explicit placeholders in square brackets for clinician review.',
    '4) Do not invent medications, diagnoses, or dates that are not supported by available records.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

interface MedicalReportFormProps {
  patientId?: string;
  visitId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MedicalReportForm({
  patientId,
  visitId,
  onSuccess,
  onCancel,
}: MedicalReportFormProps) {
  const { staff, user } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<CreateMedicalReportDTO>({
    patient_id: patientId || '',
    visit_id: visitId,
    report_type: 'Medical Certificate' as ReportType,
    report_title: '',
    report_content: '',
    valid_from: '',
    valid_to: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDraftingWithAI, setIsDraftingWithAI] = useState(false);
  const [aiQualityNotes, setAiQualityNotes] = useState('');
  const [recipientContext, setRecipientContext] = useState('');
  const [clinicalHighlights, setClinicalHighlights] = useState('');
  const [supportingFacts, setSupportingFacts] = useState('');
  const [deathContext, setDeathContext] = useState({
    placeOfDeath: '',
    immediateCause: '',
    underlyingCause: '',
    intervalFromOnset: '',
  });

  const createReport = useCreateMedicalReport();
  const { data: templates } = useReportTemplates();
  const { data: patientsData } = usePatients({ query: searchTerm });

  const patients = useMemo(() => {
    if (!patientsData) return [] as PatientDTO[];
    if (Array.isArray(patientsData)) return patientsData as PatientDTO[];
    if (
      typeof patientsData === 'object' &&
      patientsData !== null &&
      'patients' in patientsData &&
      Array.isArray((patientsData as { patients: unknown[] }).patients)
    ) {
      return (patientsData as { patients: PatientDTO[] }).patients;
    }
    return [] as PatientDTO[];
  }, [patientsData]);

  const selectedPatient = useMemo(
    () =>
      patients.find(
        (patient) =>
          (patient.id && patient.id === formData.patient_id) ||
          patient.patient_id === formData.patient_id,
      ),
    [patients, formData.patient_id],
  );

  const handleChange = (field: keyof CreateMedicalReportDTO, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleTemplateSelect = (reportType: ReportType) => {
    handleChange('report_type', reportType);
    setAiQualityNotes('');
    const template = templates?.find((t) => t.report_type === reportType);
    const fallbackTemplate = getDefaultTemplate(reportType);
    handleChange(
      'report_content',
      template?.template_content || fallbackTemplate.content,
    );
    handleChange(
      'report_title',
      `${fallbackTemplate.title} - ${new Date().toLocaleDateString()}`,
    );
  };

  const handleApplyTemplate = () => {
    const reportType = formData.report_type;
    const template = templates?.find((t) => t.report_type === reportType);
    const fallbackTemplate = getDefaultTemplate(reportType);

    handleChange(
      'report_content',
      template?.template_content || fallbackTemplate.content,
    );
    if (!formData.report_title.trim()) {
      handleChange(
        'report_title',
        `${fallbackTemplate.title} - ${new Date().toLocaleDateString()}`,
      );
    }
  };

  const handleAIAssist = async (mode: AIAssistMode) => {
    if (!formData.patient_id) {
      setErrors((prev) => ({
        ...prev,
        patient_id: 'Patient is required before AI drafting',
      }));
      showToast({
        type: 'warning',
        title: 'Patient Required',
        message: 'Select a patient before generating a report with AI.',
      });
      return;
    }

    const template = templates?.find(
      (item) => item.report_type === formData.report_type,
    );
    const clinicianName =
      [staff?.first_name, staff?.last_name].filter(Boolean).join(' ').trim() ||
      'Attending Clinician';

    const draftPrompt = buildAIAssistPrompt(
      {
        reportType: formData.report_type,
        reportTitle: formData.report_title,
        validFrom: formData.valid_from,
        validTo: formData.valid_to,
        patient: selectedPatient,
        clinicianName,
        templateContent: template?.template_content,
        recipient: recipientContext,
        clinicalHighlights,
        supportingFacts,
        deathCertificateContext:
          formData.report_type === 'Death Certificate'
            ? deathContext
            : undefined,
      },
      mode,
      formData.report_content,
    );

    setIsDraftingWithAI(true);
    try {
      const response = await queryAI({
        patientId: formData.patient_id,
        query: draftPrompt,
        requestType: mode === 'quality-check' ? 'completeness' : 'draft',
        assistantScope: 'clinical',
        facilityId: staff?.facility_id || undefined,
        userId: staff?.id || user?.id || undefined,
        searchType: 'hybrid',
        maxResults: 8,
      });

      let draftedContent = response.answer?.trim();
      if (!draftedContent) {
        throw new Error('AI returned an empty draft');
      }

      // Automatically strip trailing or leading AI disclaimers from the final clinical text
      draftedContent = draftedContent
        .replace(/AI-generated summary\s*-\s*verify.*/gi, '')
        .trim();

      const nextTitle =
        formData.report_title.trim() ||
        `${formData.report_type} - ${new Date().toLocaleDateString()}`;

      if (mode === 'quality-check') {
        const qualityDelimiter = /BLOCK\s*B\s*[:\-]|Quality Checklist[:\-]/i;
        const splitIndex = draftedContent.search(qualityDelimiter);
        const contentBlock =
          splitIndex >= 0
            ? draftedContent
                .slice(0, splitIndex)
                .replace(/BLOCK\s*A\s*[:\-]/i, '')
                .trim()
            : draftedContent;
        const qualityBlock =
          splitIndex >= 0 ? draftedContent.slice(splitIndex).trim() : '';

        setFormData((prev) => ({
          ...prev,
          report_title: nextTitle,
          report_content: contentBlock || prev.report_content,
        }));
        setAiQualityNotes(qualityBlock);
      } else {
        setFormData((prev) => ({
          ...prev,
          report_title: nextTitle,
          report_content: draftedContent,
        }));
      }

      setErrors((prev) => ({
        ...prev,
        report_title: '',
        report_content: '',
      }));

      showToast({
        type: 'success',
        title:
          mode === 'draft'
            ? 'AI Draft Ready'
            : mode === 'improve'
              ? 'AI Revision Ready'
              : 'AI Quality Review Ready',
        message:
          mode === 'quality-check'
            ? 'Corrected draft and quality checklist generated. Review carefully before creating.'
            : 'Report content has been generated. Review and edit before creating.',
      });
    } catch (error) {
      console.error('AI drafting failed:', error);
      showToast({
        type: 'error',
        title: 'AI Assist Failed',
        message:
          'Could not complete AI assistance right now. You can still continue manually.',
      });
    } finally {
      setIsDraftingWithAI(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patient_id) {
      newErrors.patient_id = 'Patient is required';
    }
    if (!formData.report_type) {
      newErrors.report_type = 'Report type is required';
    }
    if (!formData.report_title) {
      newErrors.report_title = 'Report title is required';
    }
    if (!formData.report_content) {
      newErrors.report_content = 'Report content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await createReport.mutateAsync(formData);
      onSuccess();
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient Selection */}
      {!patientId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patient <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Search patient by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={User}
          />
          {patients && patients.length > 0 && searchTerm && (
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
              {patients.map((patient) => (
                <button
                  key={patient.id || patient.patient_id}
                  type="button"
                  onClick={() => {
                    handleChange(
                      'patient_id',
                      patient.id || patient.patient_id,
                    );
                    setSearchTerm(`${patient.first_name} ${patient.surname}`);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between"
                >
                  <span>
                    {patient.first_name} {patient.surname}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {patient.contact_phone}
                  </span>
                </button>
              ))}
            </div>
          )}
          {errors.patient_id && (
            <p className="text-red-500 text-sm mt-1">{errors.patient_id}</p>
          )}
        </div>
      )}

      {/* Report Type */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Report Type <span className="text-red-500">*</span>
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleApplyTemplate}
          >
            Apply Smart Template
          </Button>
        </div>
        <Select
          value={formData.report_type}
          onChange={(e) => handleTemplateSelect(e.target.value as ReportType)}
          options={REPORT_TYPES}
          error={errors.report_type}
        />
      </div>

      {/* Report Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Report Title <span className="text-red-500">*</span>
        </label>
        <Input
          value={formData.report_title}
          onChange={(e) => handleChange('report_title', e.target.value)}
          placeholder="Enter report title"
          leftIcon={FileText}
          error={errors.report_title}
        />
      </div>

      {/* Validity Period */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valid From
          </label>
          <Input
            type="date"
            value={formData.valid_from || ''}
            onChange={(e) => handleChange('valid_from', e.target.value)}
            leftIcon={Calendar}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valid To
          </label>
          <Input
            type="date"
            value={formData.valid_to || ''}
            onChange={(e) => handleChange('valid_to', e.target.value)}
            leftIcon={Calendar}
          />
        </div>
      </div>

      {/* Advanced AI Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Report Recipient / Purpose
          </label>
          <Input
            value={recipientContext}
            onChange={(e) => setRecipientContext(e.target.value)}
            placeholder="e.g. HR Department, School Management, Insurance review"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Doctor Highlights
          </label>
          <Input
            value={clinicalHighlights}
            onChange={(e) => setClinicalHighlights(e.target.value)}
            placeholder="Key findings or constraints AI must include"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Supporting Facts (Optional)
        </label>
        <Textarea
          value={supportingFacts}
          onChange={(e) => setSupportingFacts(e.target.value)}
          rows={3}
          placeholder="Add legal/admin facts, timeline facts, specific wording requirements, or red-flag cautions."
        />
      </div>

      {formData.report_type === 'Death Certificate' && (
        <div className="border border-red-100 bg-red-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-red-800">
            Death Certificate Context
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              value={deathContext.placeOfDeath}
              onChange={(e) =>
                setDeathContext((prev) => ({
                  ...prev,
                  placeOfDeath: e.target.value,
                }))
              }
              placeholder="Place of death"
            />
            <Input
              value={deathContext.intervalFromOnset}
              onChange={(e) =>
                setDeathContext((prev) => ({
                  ...prev,
                  intervalFromOnset: e.target.value,
                }))
              }
              placeholder="Interval from onset to death"
            />
            <Input
              value={deathContext.immediateCause}
              onChange={(e) =>
                setDeathContext((prev) => ({
                  ...prev,
                  immediateCause: e.target.value,
                }))
              }
              placeholder="Immediate cause of death"
            />
            <Input
              value={deathContext.underlyingCause}
              onChange={(e) =>
                setDeathContext((prev) => ({
                  ...prev,
                  underlyingCause: e.target.value,
                }))
              }
              placeholder="Underlying cause of death"
            />
          </div>
          <p className="text-xs text-red-700">
            Enter only medically confirmed facts. Unknown values should remain
            blank for clinician review.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-green-100 bg-green-50 p-3">
        <p className="text-xs font-semibold text-green-800 mb-1">
          Report Quality Checklist ({formData.report_type})
        </p>
        <ul className="text-xs text-green-900 list-disc pl-4 space-y-1">
          {REPORT_CHECKLIST[formData.report_type].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Report Content */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Report Content <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
              onClick={() => handleAIAssist('draft')}
              disabled={!formData.patient_id}
              isLoading={isDraftingWithAI}
            >
              <Sparkles size={14} className="mr-1.5 text-indigo-500" />
              Draft with AI
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              onClick={() => handleAIAssist('improve')}
              disabled={!formData.patient_id || !formData.report_content.trim()}
              isLoading={isDraftingWithAI}
            >
              <Wand2 size={14} className="mr-1.5 text-emerald-500" />
              Improve Draft
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/30"
              onClick={() => handleAIAssist('quality-check')}
              disabled={!formData.patient_id || !formData.report_content.trim()}
              isLoading={isDraftingWithAI}
            >
              <ShieldCheck size={14} className="mr-1.5 text-amber-500" />
              Quality Check
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <ReactQuill
            theme="snow"
            value={formData.report_content}
            onChange={(value) => handleChange('report_content', value)}
            placeholder="Enter medical report content here..."
            className="h-64 mb-12"
          />
        </div>
        {errors.report_content && (
          <p className="mt-1 text-sm text-red-600">{errors.report_content}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          You can use placeholders like {'{patient_name}'}, {'{date}'},{' '}
          {'{doctor_name}'} which will be replaced when issued.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          AI drafts are suggestions. Clinicians must verify diagnosis wording,
          leave duration, and legal facts before issuing.
        </p>
        {aiQualityNotes && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              AI Quality Checklist
            </p>
            <pre className="text-xs text-amber-900 whitespace-pre-wrap font-sans">
              {aiQualityNotes}
            </pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={createReport.isPending}>
          Create Report
        </Button>
      </div>
    </form>
  );
}
