/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - ENCOUNTER QUICK ACTIONS
 *
 * Context-aware action bar that appears when viewing encounter records.
 * Provides quick access to common clinical actions like adding orders and notes.
 *
 * Modern redesign with:
 * - Floating action bar with glassmorphism effect
 * - Expandable full-width action panel
 * - All actions visible on expand
 * - Beautiful animations and hover effects
 * =============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Plus,
  FlaskConical,
  Scan,
  Pill,
  Syringe,
  FileText,
  ChevronUp,
  AlertCircle,
  Clock,
  Edit3,
  X,
  Zap,
  Sparkles,
  BedDouble,
  ClipboardList,
  Receipt,
  Printer,
  Activity,
  Stethoscope,
  Heart,
  Download,
} from 'lucide-react';
import { Button } from '../../../../components/ui/FormElements';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  checkEncounterContinuation,
  EncounterContinuationContext,
  formatContinuationMessage,
  isActionAllowed,
} from '../../../../lib/encounter/continuation';
import { QuickOrderModal, OrderType } from './QuickOrderModal';
import { ClinicalNotesModal, NoteType } from './ClinicalNotesModal';

// =============================================================================
// Types
// =============================================================================

interface EncounterQuickActionsProps {
  encounterId: string;
  encounterNumber: string;
  visitId: string;
  patientId: string;
  patientName: string;
  encounterStatus: string;
  encounterDate: string;
  encounterType: 'OPD' | 'In-Patient' | 'Emergency';
  currentStage: string;
  onOrdersCreated?: () => void;
  onExportClick?: () => void;
  hasActiveAdmission?: boolean;
}

interface QuickActionButton {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  hoverColor: string;
  borderColor: string;
  category: 'orders' | 'notes' | 'actions';
}

const ALL_QUICK_ACTIONS: QuickActionButton[] = [
  // Consolidated Orders Button
  {
    id: 'add_order',
    label: 'Add Order',
    description: 'Labs, Imaging, Meds & Procedures',
    icon: <Plus size={24} />,
    color: 'text-white',
    bgColor: 'bg-primary-700',
    hoverColor: 'hover:bg-primary-800 hover:shadow-emerald-200',
    borderColor: 'border-primary-700',
    category: 'orders',
  },
  // Notes
  {
    id: 'note',
    label: 'Add Note',
    description: 'Add consultation/progress notes',
    icon: <FileText size={20} />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    hoverColor: 'hover:bg-indigo-100 hover:shadow-indigo-100',
    borderColor: 'border-indigo-200',
    category: 'notes',
  },
];

// Map order types to continuation action types
const ORDER_TYPE_TO_ACTION: Record<string, string> = {
  lab: 'add_lab_orders',
  radiology: 'add_radiology_orders',
  pharmacy: 'add_prescriptions',
  procedure: 'add_procedures',
  note: 'add_notes',
};

// =============================================================================
// Main Component - Modern Floating Action Bar
// =============================================================================

export function EncounterQuickActions({
  encounterId,
  encounterNumber,
  visitId,
  patientId,
  patientName,
  encounterStatus,
  encounterDate,
  encounterType,
  currentStage,
  onOrdersCreated,
  onExportClick,
  hasActiveAdmission,
}: EncounterQuickActionsProps) {
  const { staff } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [initialOrderTab, setInitialOrderTab] = useState<OrderType>('lab');

  // Build encounter context for continuation check
  const encounterContext: EncounterContinuationContext = useMemo(
    () => ({
      encounterId,
      patientId,
      currentStage: currentStage as any,
      status: encounterStatus,
      createdAt: encounterDate,
      encounterType,
      hasUnresolvedResults: false,
      consultationCount: 1,
      hasActiveAdmission,
    }),
    [
      encounterId,
      patientId,
      currentStage,
      encounterStatus,
      encounterDate,
      encounterType,
      hasActiveAdmission,
    ],
  );

  // Check if orders can be added
  const continuationEligibility = useMemo(() => {
    return checkEncounterContinuation(encounterContext);
  }, [encounterContext]);

  // Get available actions (filter by continuation rules)
  const availableActions = useMemo(() => {
    return ALL_QUICK_ACTIONS.filter((action) => {
      if (action.id === 'note') return true; // Notes always available
      const actionKey = ORDER_TYPE_TO_ACTION[action.id];
      return actionKey
        ? isActionAllowed(continuationEligibility, actionKey as any)
        : true;
    });
  }, [continuationEligibility]);

  // Handle opening order modal with specific tab
  const handleActionClick = (actionId: string) => {
    if (actionId === 'note') {
      setShowNotesModal(true);
    } else if (actionId === 'add_order') {
      setInitialOrderTab('lab');
      setShowOrderModal(true);
    } else {
      setInitialOrderTab(actionId as OrderType);
      setShowOrderModal(true);
    }
    setIsExpanded(false);
  };

  // Handle orders created
  const handleOrdersCreated = () => {
    setShowOrderModal(false);
    onOrdersCreated?.();
  };

  // Don't render if no actions available or encounter is closed
  if (!continuationEligibility.canContinue || availableActions.length === 0) {
    return null;
  }

  // Only doctors and certain roles can add orders
  const canAddOrders = [
    'doctor',
    'medical_director',
    'super_admin',
    'admin',
  ].includes(staff?.role || '');
  if (!canAddOrders) {
    return null;
  }

  // Get primary actions for compact view (first 4)
  const primaryActions = availableActions.slice(0, 4);

  return (
    <>
      {/* Expanded Full-Width Panel Overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Standard Flow Quick Actions (Non-Floating) */}
      <div
        className={`relative border-b border-slate-200 transition-all duration-300 ${
          isExpanded ? 'bg-white shadow-lg' : ''
        }`}
      >
        {/* Warning Banner (if applicable) */}
        {continuationEligibility.warningLevel !== 'none' && isExpanded && (
          <div
            className={`px-6 py-3 flex items-center gap-3 border-b ${
              continuationEligibility.warningLevel === 'warning'
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
            }`}
          >
            {continuationEligibility.warningLevel === 'warning' ? (
              <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
            ) : (
              <Clock size={18} className="text-blue-500 flex-shrink-0" />
            )}
            <p
              className={`text-sm font-medium ${
                continuationEligibility.warningLevel === 'warning'
                  ? 'text-amber-700'
                  : 'text-blue-700'
              }`}
            >
              {continuationEligibility.reason}
            </p>
          </div>
        )}

        {/* Expanded Actions Grid */}
        {isExpanded && (
          <div className="px-6 py-6 bg-gradient-to-br from-slate-50 via-white to-gray-50">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-primary-700 to-emerald-600 rounded-xl shadow-lg">
                    <Zap size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Quick Actions
                    </h3>
                    <p className="text-sm text-gray-500">
                      Select an action for encounter {encounterNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {availableActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action.id)}
                    className={`group relative flex flex-col items-center p-5 rounded-xl border-2 ${action.borderColor} ${action.bgColor} ${action.hoverColor} transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
                  >
                    <div
                      className={`p-3 rounded-xl ${action.bgColor} ${action.color} mb-3 group-hover:scale-110 transition-transform`}
                    >
                      {action.icon}
                    </div>
                    <span className={`text-sm font-semibold ${action.color}`}>
                      {action.label}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 text-center leading-tight">
                      {action.description}
                    </span>

                    {/* Hover indicator */}
                    <div
                      className={`absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-current ${action.color} opacity-0 group-hover:opacity-20 transition-opacity`}
                    />
                  </button>
                ))}
              </div>

              {/* Quick Tips */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Sparkles size={14} />
                <span>
                  Tip: Use keyboard shortcuts for faster access. Press{' '}
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">
                    Esc
                  </kbd>{' '}
                  to close.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Compact Action Bar */}
        <div
          className={`bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg ${isExpanded ? 'hidden' : ''}`}
        >
          <div className="px-6 py-3">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              {/* Left: Encounter Info */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    encounterStatus === 'Active'
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm font-medium text-gray-600">
                  Encounter{' '}
                  <span className="text-gray-900 font-semibold">
                    {encounterNumber}
                  </span>
                </span>
                {continuationEligibility.warningLevel === 'warning' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    <AlertCircle size={12} />
                    Limited
                  </span>
                )}
              </div>

              {/* Center: Primary Quick Actions */}
              <div className="flex items-center gap-2">
                {primaryActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${action.bgColor} ${action.color} ${action.hoverColor} border ${action.borderColor} hover:shadow-md`}
                    title={action.description}
                  >
                    {action.icon}
                    <span className="hidden lg:inline text-sm">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Right: Expand & Full Modal Button */}
              <div className="flex items-center gap-3">
                {/* Export PDF Button */}
                {onExportClick && (
                  <button
                    onClick={onExportClick}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white text-sm font-medium rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all shadow-md hover:shadow-lg"
                    title="Export Patient Records"
                  >
                    <Download size={16} />
                    <span className="hidden lg:inline">Export PDF</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <QuickOrderModal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          encounterId={encounterId}
          encounterNumber={encounterNumber}
          patientId={patientId}
          patientName={patientName}
          encounterContext={encounterContext}
          onOrdersCreated={handleOrdersCreated}
          initialTab={initialOrderTab}
        />
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <ClinicalNotesModal
          isOpen={showNotesModal}
          onClose={() => setShowNotesModal(false)}
          encounterId={encounterId}
          encounterNumber={encounterNumber}
          visitId={visitId}
          patientId={patientId}
          patientName={patientName}
          encounterContext={encounterContext}
          onNoteAdded={() => {
            setShowNotesModal(false);
            onOrdersCreated?.();
          }}
        />
      )}
    </>
  );
}

// =============================================================================
// Compact Quick Add Button (for use in headers/toolbars)
// =============================================================================

interface QuickAddOrderButtonProps {
  encounterId: string;
  encounterNumber: string;
  patientId: string;
  patientName: string;
  encounterStatus: string;
  encounterDate: string;
  encounterType: 'OPD' | 'In-Patient' | 'Emergency';
  currentStage: string;
  onOrdersCreated?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  hasActiveAdmission?: boolean;
}

export function QuickAddOrderButton({
  encounterId,
  encounterNumber,
  patientId,
  patientName,
  encounterStatus,
  encounterDate,
  encounterType,
  currentStage,
  onOrdersCreated,
  variant = 'primary',
  size = 'md',
  hasActiveAdmission,
}: QuickAddOrderButtonProps) {
  const { staff } = useAuth();
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Build encounter context
  const encounterContext: EncounterContinuationContext = useMemo(
    () => ({
      encounterId,
      patientId,
      currentStage: currentStage as any,
      status: encounterStatus,
      createdAt: encounterDate,
      encounterType,
      hasUnresolvedResults: false,
      consultationCount: 1,
      hasActiveAdmission,
    }),
    [
      encounterId,
      patientId,
      currentStage,
      encounterStatus,
      encounterDate,
      encounterType,
      hasActiveAdmission,
    ],
  );

  // Check continuation
  const continuationEligibility = useMemo(() => {
    return checkEncounterContinuation(encounterContext);
  }, [encounterContext]);

  // Only doctors can add orders
  const canAddOrders = [
    'doctor',
    'medical_director',
    'super_admin',
    'admin',
  ].includes(staff?.role || '');

  if (!canAddOrders || !continuationEligibility.canContinue) {
    return null;
  }

  // Modern button styling based on variant
  const buttonStyles = {
    primary:
      'bg-gradient-to-r from-primary-700 to-emerald-600 text-white hover:from-primary-800 hover:to-emerald-700 shadow-md hover:shadow-lg',
    outline:
      'border-2 border-primary-700 text-primary-700 hover:bg-primary-700 hover:text-white',
    ghost: 'text-primary-700 hover:bg-green-50',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <>
      <button
        onClick={() => setShowOrderModal(true)}
        className={`flex items-center gap-2 rounded-xl font-semibold transition-all duration-200 ${buttonStyles[variant]} ${sizeStyles[size]}`}
      >
        <Plus size={size === 'sm' ? 16 : 18} />
        <span>Add Order</span>
      </button>

      {showOrderModal && (
        <QuickOrderModal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          encounterId={encounterId}
          encounterNumber={encounterNumber}
          patientId={patientId}
          patientName={patientName}
          encounterContext={encounterContext}
          onOrdersCreated={() => {
            setShowOrderModal(false);
            onOrdersCreated?.();
          }}
        />
      )}
    </>
  );
}

export default EncounterQuickActions;
