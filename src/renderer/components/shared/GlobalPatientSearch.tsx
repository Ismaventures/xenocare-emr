import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  User,
  Loader2,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import { usePatientSearch } from '../../modules/patient-registration/hooks/usePatient';
import { PatientDTO } from '../../modules/patient-registration/dtos/patient.dto';

interface GlobalPatientSearchProps {
  onUiAction?: () => void;
}

export function GlobalPatientSearch({
  onUiAction,
  externalOpen,
  setExternalOpen,
}: {
  onUiAction?: () => void;
  externalOpen?: boolean;
  setExternalOpen?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = setExternalOpen || setInternalOpen;
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Use existing hook for searching
  const { data: results, isLoading } = usePatientSearch(query);
  const patients = results || [];

  // Toggle search modal with Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Use local component state instead of a dedicated hook if possible for simple shortcut
  // But since we want it global, useEffect on window is correct.

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Navigate keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < patients.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (patients[selectedIndex]) {
          handleSelect(patients[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, patients, selectedIndex]);

  const handleSelect = (patient: PatientDTO) => {
    setIsOpen(false);
    onUiAction?.();
    navigate(`/medical-records/${patient.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Search Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
        <div className="flex items-center px-4 py-3 border-b border-gray-100 gap-3">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-lg bg-transparent border-none outline-none placeholder:text-gray-400"
            placeholder="Search patients by name, ID, or phone..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded border border-gray-200">
              Esc
            </kbd>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Searching database...
            </div>
          ) : patients.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patients Found
              </div>
              <ul className="space-y-0.5 px-2">
                {patients.map((patient: PatientDTO, index: number) => (
                  <li key={patient.id}>
                    <button
                      onClick={() => handleSelect(patient)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                          : 'hover:bg-gray-50 text-gray-900'
                      }`}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div
                        className={`
                        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                        ${index === selectedIndex ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-600'}
                      `}
                      >
                        {patient.first_name?.[0]}
                        {patient.surname?.[0]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">
                            {patient.first_name} {patient.surname}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${index === selectedIndex ? 'bg-emerald-200/50' : 'bg-gray-100'}`}
                          >
                            {patient.gender?.[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm opacity-80 mt-0.5">
                          <span>{patient.emr_number}</span>
                          <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                          {patient.date_of_birth && (
                            <span>
                              {new Date().getFullYear() -
                                new Date(
                                  patient.date_of_birth,
                                ).getFullYear()}{' '}
                              yrs
                            </span>
                          )}
                          {patient.contact_phone && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                              <span>{patient.contact_phone}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {index === selectedIndex && (
                        <CornerDownLeft className="h-4 w-4 opacity-50 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : query ? (
            <div className="py-12 text-center text-gray-500">
              <User className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No patients found for "{query}"</p>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Type to search for patients...</p>
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
          <div className="flex gap-4">
            <span>
              <kbd className="font-mono bg-white border rounded px-1">↑↓</kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd className="font-mono bg-white border rounded px-1">↵</kbd> to
              select
            </span>
          </div>
          <span>XenoCare Search</span>
        </div>
      </div>
    </div>
  );
}
