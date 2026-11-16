// =============================================================================
// NHIS Required Services Section
// Admin can search and select services that require NHIS pre-authorization
// =============================================================================

import React, { useState, useCallback } from 'react';
import {
  Shield,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
  Info,
  TestTube,
  Scan,
  Stethoscope,
  Pill,
  Zap,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Button, Input, Select } from '../../../components/ui/FormElements';
import { EmptyState } from '../../../components/ui/DataDisplay';
import { Modal } from '../../../components/ui/Modal';
import {
  useNhisRequiredServices,
  useSearchAllServices,
  useToggleNhisRequired,
  useServicesMissingNhisPreauth,
  useBulkEnableNhisPreauth,
  useSelectiveEnableNhisPreauth,
} from '../hooks/useServicePricing';
import { ServiceCategory } from '../api/service-pricing.api';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';

// Simple debounce implementation to avoid lodash dependency issues
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Category icons
const getCategoryIcon = (category: ServiceCategory) => {
  switch (category) {
    case 'lab':
      return <TestTube className="h-4 w-4" />;
    case 'radiology':
      return <Scan className="h-4 w-4" />;
    case 'pharmacy':
      return <Pill className="h-4 w-4" />;
    case 'procedure':
      return <Stethoscope className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
};

const getCategoryColor = (category: ServiceCategory) => {
  switch (category) {
    case 'lab':
      return 'bg-purple-100 text-purple-700';
    case 'radiology':
      return 'bg-blue-100 text-blue-700';
    case 'pharmacy':
      return 'bg-green-100 text-green-700';
    case 'procedure':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getCategoryLabel = (category: ServiceCategory) => {
  switch (category) {
    case 'lab':
      return 'Laboratory';
    case 'radiology':
      return 'Radiology';
    case 'pharmacy':
      return 'Pharmacy';
    case 'procedure':
      return 'Procedure';
    default:
      return 'Service';
  }
};

// Interface for selected services in multi-select mode
interface SelectedService {
  id: string;
  name: string;
  category: ServiceCategory;
  code: string;
}

export function NhisRequiredServicesSection() {
  const { staff } = useAuth();
  const { showToast } = useToast();

  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkEnableModal, setShowBulkEnableModal] = useState(false);
  const [showSelectiveEnableModal, setShowSelectiveEnableModal] =
    useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>(
    'all',
  );
  const [confirmRemove, setConfirmRemove] = useState<{
    id: string;
    name: string;
    category: ServiceCategory;
  } | null>(null);

  // Selective enable state
  const [selectiveSearchTerm, setSelectiveSearchTerm] = useState('');
  const [debouncedSelectiveSearch, setDebouncedSelectiveSearch] = useState('');
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    [],
  );
  const [selectiveCategoryFilter, setSelectiveCategoryFilter] = useState<
    ServiceCategory | 'all'
  >('all');

  // Queries
  const {
    data: requiredServices = [],
    isLoading,
    refetch,
  } = useNhisRequiredServices();
  const { data: searchResults = [], isLoading: searching } =
    useSearchAllServices(debouncedSearch);
  const { data: selectiveSearchResults = [], isLoading: selectiveSearching } =
    useSearchAllServices(debouncedSelectiveSearch);
  const { data: missingCounts, refetch: refetchMissing } =
    useServicesMissingNhisPreauth();

  // Mutations
  const toggleNhisRequired = useToggleNhisRequired();
  const bulkEnableNhis = useBulkEnableNhisPreauth();
  const selectiveEnableNhis = useSelectiveEnableNhisPreauth();

  // Debounced search
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearch(value);
    }, 300),
    [],
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSetSearch(value);
  };

  // Filter displayed required services
  const filteredServices =
    categoryFilter === 'all'
      ? requiredServices
      : requiredServices.filter(
          (s: any) => s.service_category === categoryFilter,
        );

  // Handle adding a service to NHIS required list
  const handleAddService = async (service: any) => {
    try {
      await toggleNhisRequired.mutateAsync({
        serviceId: service.id,
        category: service.category,
        required: true,
        updatedBy: (staff as any)?.id,
      });

      showToast({
        message: `${service.name} now requires NHIS pre-authorization`,
        type: 'success',
      });
      setShowAddModal(false);
      setSearchTerm('');
      setDebouncedSearch('');
    } catch (error: any) {
      showToast({
        message: error.message || 'Failed to add service',
        type: 'error',
      });
    }
  };

  // Handle removing a service from NHIS required list
  const handleRemoveService = async () => {
    if (!confirmRemove) return;

    try {
      await toggleNhisRequired.mutateAsync({
        serviceId: confirmRemove.id,
        category: confirmRemove.category,
        required: false,
        updatedBy: (staff as any)?.id,
      });

      showToast({
        message: `${confirmRemove.name} no longer requires NHIS pre-authorization`,
        type: 'success',
      });
      setConfirmRemove(null);
    } catch (error: any) {
      showToast({
        message: error.message || 'Failed to remove service',
        type: 'error',
      });
    }
  };

  // Handle bulk enabling NHIS pre-authorization for all services
  const handleBulkEnable = async () => {
    try {
      const result = await bulkEnableNhis.mutateAsync((staff as any)?.id);

      showToast({
        message: `Enabled NHIS pre-authorization for ${result.totalUpdated} services (${result.proceduresUpdated} procedures, ${result.labTestsUpdated} lab tests, ${result.radiologyUpdated} radiology, ${result.pharmacyUpdated} pharmacy)`,
        type: 'success',
      });
      setShowBulkEnableModal(false);
      refetch();
      refetchMissing();
    } catch (error: any) {
      showToast({
        message: error.message || 'Failed to bulk enable services',
        type: 'error',
      });
    }
  };

  // Filter search results to exclude already required services
  const availableServices = searchResults.filter(
    (s: any) => !requiredServices.some((r: any) => r.service_id === s.id),
  );

  return (
    <div className="space-y-4">
      {/* Missing Services Alert Banner */}
      {missingCounts && missingCounts.total > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">
                  {missingCounts.total} Services Missing NHIS Pre-Authorization
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  These services do not require NHIS desk approval. For complete
                  NHIS compliance, all services should require pre-authorization
                  for NHIS patients.
                </p>
                <div className="flex flex-wrap gap-3 mt-2 text-sm">
                  {missingCounts.procedures > 0 && (
                    <span className="inline-flex items-center gap-1 text-orange-700">
                      <Stethoscope className="h-3 w-3" />{' '}
                      {missingCounts.procedures} Procedures
                    </span>
                  )}
                  {missingCounts.labTests > 0 && (
                    <span className="inline-flex items-center gap-1 text-purple-700">
                      <TestTube className="h-3 w-3" /> {missingCounts.labTests}{' '}
                      Lab Tests
                    </span>
                  )}
                  {missingCounts.radiology > 0 && (
                    <span className="inline-flex items-center gap-1 text-blue-700">
                      <Scan className="h-3 w-3" /> {missingCounts.radiology}{' '}
                      Radiology
                    </span>
                  )}
                  {missingCounts.pharmacy > 0 && (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <Pill className="h-3 w-3" /> {missingCounts.pharmacy}{' '}
                      Pharmacy
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white shrink-0"
              onClick={() => setShowBulkEnableModal(true)}
            >
              <Zap className="h-4 w-4 mr-2" />
              Enable All
            </Button>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">
              NHIS Pre-Authorization Required Services
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              Services listed here require NHIS desk pre-authorization before
              they can be performed for NHIS patients. When a doctor orders any
              of these services for an NHIS patient, it will first go to the
              NHIS module for approval.
            </p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg">
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as any)}
          className="w-48"
        >
          <option value="all">All Categories</option>
          <option value="procedure">Procedures</option>
          <option value="lab">Laboratory</option>
          <option value="radiology">Radiology</option>
          <option value="pharmacy">Pharmacy</option>
        </Select>

        <div className="flex-1" />

        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Required</p>
          <p className="text-2xl font-bold text-amber-600">
            {requiredServices.length}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Procedures</p>
          <p className="text-2xl font-bold text-orange-600">
            {
              requiredServices.filter(
                (s: any) => s.service_category === 'procedure',
              ).length
            }
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Laboratory</p>
          <p className="text-2xl font-bold text-purple-600">
            {
              requiredServices.filter((s: any) => s.service_category === 'lab')
                .length
            }
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Radiology</p>
          <p className="text-2xl font-bold text-blue-600">
            {
              requiredServices.filter(
                (s: any) => s.service_category === 'radiology',
              ).length
            }
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Pharmacy</p>
          <p className="text-2xl font-bold text-green-600">
            {
              requiredServices.filter(
                (s: any) => s.service_category === 'pharmacy',
              ).length
            }
          </p>
        </div>
      </div>

      {/* Required Services List */}
      {isLoading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          <p className="text-gray-500 mt-2">Loading services...</p>
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Service Name
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Auth Type
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredServices.map((service: any) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(service.service_category)}`}
                    >
                      {getCategoryIcon(service.service_category)}
                      {getCategoryLabel(service.service_category)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-gray-600">
                      {service.service_code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {service.service_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Pre-Authorization
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() =>
                        setConfirmRemove({
                          id: service.service_id,
                          name: service.service_name,
                          category: service.service_category,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<Shield className="h-12 w-12" />}
          title="No services require NHIS pre-authorization"
          description="Click 'Add Service' to mark services that need NHIS approval before being performed"
        />
      )}

      {/* Add Service Modal */}
      {showAddModal && (
        <Modal
          isOpen
          onClose={() => {
            setShowAddModal(false);
            setSearchTerm('');
            setDebouncedSearch('');
          }}
          title="Add NHIS Pre-Authorization Requirement"
          size="lg"
        >
          <div className="space-y-4">
            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Search for services to mark as requiring NHIS
                  pre-authorization. These services will need approval from the
                  NHIS desk before being performed for NHIS patients.
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by service name or code..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {searching ? (
                <div className="p-8 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Searching...</p>
                </div>
              ) : debouncedSearch.length < 2 ? (
                <div className="p-8 text-center text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    Type at least 2 characters to search
                  </p>
                </div>
              ) : availableServices.length > 0 ? (
                <div className="divide-y">
                  {availableServices.map((service: any) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`p-2 rounded-lg ${getCategoryColor(service.category)}`}
                        >
                          {getCategoryIcon(service.category)}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {service.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="font-mono">{service.code}</span>
                            <span>•</span>
                            <span>{getCategoryLabel(service.category)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddService(service)}
                        disabled={toggleNhisRequired.isPending}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">
                    All matching services already require NHIS authorization
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    No services found matching "{debouncedSearch}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setSearchTerm('');
                  setDebouncedSearch('');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Remove Modal */}
      {confirmRemove && (
        <Modal
          isOpen
          onClose={() => setConfirmRemove(null)}
          title="Remove NHIS Pre-Authorization Requirement"
          size="sm"
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">
                    Remove pre-authorization requirement?
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    <strong>{confirmRemove.name}</strong> will no longer require
                    NHIS desk approval before being performed for NHIS patients.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmRemove(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleRemoveService}
                disabled={toggleNhisRequired.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {toggleNhisRequired.isPending
                  ? 'Removing...'
                  : 'Remove Requirement'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Enable Confirmation Modal */}
      {showBulkEnableModal && (
        <Modal
          isOpen
          onClose={() => setShowBulkEnableModal(false)}
          title="Enable NHIS Pre-Authorization for All Services"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">
                    Enable NHIS pre-authorization for all services?
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    This will mark <strong>all</strong> procedures, lab tests,
                    radiology exams, and medications as requiring NHIS desk
                    approval before being performed for NHIS patients.
                  </p>
                </div>
              </div>
            </div>

            {missingCounts && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Services to be updated:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded bg-orange-100">
                      <Stethoscope className="h-4 w-4 text-orange-600" />
                    </span>
                    <span className="text-gray-600">
                      {missingCounts.procedures} Procedures
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded bg-purple-100">
                      <TestTube className="h-4 w-4 text-purple-600" />
                    </span>
                    <span className="text-gray-600">
                      {missingCounts.labTests} Lab Tests
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded bg-blue-100">
                      <Scan className="h-4 w-4 text-blue-600" />
                    </span>
                    <span className="text-gray-600">
                      {missingCounts.radiology} Radiology
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded bg-green-100">
                      <Pill className="h-4 w-4 text-green-600" />
                    </span>
                    <span className="text-gray-600">
                      {missingCounts.pharmacy} Pharmacy
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t mt-2">
                  <p className="text-sm font-semibold text-gray-800">
                    Total: {missingCounts.total} services
                  </p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-700">
                  After enabling, when doctors order these services for NHIS
                  patients, the orders will be routed to the NHIS Specialty
                  Referral Approvals queue for verification before they can be
                  performed.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkEnableModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleBulkEnable}
                disabled={bulkEnableNhis.isPending}
              >
                <Zap className="h-4 w-4 mr-2" />
                {bulkEnableNhis.isPending
                  ? 'Enabling...'
                  : `Enable All ${missingCounts?.total || 0} Services`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
