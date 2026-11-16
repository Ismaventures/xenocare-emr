// =============================================================================
// Insurance Type Pricing Section
// Manage pricing tiers for different insurance types (NHIS, GIFSHIP, DHML, etc.)
// =============================================================================

import React, { useState } from 'react';
import {
  Shield,
  Edit2,
  Save,
  X,
  RefreshCw,
  Percent,
  CheckCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Button, Input } from '../../../components/ui/FormElements';
import { Modal } from '../../../components/ui/Modal';
import {
  useInsuranceTypePricing,
  useUpdateInsuranceTypePricing,
} from '../hooks/useServicePricing';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';

// Insurance type display configuration
const INSURANCE_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  Military_NHIS: { label: 'Military NHIS', color: 'bg-blue-600', icon: '🎖️' },
  Civilian_NHIS: { label: 'Civilian NHIS', color: 'bg-green-600', icon: '🏥' },
  GIFSHIP: { label: 'GIFSHIP', color: 'bg-purple-600', icon: '🌟' },
  Security_Services_NHIS: {
    label: 'Security Services NHIS',
    color: 'bg-amber-600',
    icon: '🛡️',
  },
  Retainership: { label: 'Retainership', color: 'bg-teal-600', icon: '📋' },
  Private: { label: 'Private/Out of Pocket', color: 'bg-gray-600', icon: '💳' },
};

interface EditingInsurance {
  id: string;
  payment_category: string;
  coverage_percentage: number;
  consultation_fully_covered: boolean;
  lab_coverage_percentage: number;
  radiology_coverage_percentage: number;
  pharmacy_coverage_percentage: number;
  procedure_coverage_percentage: number;
  bed_coverage_percentage: number;
  description: string;
}

export function InsuranceTypePricingSection() {
  const { staff } = useAuth();
  const { showToast } = useToast();

  // State
  const [editingInsurance, setEditingInsurance] =
    useState<EditingInsurance | null>(null);

  // Queries
  const {
    data: insuranceConfigs = [],
    isLoading,
    refetch,
  } = useInsuranceTypePricing();

  // Mutations
  const updateInsurancePricing = useUpdateInsuranceTypePricing();

  const handleEditInsurance = (config: any) => {
    setEditingInsurance({
      id: config.id,
      payment_category: config.payment_category,
      coverage_percentage: config.coverage_percentage || 0,
      consultation_fully_covered: config.consultation_fully_covered ?? true,
      lab_coverage_percentage:
        config.lab_coverage_percentage || config.coverage_percentage || 0,
      radiology_coverage_percentage:
        config.radiology_coverage_percentage || config.coverage_percentage || 0,
      pharmacy_coverage_percentage:
        config.pharmacy_coverage_percentage || config.coverage_percentage || 0,
      procedure_coverage_percentage:
        config.procedure_coverage_percentage || config.coverage_percentage || 0,
      bed_coverage_percentage:
        config.bed_coverage_percentage || config.coverage_percentage || 0,
      description: config.description || '',
    });
  };

  const handleSaveInsurance = async () => {
    if (!editingInsurance) return;

    try {
      await updateInsurancePricing.mutateAsync({
        id: editingInsurance.id,
        updates: {
          coverage_percentage: editingInsurance.coverage_percentage,
          consultation_fully_covered:
            editingInsurance.consultation_fully_covered,
          lab_coverage_percentage: editingInsurance.lab_coverage_percentage,
          radiology_coverage_percentage:
            editingInsurance.radiology_coverage_percentage,
          pharmacy_coverage_percentage:
            editingInsurance.pharmacy_coverage_percentage,
          procedure_coverage_percentage:
            editingInsurance.procedure_coverage_percentage,
          bed_coverage_percentage: editingInsurance.bed_coverage_percentage,
          description: editingInsurance.description,
          updated_by: (staff as any)?.id,
        },
      });

      showToast({
        message: 'Insurance pricing updated successfully',
        type: 'success',
      });
      setEditingInsurance(null);
    } catch (error: any) {
      showToast({
        message: error.message || 'Failed to update insurance pricing',
        type: 'error',
      });
    }
  };

  const getInsuranceConfig = (category: string) => {
    return (
      INSURANCE_CONFIG[category] || {
        label: category,
        color: 'bg-gray-600',
        icon: '📄',
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">
              Insurance Coverage Configuration
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              Configure coverage percentages for each insurance type. These
              settings determine what percentage of service costs are covered by
              insurance vs paid by the patient. You can set different coverage
              rates for different service categories (Lab, Radiology, Pharmacy,
              Procedures, Beds).
            </p>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Insurance Cards */}
      {isLoading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          <p className="text-gray-500 mt-2">
            Loading insurance configurations...
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insuranceConfigs.map((config: any) => {
            const displayConfig = getInsuranceConfig(config.payment_category);

            return (
              <div
                key={config.id}
                className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className={`${displayConfig.color} text-white p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{displayConfig.icon}</span>
                      <h3 className="font-semibold">{displayConfig.label}</h3>
                    </div>
                    <span className="text-3xl font-bold">
                      {config.coverage_percentage}%
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {/* Consultation Coverage */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Consultation:</span>
                    {config.consultation_fully_covered ? (
                      <span className="inline-flex items-center text-green-600 font-medium">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        100% Covered
                      </span>
                    ) : (
                      <span className="text-gray-800">
                        {config.coverage_percentage}%
                      </span>
                    )}
                  </div>

                  {/* Other Service Categories */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Lab:</span>
                      <span className="font-medium">
                        {config.lab_coverage_percentage ||
                          config.coverage_percentage}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Radiology:</span>
                      <span className="font-medium">
                        {config.radiology_coverage_percentage ||
                          config.coverage_percentage}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pharmacy:</span>
                      <span className="font-medium">
                        {config.pharmacy_coverage_percentage ||
                          config.coverage_percentage}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Procedures:</span>
                      <span className="font-medium">
                        {config.procedure_coverage_percentage ||
                          config.coverage_percentage}
                        %
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {config.description && (
                    <p className="text-xs text-gray-500 border-t pt-2 mt-2">
                      {config.description}
                    </p>
                  )}

                  {/* Edit Button */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleEditInsurance(config)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Pricing
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {insuranceConfigs.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No insurance configurations found</p>
              <p className="text-sm">
                Insurance types will appear here once configured
              </p>
            </div>
          )}
        </div>
      )}

      {/* NHIS Copayment Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">
              Understanding NHIS Coverage
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              For NHIS patients, the coverage percentage determines the
              copayment split:
            </p>
            <ul className="text-sm text-amber-700 mt-2 space-y-1">
              <li>
                • <strong>100% coverage:</strong> NHIS pays full NHIS tariff
                price, patient pays nothing
              </li>
              <li>
                • <strong>50% coverage:</strong> NHIS pays 50%, patient pays 50%
                of NHIS tariff
              </li>
              <li>
                • <strong>0% coverage:</strong> Patient pays full NHIS tariff
                price
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Edit Insurance Modal */}
      {editingInsurance && (
        <Modal
          isOpen
          onClose={() => setEditingInsurance(null)}
          title="Edit Insurance Pricing"
          size="lg"
        >
          <div className="space-y-4">
            {/* Header */}
            <div
              className={`p-4 rounded-lg ${getInsuranceConfig(editingInsurance.payment_category).color} text-white`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {getInsuranceConfig(editingInsurance.payment_category).icon}
                </span>
                <div>
                  <h3 className="font-semibold text-lg">
                    {
                      getInsuranceConfig(editingInsurance.payment_category)
                        .label
                    }
                  </h3>
                  <p className="text-sm opacity-90">
                    Configure coverage percentages for this insurance type
                  </p>
                </div>
              </div>
            </div>

            {/* Default Coverage */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Coverage Percentage
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editingInsurance.coverage_percentage}
                  onChange={(e) =>
                    setEditingInsurance({
                      ...editingInsurance,
                      coverage_percentage: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-32 text-lg font-semibold text-center"
                />
                <Percent className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-500">
                  This is the default rate applied to all services unless
                  overridden below
                </span>
              </div>
            </div>

            {/* Consultation Toggle */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingInsurance.consultation_fully_covered}
                  onChange={(e) =>
                    setEditingInsurance({
                      ...editingInsurance,
                      consultation_fully_covered: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded border-green-400 text-green-600 focus:ring-green-500"
                />
                <div>
                  <p className="font-medium text-green-800">
                    Consultation 100% Covered
                  </p>
                  <p className="text-sm text-green-600">
                    When enabled, consultation fees are fully covered by
                    insurance (no copay)
                  </p>
                </div>
              </label>
            </div>

            {/* Category-Specific Coverage */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Service Category Coverage Rates
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Set different coverage rates for each service category. Leave at
                default to use the main coverage percentage.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Laboratory Tests (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingInsurance.lab_coverage_percentage}
                    onChange={(e) =>
                      setEditingInsurance({
                        ...editingInsurance,
                        lab_coverage_percentage: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Radiology/Imaging (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingInsurance.radiology_coverage_percentage}
                    onChange={(e) =>
                      setEditingInsurance({
                        ...editingInsurance,
                        radiology_coverage_percentage:
                          parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pharmacy/Medications (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingInsurance.pharmacy_coverage_percentage}
                    onChange={(e) =>
                      setEditingInsurance({
                        ...editingInsurance,
                        pharmacy_coverage_percentage:
                          parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Procedures (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingInsurance.procedure_coverage_percentage}
                    onChange={(e) =>
                      setEditingInsurance({
                        ...editingInsurance,
                        procedure_coverage_percentage:
                          parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bed/Accommodation (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingInsurance.bed_coverage_percentage}
                    onChange={(e) =>
                      setEditingInsurance({
                        ...editingInsurance,
                        bed_coverage_percentage: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description/Notes
              </label>
              <textarea
                value={editingInsurance.description}
                onChange={(e) =>
                  setEditingInsurance({
                    ...editingInsurance,
                    description: e.target.value,
                  })
                }
                rows={2}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="Additional notes about this insurance type..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingInsurance(null)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveInsurance}
                disabled={updateInsurancePricing.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateInsurancePricing.isPending
                  ? 'Saving...'
                  : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
