import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  X,
  Loader2,
  AlertTriangle,
  Clock,
  CheckSquare,
  User,
  Syringe,
  Activity,
  Droplets,
  Scissors,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProcedure } from '../api/procedures.api';
import { useAuth } from '../../../contexts/AuthContext';
import { AdmissionWithDetails } from '../../../types/database.types';
import { useToast } from '../../../components/ui/Toast';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';

interface ProcedureNoteFormProps {
  admission: AdmissionWithDetails;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProcedureNoteForm({
  admission,
  onSuccess,
  onCancel,
}: ProcedureNoteFormProps) {
  const { staff } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    procedure_name: '',
    indication: '',
    pre_procedure_diagnosis: admission.admitting_diagnosis || '',
    post_procedure_diagnosis: '',
    anesthesia_type: 'general',
    findings: '',
    procedure_notes: '',
    complications: '',
    estimated_blood_loss_ml: 0,
    technique_description: '',
    post_op_instructions: '',
    priority: 'routine',
  });

  const [activeStep, setActiveStep] = useState<
    'pre-op' | 'operative' | 'post-op'
  >('pre-op');

  const createMutation = useMutation({
    mutationFn: createProcedure,
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Procedure Recorded',
        message: 'Operative note saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['procedures', admission.id] });
      onSuccess();
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to save procedure',
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.procedure_name) {
      showToast({
        type: 'warning',
        title: 'Required Field',
        message: 'Procedure name is required',
      });
      return;
    }

    createMutation.mutate({
      admission_id: admission.id,
      patient_id: admission.patient_id,
      encounter_id: admission.encounter_id, // Important: Procedures must link to encounter
      primary_surgeon_id: staff?.id,
      created_by: staff?.id, // Required NOT NULL column
      status: 'completed', // Assuming writing the note means it's done
      actual_end_time: new Date().toISOString(), // Now
      facility_id: (admission as any).facility_id || staff?.facility_id, // Fallback
      ...formData,
    });
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Scissors className="h-5 w-5 text-blue-600" />
            Operative Note
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {admission.admission_number} • {admission.admitting_diagnosis}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* LEFT SIDEBAR - STEPS & CONTEXT */}
        <div className="w-64 bg-slate-100 border-r border-slate-200 p-4 space-y-6 hidden lg:block overflow-y-auto">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveStep('pre-op')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                activeStep === 'pre-op'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckSquare size={16} /> Pre-Operative
            </button>
            <button
              onClick={() => setActiveStep('operative')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                activeStep === 'operative'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Scissors size={16} /> Operative Details
            </button>
            <button
              onClick={() => setActiveStep('post-op')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                activeStep === 'post-op'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Activity size={16} /> Post-Operative
            </button>
          </nav>

          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Surgeon
            </h4>
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <User size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Dr. {staff?.last_name || 'Current User'}
                </p>
                <p className="text-xs text-slate-500">Primary Surgeon</p>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN FORM AREA */}
        <div className="flex-1 overflow-y-auto bg-white p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* PROCEDURE NAME & DIAGNOSIS (Always Visible) */}
            <div className="grid grid-cols-1 gap-6 pb-6 border-b border-gray-100">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Procedure Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                  placeholder="e.g., Appendectomy, Laparoscopic"
                  value={formData.procedure_name}
                  onChange={(e) =>
                    setFormData({ ...formData, procedure_name: e.target.value })
                  }
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pre-Operative Diagnosis
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.pre_procedure_diagnosis}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pre_procedure_diagnosis: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post-Operative Diagnosis
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Same as pre-op if unchanged"
                    value={formData.post_procedure_diagnosis}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        post_procedure_diagnosis: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* DYNAMIC SECTIONS */}
            {activeStep === 'pre-op' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Syringe className="text-blue-500" /> Anesthesia &
                    Indication
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Anesthesia Type
                      </label>
                      <select
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                        value={formData.anesthesia_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            anesthesia_type: e.target.value,
                          })
                        }
                      >
                        <option value="general">General Anesthesia</option>
                        <option value="spinal">Spinal</option>
                        <option value="epidural">Epidural</option>
                        <option value="regional">Regional Block</option>
                        <option value="local">Local</option>
                        <option value="sedation">Sedation (MAC)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData({ ...formData, priority: e.target.value })
                        }
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Indication for Surgery
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                        placeholder="Why is this procedure being performed?"
                        value={formData.indication}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            indication: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setActiveStep('operative')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Next: Operative Details
                  </button>
                </div>
              </div>
            )}

            {activeStep === 'operative' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Scissors className="text-blue-500" /> Procedure Details
                </h3>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Full Procedure Note / Steps
                    </label>
                    <SavedNotesPopover
                      category="procedure_notes"
                      subcategory="procedure_steps"
                      currentValue={formData.procedure_notes}
                      onInsert={(content) => setFormData({ ...formData, procedure_notes: content })}
                    />
                  </div>
                  <textarea
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Describe the procedure in detail..."
                    value={formData.procedure_notes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        procedure_notes: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Findings
                      </label>
                      <SavedNotesPopover
                        category="procedure_notes"
                        subcategory="findings"
                        currentValue={formData.findings}
                        onInsert={(content) => setFormData({ ...formData, findings: content })}
                      />
                    </div>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      placeholder="Intra-operative findings..."
                      value={formData.findings}
                      onChange={(e) =>
                        setFormData({ ...formData, findings: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Technique Description
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      placeholder="Specific techniques used (e.g. Suturing method)..."
                      value={formData.technique_description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          technique_description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 p-4 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <label className="block text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                      <Droplets size={16} /> Estimated Blood Loss (ml)
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2.5 border border-red-200 rounded-lg"
                      value={formData.estimated_blood_loss_ml}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimated_blood_loss_ml:
                            parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} /> Complications
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-red-200 rounded-lg"
                      placeholder="None / Describe complications..."
                      value={formData.complications}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          complications: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setActiveStep('pre-op')}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setActiveStep('post-op')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Next: Post-Op Plan
                  </button>
                </div>
              </div>
            )}

            {activeStep === 'post-op' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="text-blue-500" /> Post-Operative Plan
                </h3>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Instructions / Orders
                    </label>
                    <SavedNotesPopover
                      category="procedure_notes"
                      subcategory="post_op_instructions"
                      currentValue={formData.post_op_instructions}
                      onInsert={(content) => setFormData({ ...formData, post_op_instructions: content })}
                    />
                  </div>
                  <textarea
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Post-op medications, monitoring instructions, diet..."
                    value={formData.post_op_instructions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        post_op_instructions: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-4">
                  <Clock className="text-blue-600 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">
                      Procedure Complete?
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Saving this note will mark the procedure as 'Completed'
                      and log the end time as now.
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 flex justify-between items-center">
                  <button
                    onClick={() => setActiveStep('operative')}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-70 flex items-center gap-2"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Save />
                    )}
                    Sign & Save Note
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
