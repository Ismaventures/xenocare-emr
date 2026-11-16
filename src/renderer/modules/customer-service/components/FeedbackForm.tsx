import React, { useMemo, useState } from 'react';
import {
  Search,
  Phone,
  User,
  Mail,
  MessageSquare,
  AlertTriangle,
  ThumbsUp,
  HelpCircle,
  Lightbulb,
  X,
  Check,
  Loader2,
  Send,
} from 'lucide-react';
import { useCreateFeedback } from '../hooks/useCustomerService';
import {
  CreateFeedbackDTO,
  FeedbackPriority,
  FeedbackType,
} from '../dtos/customer-service.dto';
import { usePatients } from '../../patient-registration/hooks/usePatient';
import { useToast } from '../../../components/ui/Toast';

interface FeedbackFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const INPUT_CLS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700/20 transition-colors';
const LABEL_CLS = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1';

const feedbackTypes: { value: FeedbackType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'Complaint', label: 'Complaint', icon: AlertTriangle, color: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'Suggestion', label: 'Suggestion', icon: Lightbulb, color: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'Compliment', label: 'Compliment', icon: ThumbsUp, color: 'border-green-200 bg-green-50 text-green-700' },
  { value: 'Inquiry', label: 'Inquiry', icon: HelpCircle, color: 'border-amber-200 bg-amber-50 text-amber-700' },
];

const priorities: { value: FeedbackPriority; label: string; color: string }[] = [
  { value: 'Low', label: 'Low', color: 'border-gray-200 bg-gray-50 text-gray-600' },
  { value: 'Normal', label: 'Normal', color: 'border-blue-200 bg-blue-50 text-blue-600' },
  { value: 'High', label: 'High', color: 'border-orange-200 bg-orange-50 text-orange-600' },
  { value: 'Urgent', label: 'Urgent', color: 'border-red-200 bg-red-50 text-red-600' },
];

export function FeedbackForm({ onSuccess, onCancel }: FeedbackFormProps) {
  const [patientQuery, setPatientQuery] = useState('');
  const [patientSelected, setPatientSelected] = useState(false);
  const [payload, setPayload] = useState<CreateFeedbackDTO>({
    feedback_type: 'Complaint' as FeedbackType,
    subject: '',
    description: '',
    priority: 'Normal' as FeedbackPriority,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createFeedback = useCreateFeedback();
  const { data: patients } = usePatients({ query: patientQuery });
  const { showToast } = useToast();

  const patientChoices = useMemo(() => {
    if (!patients || !patientQuery || patientSelected) return [];
    return patients.slice(0, 6);
  }, [patients, patientQuery, patientSelected]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!payload.subject.trim()) next.subject = 'Subject is required';
    if (!payload.description.trim()) next.description = 'Description is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createFeedback.mutateAsync(payload);
      showToast({
        type: 'success',
        title: 'Feedback Submitted',
        message: 'Thank you for your feedback',
      });
      onSuccess();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Submit Failed',
        message: 'Failed to submit feedback',
      });
    }
  };

  const clearPatient = () => {
    setPayload((prev) => ({ ...prev, patient_id: undefined }));
    setPatientQuery('');
    setPatientSelected(false);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* ── Type Selection ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[10px] font-bold text-white">1</div>
          <span className="text-xs font-semibold text-gray-700">Feedback Type</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {feedbackTypes.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setPayload((prev) => ({ ...prev, feedback_type: t.value }))}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                  payload.feedback_type === t.value
                    ? `${t.color} ring-1 ring-current/20`
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Priority ── */}
      <div>
        <label className={LABEL_CLS}>Priority</label>
        <div className="flex gap-2">
          {priorities.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPayload((prev) => ({ ...prev, priority: p.value }))}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
                payload.priority === p.value
                  ? `${p.color} ring-1 ring-current/20`
                  : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Subject & Description ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[10px] font-bold text-white">2</div>
          <span className="text-xs font-semibold text-gray-700">Details</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className={LABEL_CLS}>Subject</label>
            <input
              type="text"
              placeholder="Brief subject line..."
              value={payload.subject}
              onChange={(e) => setPayload((prev) => ({ ...prev, subject: e.target.value }))}
              className={`${INPUT_CLS} ${errors.subject ? 'border-red-300 focus:border-red-500' : ''}`}
            />
            {errors.subject && <p className="mt-1 text-[11px] text-red-500">{errors.subject}</p>}
          </div>
          <div>
            <label className={LABEL_CLS}>Description</label>
            <textarea
              placeholder="Please describe the feedback in detail..."
              value={payload.description}
              onChange={(e) => setPayload((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              className={`${INPUT_CLS} resize-none ${errors.description ? 'border-red-300 focus:border-red-500' : ''}`}
            />
            {errors.description && <p className="mt-1 text-[11px] text-red-500">{errors.description}</p>}
          </div>
        </div>
      </div>

      {/* ── Patient (optional) ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[10px] font-bold text-white">3</div>
          <span className="text-xs font-semibold text-gray-700">Patient</span>
          <span className="text-[10px] text-gray-400 ml-1">(optional)</span>
        </div>

        {patientSelected && payload.patient_id ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Check className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-900 flex-1">{patientQuery}</span>
            <button type="button" onClick={clearPatient} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient by name or phone..."
              value={patientQuery}
              onChange={(e) => { setPatientQuery(e.target.value); setPatientSelected(false); }}
              className={`${INPUT_CLS} pl-10`}
            />
            {patientChoices.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                {patientChoices.map((p) => (
                  <button
                    key={p.patient_id}
                    type="button"
                    className="w-full px-3 py-2.5 text-left hover:bg-primary-700/5 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                    onClick={() => {
                      setPayload((prev) => ({ ...prev, patient_id: p.patient_id }));
                      setPatientQuery(`${p.first_name} ${p.surname}`);
                      setPatientSelected(true);
                    }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700/10 text-xs font-bold text-primary-700">
                      {(p.first_name?.[0] || '') + (p.surname?.[0] || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.first_name} {p.surname}</p>
                    </div>
                    {p.contact_phone && (
                      <span className="text-[11px] text-gray-400">{p.contact_phone}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Contact Info ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[10px] font-bold text-white">4</div>
          <span className="text-xs font-semibold text-gray-700">Contact Info</span>
          <span className="text-[10px] text-gray-400 ml-1">(optional)</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={LABEL_CLS}>
              <User className="inline h-3 w-3 mr-1" />
              Name
            </label>
            <input
              type="text"
              placeholder="Contact name"
              value={payload.contact_name || ''}
              onChange={(e) => setPayload((prev) => ({ ...prev, contact_name: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              <Phone className="inline h-3 w-3 mr-1" />
              Phone
            </label>
            <input
              type="text"
              placeholder="Phone number"
              value={payload.contact_phone || ''}
              onChange={(e) => setPayload((prev) => ({ ...prev, contact_phone: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              <Mail className="inline h-3 w-3 mr-1" />
              Email
            </label>
            <input
              type="email"
              placeholder="Email address"
              value={payload.contact_email || ''}
              onChange={(e) => setPayload((prev) => ({ ...prev, contact_email: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createFeedback.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-primary-800 disabled:opacity-50 transition-colors"
        >
          {createFeedback.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Submit Feedback
            </>
          )}
        </button>
      </div>
    </form>
  );
}
