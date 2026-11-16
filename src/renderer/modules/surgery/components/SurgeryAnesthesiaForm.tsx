import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  CheckCircle,
  Syringe,
  Activity,
  Droplets,
  Wind,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAnesthesiaRecords, useSurgeries } from '../hooks/useSurgery';
import {
  AnesthesiaType,
  MedicationDose,
  VitalSignEntry,
  FluidGiven,
  SurgeryAnesthesiaRecord,
} from '../types/surgery.types';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';

const SurgeryAnesthesiaForm: React.FC = () => {
  const navigate = useNavigate();
  const { surgeryId } = useParams<{ surgeryId: string }>();

  const { getSurgeryById } = useSurgeries();
  const { getRecord, createRecord, updateRecord } = useAnesthesiaRecords();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  // Form State
  const [anesthesiaType, setAnesthesiaType] =
    useState<AnesthesiaType>('General');
  const [anesthesiaTechnique, setAnesthesiaTechnique] = useState('');
  const [airwayManagement, setAirwayManagement] = useState('');

  // Lists
  const [premedication, setPremedication] = useState<MedicationDose[]>([]);
  const [inductionAgents, setInductionAgents] = useState<MedicationDose[]>([]);
  const [maintenanceAgents, setMaintenanceAgents] = useState<MedicationDose[]>(
    [],
  );
  const [vitals, setVitals] = useState<VitalSignEntry[]>([]);
  const [fluids, setFluids] = useState<FluidGiven[]>([]);

  // Monitoring & Complications
  const [monitoringUsed, setMonitoringUsed] = useState<string[]>([]);
  const [intraopEvents, setIntraopEvents] = useState('');
  const [complications, setComplications] = useState('');

  useEffect(() => {
    if (surgeryId) {
      loadData();
    }
  }, [surgeryId]);

  const loadData = async () => {
    if (!surgeryId) return;

    // Fetch existing record
    const existing = await getRecord(surgeryId);
    if (existing) {
      setRecordId(existing.id);
      populateForm(existing);
    }
  };

  const populateForm = (data: SurgeryAnesthesiaRecord) => {
    setAnesthesiaType(data.anesthesia_type);
    setAnesthesiaTechnique(data.anesthesia_technique || '');
    setAirwayManagement(data.airway_management || '');
    setPremedication(data.premedication || []);
    setInductionAgents(data.induction_agents || []);
    setMaintenanceAgents(data.maintenance_agents || []);
    setVitals(data.vital_signs_log || []);
    setFluids(data.fluids_given || []);
    setMonitoringUsed(data.monitoring_used || []);
    setIntraopEvents(data.intraop_events || '');
    setComplications(data.complications || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surgeryId) return;

    setSaving(true);
    setError(null);

    const formData = {
      anesthesia_type: anesthesiaType,
      anesthesia_technique: anesthesiaTechnique,
      airway_management: airwayManagement,
      premedication,
      induction_agents: inductionAgents,
      maintenance_agents: maintenanceAgents,
      vital_signs_log: vitals,
      fluids_given: fluids,
      monitoring_used: monitoringUsed,
      intraop_events: intraopEvents,
      complications,
    };

    let success = false;
    if (recordId) {
      success = await updateRecord(recordId, formData);
    } else {
      success = await createRecord(surgeryId, formData);
    }

    setSaving(false);
    if (success) {
      setSuccess(true);
      setTimeout(() => {
        navigate(`/surgery/${surgeryId}`);
      }, 1500);
    } else {
      setError('Failed to save anesthesia record. Please try again.');
    }
  };

  // Helper for adding/removing items from lists
  const addItem = <T,>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    item: T,
  ) => {
    setter((prev) => [...prev, item]);
  };

  const removeItem = <T,>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    index: number,
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  // Components for form sections
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/surgery/${surgeryId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Anesthesia Record
          </h1>
          <p className="text-sm text-gray-500">Intra-operative Documentation</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-700">Record saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Setup */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anesthesia Type
              </label>
              <select
                value={anesthesiaType}
                onChange={(e) =>
                  setAnesthesiaType(e.target.value as AnesthesiaType)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="General">General</option>
                <option value="Regional">Regional</option>
                <option value="Spinal">Spinal</option>
                <option value="Epidural">Epidural</option>
                <option value="Local">Local</option>
                <option value="Sedation">Sedation</option>
                <option value="Combined">Combined</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Technique Details
              </label>
              <input
                type="text"
                value={anesthesiaTechnique}
                onChange={(e) => setAnesthesiaTechnique(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g. TIVA, Inhalational..."
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex justify-end mb-2">
                <TemplateSearchPopover
                  templateType="surgery"
                  category="surgery_anesthesia"
                  currentValues={{ airway_management: airwayManagement }}
                  onTemplateSelect={(data) => {
                    if (data.airway_management) setAirwayManagement(data.airway_management);
                  }}
                  buttonText="Fill All Fields"
                />
              </div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Airway Management
                </label>
                <SavedNotesPopover
                  category="surgery_notes"
                  subcategory="airway_management"
                  currentValue={airwayManagement}
                  onInsert={(content) => setAirwayManagement(content)}
                />
              </div>
              <textarea
                value={airwayManagement}
                onChange={(e) => setAirwayManagement(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="ETT size, LMA size, difficulty..."
              />
            </div>
          </div>
        </div>

        {/* Medications */}
        <MedicationSection
          title="Induction Agents"
          items={inductionAgents}
          onChange={setInductionAgents}
        />

        {/* Monitoring Checklist */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-500" />
            Monitoring Used
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              'ECG',
              'Pulse Oximetry',
              'NIBP',
              'IBP',
              'Capnography',
              'Temperature',
              'Urine Output',
              'BIS',
            ].map((monitor) => (
              <label
                key={monitor}
                className="flex items-center gap-2 bg-gray-50 p-2 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={monitoringUsed.includes(monitor)}
                  onChange={(e) => {
                    if (e.target.checked)
                      setMonitoringUsed([...monitoringUsed, monitor]);
                    else
                      setMonitoringUsed(
                        monitoringUsed.filter((m) => m !== monitor),
                      );
                  }}
                  className="text-blue-600 rounded"
                />
                <span className="text-sm font-medium">{monitor}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Vitals Log (Simplified for now) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-500" />
              Vital Signs Log
            </h3>
            <button
              type="button"
              onClick={() =>
                addItem<VitalSignEntry>(setVitals, {
                  time: new Date().toLocaleTimeString(),
                  bp_systolic: 120,
                  bp_diastolic: 80,
                  heart_rate: 70,
                  spo2: 99,
                })
              }
              className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Entry
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-2">Time</th>
                  <th className="p-2">BP</th>
                  <th className="p-2">HR</th>
                  <th className="p-2">SpO2</th>
                  <th className="p-2">Notes</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {vitals.map((entry, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <input
                        type="time"
                        value={entry.time}
                        onChange={(e) => {
                          const newVitals = [...vitals];
                          newVitals[idx].time = e.target.value;
                          setVitals(newVitals);
                        }}
                        className="border rounded px-1"
                      />
                    </td>
                    <td className="p-2 flex gap-1">
                      <input
                        type="number"
                        value={entry.bp_systolic}
                        onChange={(e) => {
                          const newVitals = [...vitals];
                          newVitals[idx].bp_systolic = Number(e.target.value);
                          setVitals(newVitals);
                        }}
                        className="w-16 border rounded px-1"
                        placeholder="Sys"
                      />
                      /
                      <input
                        type="number"
                        value={entry.bp_diastolic}
                        onChange={(e) => {
                          const newVitals = [...vitals];
                          newVitals[idx].bp_diastolic = Number(e.target.value);
                          setVitals(newVitals);
                        }}
                        className="w-16 border rounded px-1"
                        placeholder="Dia"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={entry.heart_rate}
                        onChange={(e) => {
                          const newVitals = [...vitals];
                          newVitals[idx].heart_rate = Number(e.target.value);
                          setVitals(newVitals);
                        }}
                        className="w-16 border rounded px-1"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={entry.spo2}
                        onChange={(e) => {
                          const newVitals = [...vitals];
                          newVitals[idx].spo2 = Number(e.target.value);
                          setVitals(newVitals);
                        }}
                        className="w-16 border rounded px-1"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={entry.notes || ''}
                        onChange={(e) => {
                          const newVitals = [...vitals];
                          newVitals[idx].notes = e.target.value;
                          setVitals(newVitals);
                        }}
                        className="w-full border rounded px-1"
                      />
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => removeItem(setVitals, idx)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Events & Complications */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-gray-500" />
            Events & Complications
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Intra-operative Events
                </label>
                <SavedNotesPopover
                  category="surgery_notes"
                  subcategory="intraop_events"
                  currentValue={intraopEvents}
                  onInsert={(content) => setIntraopEvents(content)}
                />
              </div>
              <textarea
                value={intraopEvents}
                onChange={(e) => setIntraopEvents(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Record key events..."
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Complications
                </label>
                <SavedNotesPopover
                  category="surgery_notes"
                  subcategory="anesthesia_complications"
                  currentValue={complications}
                  onInsert={(content) => setComplications(content)}
                />
              </div>
              <textarea
                value={complications}
                onChange={(e) => setComplications(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-red-50"
                placeholder="Record any complications..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 sticky bottom-6">
          <button
            type="button"
            onClick={() => navigate(`/surgery/${surgeryId}`)}
            className="px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Record
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const MedicationSection: React.FC<{
  title: string;
  items: MedicationDose[];
  onChange: React.Dispatch<React.SetStateAction<MedicationDose[]>>;
}> = ({ title, items, onChange }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Syringe className="h-5 w-5 text-gray-500" />
        {title}
      </h3>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...items,
            {
              medication: '',
              dose: '',
              route: 'IV',
              time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          ])
        }
        className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
      >
        <Plus className="h-4 w-4" /> Add Drug
      </button>
    </div>
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            placeholder="Medication"
            value={item.medication}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx].medication = e.target.value;
              onChange(newItems);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            placeholder="Dose"
            value={item.dose}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx].dose = e.target.value;
              onChange(newItems);
            }}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <select
            value={item.route}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx].route = e.target.value;
              onChange(newItems);
            }}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option>IV</option>
            <option>IM</option>
            <option>SC</option>
            <option>Oral</option>
            <option>Inhaled</option>
          </select>
          <input
            type="time"
            value={item.time}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx].time = e.target.value;
              onChange(newItems);
            }}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            className="p-2 text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-gray-500 italic">No medications recorded</p>
      )}
    </div>
  </div>
);

export default SurgeryAnesthesiaForm;
