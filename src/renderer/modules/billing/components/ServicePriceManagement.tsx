// =============================================================================
// Service Price Management Component
// Comprehensive UI for managing all service prices (Consultation, Lab, Radiology, Pharmacy)
// Super Admin only access
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Search,
  Building2,
  TestTube,
  Scan,
  Pill,
  Shield,
  Edit2,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  History,
  Settings,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Plus,
  Stethoscope,
  Bed,
  CreditCard,
} from 'lucide-react';
import { Button, Input, Select } from '../../../components/ui/FormElements';
import {
  StatsCard,
  StatusBadge,
  EmptyState,
} from '../../../components/ui/DataDisplay';
import { Modal } from '../../../components/ui/Modal';
import {
  useServicePrices,
  useServicePriceStats,
  useUpdateServicePrice,
  useNhisConfig,
  useUpdateNhisConfig,
  usePriceAuditHistory,
  useCreateLabTest,
  useCreateRadiologyExam,
  useLabTestCategories,
  useSpecimenTypes,
  useImagingModalities,
} from '../hooks/useServicePricing';
import {
  ServiceCategory,
  ServicePriceItem,
  ConsultationFeeItem,
  CreateLabTestDTO,
  CreateRadiologyExamDTO,
} from '../api/service-pricing.api';
import { formatCurrency } from '../dtos/billing.dto';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import { isNhisFeatureEnabled } from '../../../config/features';

// Import new section components
import { ProcedurePricingSection } from './ProcedurePricingSection';
import { InsuranceTypePricingSection } from './InsuranceTypePricingSection';
import { BedPricingSection } from './BedPricingSection';
import { NhisRequiredServicesSection } from './NhisRequiredServicesSection';
import { NhisCoverageConfigSection } from './NhisCoverageConfigSection';

// =============================================================================
// Types
// =============================================================================

type ViewMode =
  | 'services'
  | 'procedures'
  | 'beds'
  | 'insurance'
  | 'nhis-required'
  | 'nhis-config'
  | 'audit';
type AddServiceType = 'lab' | 'radiology' | null;

interface EditingService {
  id: string;
  name: string;
  code: string;
  category: ServiceCategory;
  price: number;
  nhis_price: number;
  nhis_code: string;
  is_nhis_covered: boolean;
  nhis_percentage: number;
  requires_nhis_authorization: boolean;
}

interface NewLabTest {
  code: string;
  name: string;
  category: string;
  specimen_type: string;
  price: number;
  tat_minutes: number;
  nhis_code: string;
  nhis_price: number;
  is_nhis_covered: boolean;
  nhis_percentage: number;
  description: string;
}

interface NewRadiologyExam {
  code: string;
  name: string;
  modality:
    | 'X-Ray'
    | 'Ultrasound'
    | 'CT'
    | 'MRI'
    | 'Fluoroscopy'
    | 'Mammography';
  body_part: string;
  price: number;
  nhis_code: string;
  nhis_price: number;
  is_nhis_covered: boolean;
  nhis_percentage: number;
  description: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function ServicePriceManagement() {
  const { hasRole, staff } = useAuth();
  const { showToast } = useToast();

  // Access control - Super Admin only
  const isSuperAdmin = hasRole(['super_admin']);

  // State - ALL hooks must be called before any conditional returns
  const [viewMode, setViewMode] = useState<ViewMode>('services');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>(
    'all',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showNhisOnly, setShowNhisOnly] = useState(false);
  const [editingService, setEditingService] = useState<EditingService | null>(
    null,
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['lab', 'radiology', 'pharmacy']),
  );
  const [addServiceType, setAddServiceType] = useState<AddServiceType>(null);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('all');
  const [newLabTest, setNewLabTest] = useState<NewLabTest>({
    code: '',
    name: '',
    category: '',
    specimen_type: '',
    price: 0,
    tat_minutes: 60,
    nhis_code: '',
    nhis_price: 0,
    is_nhis_covered: true,
    nhis_percentage: 0,
    description: '',
  });
  const [newRadiologyExam, setNewRadiologyExam] = useState<NewRadiologyExam>({
    code: '',
    name: '',
    modality: 'X-Ray',
    body_part: '',
    price: 0,
    nhis_code: '',
    nhis_price: 0,
    is_nhis_covered: true,
    nhis_percentage: 0,
    description: '',
  });

  // Queries - must be called before conditional returns
  const {
    data: services = [],
    isLoading: loadingServices,
    refetch: refetchServices,
  } = useServicePrices({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    search: searchTerm || undefined,
    is_nhis_covered: showNhisOnly ? true : undefined,
  });
  const { data: stats } = useServicePriceStats();
  const { data: nhisConfig = [] } = useNhisConfig();
  const { data: auditHistory = [] } = usePriceAuditHistory({
    service_type:
      auditCategoryFilter !== 'all'
        ? (auditCategoryFilter as ServiceCategory)
        : undefined,
    limit: 100,
  });
  const { data: labCategories = [] } = useLabTestCategories();
  const { data: specimenTypes = [] } = useSpecimenTypes();
  const { data: imagingModalities = [] } = useImagingModalities();

  // Mutations - must be called before conditional returns
  const updateServicePrice = useUpdateServicePrice();
  const updateNhisConfig = useUpdateNhisConfig();
  const createLabTest = useCreateLabTest();
  const createRadiologyExam = useCreateRadiologyExam();

  // Filter services by category for grouped display
  const groupedServices = useMemo(() => {
    const groups: Record<string, ServicePriceItem[]> = {
      lab: [],
      radiology: [],
      pharmacy: [],
    };

    services.forEach((service) => {
      if (groups[service.category]) {
        groups[service.category].push(service);
      }
    });

    return groups;
  }, [services]);

  // Hard guard: block entire module for non-super_admin (AFTER all hooks)
  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="Access Restricted"
          description="Only Super Admin can view and manage service pricing."
        />
      </div>
    );
  }

  // Handlers
  const handleEditService = (service: ServicePriceItem) => {
    if (!isSuperAdmin) {
      showToast({ message: 'Only Super Admin can edit prices', type: 'error' });
      return;
    }
    setEditingService({
      id: service.id,
      name: service.name,
      code: service.code,
      category: service.category,
      price: service.price,
      nhis_price: service.nhis_price || service.price,
      nhis_code: service.nhis_code || '',
      is_nhis_covered: service.is_nhis_covered,
      nhis_percentage: service.nhis_percentage,
      requires_nhis_authorization:
        (service as any).requires_nhis_authorization || false,
    });
  };

  const handleSaveService = async () => {
    if (!editingService) return;

    try {
      await updateServicePrice.mutateAsync({
        category: editingService.category,
        serviceId: editingService.id,
        updates: {
          price: editingService.price,
          nhis_price: editingService.nhis_price,
          nhis_code: editingService.nhis_code || undefined,
          is_nhis_covered: editingService.is_nhis_covered,
          nhis_percentage: editingService.nhis_percentage,
          requires_nhis_authorization:
            editingService.requires_nhis_authorization,
          updated_by: (staff as any)?.id,
          reason: 'Price update via Service Management',
        },
      });

      showToast({
        message: 'Service price updated successfully',
        type: 'success',
      });
      setEditingService(null);
    } catch (error: any) {
      showToast({
        message: error.message || 'Failed to update price',
        type: 'error',
      });
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Create new lab test
  const handleCreateLabTest = async () => {
    if (
      !newLabTest.code ||
      !newLabTest.name ||
      !newLabTest.category ||
      !newLabTest.specimen_type
    ) {
      showToast({
        message: 'Please fill in all required fields',
        type: 'error',
      });
      return;
    }

    try {
      await createLabTest.mutateAsync({
        code: newLabTest.code,
        name: newLabTest.name,
        category: newLabTest.category,
        specimen_type: newLabTest.specimen_type,
        price: newLabTest.price,
        tat_minutes: newLabTest.tat_minutes,
        nhis_code: newLabTest.nhis_code || undefined,
        nhis_price: newLabTest.nhis_price || newLabTest.price,
        is_nhis_covered: newLabTest.is_nhis_covered,
        nhis_percentage: newLabTest.nhis_percentage,
        description: newLabTest.description || undefined,
      });

      showToast({ message: 'Lab test created successfully', type: 'success' });
      setAddServiceType(null);
      // Reset form
      setNewLabTest({
        code: '',
        name: '',
        category: '',
        specimen_type: '',
        price: 0,
        tat_minutes: 60,
        nhis_code: '',
        nhis_price: 0,
        is_nhis_covered: true,
        nhis_percentage: 0,
        description: '',
      });
    } catch (error: any) {
      showToast({
        message: error.message || 'Failed to create lab test',
        type: 'error',
      });
    }
  };

  // Create new radiology exam
  const handleCreateRadiologyExam = async () => {
    if (
      !newRadiologyExam.code ||
      !newRadiologyExam.name ||
      !newRadiologyExam.body_part
    ) {
      showToast({
        message: 'Please fill in all required fields',
        type: 'error',
      });
      return;
    }

    try {
      await createRadiologyExam.mutateAsync({
        code: newRadiologyExam.code,
        name: newRadiologyExam.name,
        modality: newRadiologyExam.modality,
        body_part: newRadiologyExam.body_part,
        price: newRadiologyExam.price,
        nhis_code: newRadiologyExam.nhis_code || undefined,
        nhis_price: newRadiologyExam.nhis_price || newRadiologyExam.price,
        is_nhis_covered: newRadiologyExam.is_nhis_covered,
        nhis_percentage: newRadiologyExam.nhis_percentage,
        description: newRadiologyExam.description || undefined,
      });

      showToast({
        message: 'Radiology exam created successfully',
        type: 'success',
      });
      setAddServiceType(null);
      // Reset form
      setNewRadiologyExam({
        code: '',
        name: '',
        modality: 'X-Ray',
        body_part: '',
        price: 0,
        nhis_code: '',
        nhis_price: 0,
        is_nhis_covered: true,
        nhis_percentage: 0,
        description: '',
      });
    } catch (error: any) {
      showToast({
        message: error.message || 'Failed to create radiology exam',
        type: 'error',
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lab':
        return <TestTube className="h-5 w-5" />;
      case 'radiology':
        return <Scan className="h-5 w-5" />;
      case 'pharmacy':
        return <Pill className="h-5 w-5" />;
      case 'consultation':
        return <Building2 className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'lab':
        return 'text-purple-600 bg-purple-100';
      case 'radiology':
        return 'text-blue-600 bg-blue-100';
      case 'pharmacy':
        return 'text-green-600 bg-green-100';
      case 'consultation':
        return 'text-amber-600 bg-amber-100';
      case 'procedure':
        return 'text-red-600 bg-red-100';
      case 'bed':
        return 'text-teal-600 bg-teal-100';
      case 'insurance_config':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Format audit values for display (prices as currency, booleans as Yes/No)
  const formatAuditValue = (fieldName: string, value: string) => {
    if (!value || value === 'undefined' || value === 'null') return 'N/A';

    // Boolean fields
    if (value === 'true') return 'Yes';
    if (value === 'false') return 'No';

    // Price/percentage fields - format as currency or percentage
    const priceFields = [
      'price',
      'nhis_price',
      'base_price',
      'professional_fee',
      'facility_fee',
      'daily_rate',
      'consultation_fee',
      'follow_up_fee',
      'emergency_fee',
      'nhis_consultation_fee',
      'nhis_follow_up_fee',
      'nhis_emergency_fee',
      'ward_price',
      'ward_nhis_price',
    ];
    const percentageFields = [
      'coverage_percentage',
      'nhis_percentage',
      'lab_coverage_percentage',
      'radiology_coverage_percentage',
      'pharmacy_coverage_percentage',
      'procedure_coverage_percentage',
      'bed_coverage_percentage',
    ];

    if (priceFields.some((f) => fieldName.includes(f))) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return `₦${numValue.toLocaleString()}`;
      }
    }

    if (percentageFields.some((f) => fieldName.includes(f))) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return `${numValue}%`;
      }
    }

    return value;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Service Price Management
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure pricing for all billable services and standard rates
          </p>
        </div>
        <button
          onClick={() => {
            refetchServices();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-100 bg-white p-3.5 transition-all hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <DollarSign className="h-4 w-4 text-blue-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-blue-700">{stats.total_services}</div>
                <div className="text-[11px] font-medium text-gray-400">Total Services</div>
              </div>
            </div>
          </div>
          {isNhisFeatureEnabled() && (
            <div className="rounded-xl border border-gray-100 bg-white p-3.5 transition-all hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                  <Shield className="h-4 w-4 text-green-700" />
                </div>
                <div>
                  <div className="text-xl font-bold text-green-700">
                    {stats.nhis_covered_count}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      ({stats.total_services > 0 ? ((stats.nhis_covered_count / stats.total_services) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-gray-400">NHIS Covered</div>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-xl border border-gray-100 bg-white p-3.5 transition-all hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-emerald-700">{stats.active_count}</div>
                <div className="text-[11px] font-medium text-gray-400">Active Services</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3.5 transition-all hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                <Settings className="h-4 w-4 text-purple-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-purple-700">4</div>
                <div className="text-[11px] font-medium text-gray-400">Service Categories</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100/80 w-fit overflow-x-auto">
        {[
          {
            id: 'services',
            label: 'Lab / Radiology / Pharmacy',
            icon: <TestTube className="h-3.5 w-3.5" />,
          },
          {
            id: 'procedures',
            label: 'Procedures',
            icon: <Stethoscope className="h-3.5 w-3.5" />,
          },
          {
            id: 'beds',
            label: 'Wards & Beds',
            icon: <Bed className="h-3.5 w-3.5" />,
          },
          {
            id: 'insurance',
            label: 'Insurance Pricing',
            icon: <CreditCard className="h-3.5 w-3.5" />,
          },
          {
            id: 'nhis-required',
            label: 'NHIS Pre-Auth',
            icon: <AlertTriangle className="h-3.5 w-3.5" />,
          },
          {
            id: 'nhis-config',
            label: 'NHIS Config',
            icon: <Shield className="h-3.5 w-3.5" />,
          },
          {
            id: 'audit',
            label: 'Audit History',
            icon: <History className="h-3.5 w-3.5" />,
          },
        ]
          .filter(
            (tab) =>
              isNhisFeatureEnabled() ||
              (tab.id !== 'nhis-required' &&
                tab.id !== 'nhis-config' &&
                tab.id !== 'insurance'),
          )
          .map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as ViewMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              viewMode === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Services View */}
      {viewMode === 'services' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-40"
            >
              <option value="all">All Categories</option>
              <option value="lab">Lab Tests</option>
              <option value="radiology">Radiology</option>
              <option value="pharmacy">Pharmacy</option>
            </Select>
            {isNhisFeatureEnabled() && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNhisOnly}
                  onChange={(e) => setShowNhisOnly(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-600">NHIS Covered Only</span>
              </label>
            )}

            {/* Add New Service Dropdown */}
            <div className="relative group">
              <Button variant="primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => setAddServiceType('lab')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                >
                  <TestTube className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">New Lab Test</span>
                </button>
                <button
                  onClick={() => setAddServiceType('radiology')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 rounded-b-lg border-t"
                >
                  <Scan className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">New Radiology Exam</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grouped Services */}
          {loadingServices ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
              <p className="text-gray-500 mt-2">Loading services...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedServices).map(
                ([category, categoryServices]) =>
                  categoryServices.length > 0 && (
                    <div
                      key={category}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className={`w-full flex items-center justify-between p-4 ${getCategoryColor(category)} bg-opacity-50 hover:bg-opacity-70 transition-colors`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${getCategoryColor(category)}`}
                          >
                            {getCategoryIcon(category)}
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-gray-900 capitalize">
                              {category} Services
                            </h3>
                            <p className="text-sm text-gray-500">
                              {categoryServices.length} services
                            </p>
                          </div>
                        </div>
                        {expandedCategories.has(category) ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>

                      {/* Services Table */}
                      {expandedCategories.has(category) && (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Code
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Service Name
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                  Regular Price
                                </th>
                                {isNhisFeatureEnabled() && (
                                  <>
                                    <th
                                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                                      title="Single source of truth for NHIS billing"
                                    >
                                      NHIS Price (₦){' '}
                                      <span className="text-green-600">*</span>
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                      NHIS Covered
                                    </th>
                                    <th
                                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                                      title="Override percentage (0 = use default)"
                                    >
                                      NHIS %
                                    </th>
                                  </>
                                )}
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {categoryServices.map((service) => (
                                <tr
                                  key={service.id}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-sm text-gray-600">
                                      {service.code}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {service.name}
                                      </p>
                                      {service.subcategory && (
                                        <p className="text-xs text-gray-500">
                                          {service.subcategory}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-semibold text-gray-900">
                                      {formatCurrency(service.price)}
                                    </span>
                                  </td>
                                  {isNhisFeatureEnabled() && (
                                    <>
                                      <td className="px-4 py-3 text-right">
                                        <span className="font-semibold text-green-600">
                                          {formatCurrency(service.nhis_price)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {service.is_nhis_covered ? (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Yes
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                            No
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {service.nhis_percentage > 0 ? (
                                          <span className="font-medium text-green-600">
                                            {service.nhis_percentage}%
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">
                                            Default
                                          </span>
                                        )}
                                      </td>
                                    </>
                                  )}
                                  <td className="px-4 py-3 text-center">
                                    <StatusBadge
                                      status={
                                        service.is_active
                                          ? 'Active'
                                          : 'Inactive'
                                      }
                                      variant={
                                        service.is_active ? 'success' : 'danger'
                                      }
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditService(service)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ),
              )}

              {services.length === 0 && (
                <EmptyState
                  icon={<DollarSign className="h-12 w-12" />}
                  title="No services found"
                  description="Try adjusting your search or filters"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Procedures View - NEW */}
      {viewMode === 'procedures' && <ProcedurePricingSection />}

      {/* Beds/Wards View - NEW */}
      {viewMode === 'beds' && <BedPricingSection />}

      {/* Insurance Type Pricing View */}
      {isNhisFeatureEnabled() && viewMode === 'insurance' && (
        <InsuranceTypePricingSection />
      )}

      {/* NHIS Pre-Authorization Required Services */}
      {isNhisFeatureEnabled() && viewMode === 'nhis-required' && (
        <NhisRequiredServicesSection />
      )}

      {/* NHIS Config View */}
      {isNhisFeatureEnabled() && viewMode === 'nhis-config' && (
        <NhisCoverageConfigSection />
      )}

      {/* Audit History View */}
      {viewMode === 'audit' && (
        <div className="space-y-4">
          {/* Audit Filter Bar */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Filter by Category:
              </span>
            </div>
            <select
              value={auditCategoryFilter}
              onChange={(e) => setAuditCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="lab">Laboratory</option>
              <option value="radiology">Radiology</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="procedure">Procedures</option>
              <option value="bed">Beds/Wards</option>
              <option value="consultation">Consultations</option>
              <option value="insurance_config">Insurance Config</option>
            </select>
            <div className="flex-1" />
            <div className="text-sm text-gray-500">
              Showing {auditHistory.length} changes
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Field Changed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Old Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    New Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Changed By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {auditHistory.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(entry.changed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getCategoryColor(entry.service_type)}`}
                        >
                          {entry.service_type === 'insurance_config'
                            ? 'Insurance'
                            : entry.service_type}
                        </span>
                        <span
                          className="font-medium text-gray-900 max-w-[200px] truncate"
                          title={entry.service_name}
                        >
                          {entry.service_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {entry.field_changed.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-600 font-mono">
                      {formatAuditValue(entry.field_changed, entry.old_value)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-600 font-mono font-medium">
                      {formatAuditValue(entry.field_changed, entry.new_value)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px]">
                      <span
                        className="truncate block"
                        title={entry.reason || 'N/A'}
                      >
                        {entry.reason || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                      {entry.changed_by_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {entry.changed_by_role || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {auditHistory.length === 0 && (
            <EmptyState
              icon={<History className="h-12 w-12" />}
              title="No audit history"
              description="Price changes will appear here"
            />
          )}
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <Modal
          isOpen
          onClose={() => setEditingService(null)}
          title="Edit Service Price"
          size="md"
        >
          <div className="space-y-4">
            {/* Service Info Header */}
            <div
              className={`p-4 rounded-lg border ${getCategoryColor(editingService.category)} bg-opacity-50`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${getCategoryColor(editingService.category)}`}
                >
                  {getCategoryIcon(editingService.category)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {editingService.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Code: {editingService.code} •{' '}
                    {editingService.category.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Regular Price Section */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Standard Price (Private Patients)
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regular Price (₦)
                </label>
                <Input
                  type="number"
                  value={editingService.price}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This price applies to Private/Uninsured patients
                </p>
              </div>
            </div>

            {isNhisFeatureEnabled() && (
              <>
            {/* NHIS Price Section */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-green-800 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  NHIS Pricing (Insurance Patients)
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingService.is_nhis_covered}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        is_nhis_covered: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-green-700 font-medium">
                    NHIS Covered
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    NHIS Price (₦) *
                  </label>
                  <Input
                    type="number"
                    value={editingService.nhis_price}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        nhis_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-lg font-semibold border-green-300 focus:border-green-500 focus:ring-green-500"
                  />
                  <p className="text-xs text-green-600 mt-1">
                    <strong>Single source of truth</strong> for NHIS billing.
                    This price is used for all NHIS patient billing.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    NHIS Pays (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingService.nhis_percentage}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        nhis_percentage: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0 = use default"
                    className="border-green-300 focus:border-green-500 focus:ring-green-500"
                  />
                  <p className="text-xs text-green-600 mt-1">
                    Override % (0 = use default: Military 100%, Civilian 90%)
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-green-700 mb-1">
                  NHIS Tariff Code
                </label>
                <Input
                  value={editingService.nhis_code}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      nhis_code: e.target.value,
                    })
                  }
                  placeholder="Official NHIS tariff code (optional)"
                  className="border-green-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              {/* Price Breakdown for NHIS */}
              {editingService.is_nhis_covered &&
                editingService.nhis_percentage > 0 && (
                  <div className="mt-4 p-3 bg-green-100 rounded-lg space-y-1">
                    <p className="text-sm font-medium text-green-800">
                      NHIS Price Breakdown:
                    </p>
                    <p className="text-sm text-green-700">
                      • NHIS Price:{' '}
                      <strong>₦{editingService.nhis_price.toFixed(2)}</strong>
                    </p>
                    <p className="text-sm text-green-700">
                      • NHIS Pays ({editingService.nhis_percentage}%):{' '}
                      <strong>
                        ₦
                        {(
                          (editingService.nhis_price *
                            editingService.nhis_percentage) /
                          100
                        ).toFixed(2)}
                      </strong>
                    </p>
                    <p className="text-sm text-green-700">
                      • Patient Pays ({100 - editingService.nhis_percentage}%):{' '}
                      <strong>
                        ₦
                        {(
                          (editingService.nhis_price *
                            (100 - editingService.nhis_percentage)) /
                          100
                        ).toFixed(2)}
                      </strong>
                    </p>
                  </div>
                )}
            </div>

            {/* NHIS Pre-Authorization Toggle */}
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingService.requires_nhis_authorization}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      requires_nhis_authorization: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <p className="font-medium text-amber-800">
                    Requires NHIS Pre-Authorization
                  </p>
                  <p className="text-sm text-amber-600">
                    If enabled, this service will require NHIS desk approval
                    before being performed for NHIS patients
                  </p>
                </div>
              </label>
            </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingService(null)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveService}
                disabled={updateServicePrice.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateServicePrice.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Lab Test Modal */}
      {addServiceType === 'lab' && (
        <Modal
          isOpen
          onClose={() => setAddServiceType(null)}
          title="Add New Lab Test"
        >
          <div className="space-y-4">
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 text-purple-700">
                <TestTube className="h-5 w-5" />
                <span className="font-medium">Lab Test Details</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newLabTest.code}
                  onChange={(e) =>
                    setNewLabTest({
                      ...newLabTest,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., FBC001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newLabTest.name}
                  onChange={(e) =>
                    setNewLabTest({ ...newLabTest, name: e.target.value })
                  }
                  placeholder="e.g., Full Blood Count"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select
                  value={newLabTest.category}
                  onChange={(e) =>
                    setNewLabTest({ ...newLabTest, category: e.target.value })
                  }
                >
                  <option value="">Select category...</option>
                  {labCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Hematology">Hematology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Serology">Serology</option>
                  <option value="Parasitology">Parasitology</option>
                  <option value="Urinalysis">Urinalysis</option>
                  <option value="Histopathology">Histopathology</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specimen Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={newLabTest.specimen_type}
                  onChange={(e) =>
                    setNewLabTest({
                      ...newLabTest,
                      specimen_type: e.target.value,
                    })
                  }
                >
                  <option value="">Select specimen...</option>
                  {specimenTypes.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                  <option value="Blood">Blood</option>
                  <option value="Urine">Urine</option>
                  <option value="Stool">Stool</option>
                  <option value="Sputum">Sputum</option>
                  <option value="Swab">Swab</option>
                  <option value="CSF">CSF</option>
                  <option value="Tissue">Tissue</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regular Price (₦) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={newLabTest.price}
                  onChange={(e) =>
                    setNewLabTest({
                      ...newLabTest,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TAT (minutes)
                </label>
                <Input
                  type="number"
                  value={newLabTest.tat_minutes}
                  onChange={(e) =>
                    setNewLabTest({
                      ...newLabTest,
                      tat_minutes: parseInt(e.target.value) || 60,
                    })
                  }
                  placeholder="60"
                />
              </div>
            </div>

            {/* NHIS Section */}
            {isNhisFeatureEnabled() && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-800">
                  NHIS Configuration
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newLabTest.is_nhis_covered}
                    onChange={(e) =>
                      setNewLabTest({
                        ...newLabTest,
                        is_nhis_covered: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-green-700">NHIS Covered</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-green-600 mb-1">
                    NHIS Code
                  </label>
                  <Input
                    value={newLabTest.nhis_code}
                    onChange={(e) =>
                      setNewLabTest({
                        ...newLabTest,
                        nhis_code: e.target.value,
                      })
                    }
                    placeholder="Optional"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-green-600 mb-1">
                    NHIS Price (₦)
                  </label>
                  <Input
                    type="number"
                    value={newLabTest.nhis_price}
                    onChange={(e) =>
                      setNewLabTest({
                        ...newLabTest,
                        nhis_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-green-600 mb-1">
                    NHIS Pays (%)
                  </label>
                  <Input
                    type="number"
                    value={newLabTest.nhis_percentage}
                    onChange={(e) =>
                      setNewLabTest({
                        ...newLabTest,
                        nhis_percentage: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="e.g., 50"
                    min="0"
                    max="100"
                    className="text-sm"
                  />
                  <p className="text-xs text-green-500 mt-0.5">
                    % NHIS covers (patient pays the rest)
                  </p>
                </div>
              </div>
            </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={newLabTest.description}
                onChange={(e) =>
                  setNewLabTest({ ...newLabTest, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Test description..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setAddServiceType(null)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleCreateLabTest}
                disabled={createLabTest.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {createLabTest.isPending ? 'Creating...' : 'Create Lab Test'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Radiology Exam Modal */}
      {addServiceType === 'radiology' && (
        <Modal
          isOpen
          onClose={() => setAddServiceType(null)}
          title="Add New Radiology Exam"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700">
                <Scan className="h-5 w-5" />
                <span className="font-medium">Radiology Exam Details</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newRadiologyExam.code}
                  onChange={(e) =>
                    setNewRadiologyExam({
                      ...newRadiologyExam,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., XR001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newRadiologyExam.name}
                  onChange={(e) =>
                    setNewRadiologyExam({
                      ...newRadiologyExam,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g., Chest X-Ray PA"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modality <span className="text-red-500">*</span>
                </label>
                <Select
                  value={newRadiologyExam.modality}
                  onChange={(e) =>
                    setNewRadiologyExam({
                      ...newRadiologyExam,
                      modality: e.target.value as any,
                    })
                  }
                >
                  {imagingModalities.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body Part <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newRadiologyExam.body_part}
                  onChange={(e) =>
                    setNewRadiologyExam({
                      ...newRadiologyExam,
                      body_part: e.target.value,
                    })
                  }
                  placeholder="e.g., Chest, Abdomen, Spine"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Regular Price (₦) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={newRadiologyExam.price}
                onChange={(e) =>
                  setNewRadiologyExam({
                    ...newRadiologyExam,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
              />
            </div>

            {/* NHIS Section */}
            {isNhisFeatureEnabled() && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-800">
                  NHIS Configuration
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRadiologyExam.is_nhis_covered}
                    onChange={(e) =>
                      setNewRadiologyExam({
                        ...newRadiologyExam,
                        is_nhis_covered: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-green-700">NHIS Covered</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-green-600 mb-1">
                    NHIS Code
                  </label>
                  <Input
                    value={newRadiologyExam.nhis_code}
                    onChange={(e) =>
                      setNewRadiologyExam({
                        ...newRadiologyExam,
                        nhis_code: e.target.value,
                      })
                    }
                    placeholder="Optional"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-green-600 mb-1">
                    NHIS Price (₦)
                  </label>
                  <Input
                    type="number"
                    value={newRadiologyExam.nhis_price}
                    onChange={(e) =>
                      setNewRadiologyExam({
                        ...newRadiologyExam,
                        nhis_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-green-600 mb-1">
                    NHIS Pays (%)
                  </label>
                  <Input
                    type="number"
                    value={newRadiologyExam.nhis_percentage}
                    onChange={(e) =>
                      setNewRadiologyExam({
                        ...newRadiologyExam,
                        nhis_percentage: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="e.g., 50"
                    min="0"
                    max="100"
                    className="text-sm"
                  />
                  <p className="text-xs text-green-500 mt-0.5">
                    % NHIS covers (patient pays the rest)
                  </p>
                </div>
              </div>
            </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={newRadiologyExam.description}
                onChange={(e) =>
                  setNewRadiologyExam({
                    ...newRadiologyExam,
                    description: e.target.value,
                  })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Exam description..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setAddServiceType(null)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleCreateRadiologyExam}
                disabled={createRadiologyExam.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {createRadiologyExam.isPending
                  ? 'Creating...'
                  : 'Create Radiology Exam'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
