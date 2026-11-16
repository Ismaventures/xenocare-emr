import React from 'react';
import { Lightbulb } from 'lucide-react';
import { useGuidance } from '../../contexts/GuidanceContext';

export const GuidanceSettings: React.FC = () => {
  const {
    isGuidanceEnabled,
    toggleGlobalGuidance,
    modulePreferences,
    toggleModuleGuidance,
  } = useGuidance();

  const modules = [
    { id: 'nhis', label: 'NHIS Module' },
    { id: 'surgery', label: 'Surgery Module' },
    { id: 'consultation', label: 'Clinical Consultation' },
    { id: 'registration', label: 'Patient Registration' },
    { id: 'nursing', label: 'Nursing & Vitals' },
    { id: 'lab', label: 'Laboratory' },
    { id: 'pharmacy', label: 'Pharmacy' },
    { id: 'radiology', label: 'Radiology' },
    { id: 'billing', label: 'Billing & Finance' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'in-patient', label: 'Inpatient & Wards' },
    { id: 'dental', label: 'Dental Clinic' },
    { id: 'ophthalmology', label: 'Ophthalmology (Eye Clinic)' },
    { id: 'physiotherapy', label: 'Physiotherapy' },
    { id: 'hygiene', label: 'Hygiene & Infection Control' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
        <div className="flex flex-col">
          <span className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-500" />
            App Usage Guidance
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Show helpful tooltips and workflow guides across the application.
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isGuidanceEnabled}
            onChange={toggleGlobalGuidance}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
        </label>
      </div>

      {isGuidanceEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 animate-fade-in">
          <h5 className="col-span-full text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Module Specific Settings
          </h5>
          {modules.map((mod) => (
            <div
              key={mod.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {mod.label}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={modulePreferences[mod.id] !== false} // Default true
                  onChange={() => toggleModuleGuidance(mod.id)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
