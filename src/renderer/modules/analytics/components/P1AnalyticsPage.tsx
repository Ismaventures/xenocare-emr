// =============================================================================
// XENOCARE EMR - P1 Analytics Page
// Unified page for all P1 priority operational analytics dashboards
// =============================================================================

import React, { useState } from 'react';
import {
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Pill,
  FileX,
  LayoutDashboard,
} from 'lucide-react';

// P1 Dashboard Components
import NhisReconciliationDashboard from './NhisReconciliationDashboard';
import DoctorProductivityDashboard from './DoctorProductivityDashboard';
import LabTatDashboard from './LabTatDashboard';
import PharmacyCostDashboard from './PharmacyCostDashboard';
import MissingDocumentationDashboard from './MissingDocumentationDashboard';
import { isNhisFeatureEnabled } from '../../../config/features';

// =============================================================================
// Types
// =============================================================================

type P1Tab =
  | 'overview'
  | 'nhis'
  | 'doctor-productivity'
  | 'lab-tat'
  | 'pharmacy-cost'
  | 'missing-docs';

interface TabConfig {
  id: P1Tab;
  label: string;
  icon: React.ElementType;
  description: string;
}

// =============================================================================
// Tab Configuration
// =============================================================================

const tabs: TabConfig[] = [
  {
    id: 'nhis',
    label: 'NHIS Reconciliation',
    icon: ShieldCheck,
    description: 'Track NHIS claims, approvals, and reconciliation status',
  },
  {
    id: 'doctor-productivity',
    label: 'Doctor Productivity',
    icon: Stethoscope,
    description: 'Monitor physician performance and patient throughput',
  },
  {
    id: 'lab-tat',
    label: 'Lab TAT',
    icon: FlaskConical,
    description: 'Laboratory turnaround time tracking and analysis',
  },
  {
    id: 'pharmacy-cost',
    label: 'Pharmacy Cost',
    icon: Pill,
    description: 'Drug cost analysis, margins, and inventory metrics',
  },
  {
    id: 'missing-docs',
    label: 'Missing Documentation',
    icon: FileX,
    description: 'Track incomplete records and documentation compliance',
  },
];

// =============================================================================
// Main Component
// =============================================================================

const P1AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<P1Tab>(
    isNhisFeatureEnabled() ? 'nhis' : 'doctor-productivity',
  );
  const visibleTabs = tabs.filter(
    (tab) => isNhisFeatureEnabled() || tab.id !== 'nhis',
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'nhis':
        return <NhisReconciliationDashboard />;
      case 'doctor-productivity':
        return <DoctorProductivityDashboard />;
      case 'lab-tat':
        return <LabTatDashboard />;
      case 'pharmacy-cost':
        return <PharmacyCostDashboard />;
      case 'missing-docs':
        return <MissingDocumentationDashboard />;
      default:
        return <NhisReconciliationDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Operational Analytics
              </h1>
              <p className="text-sm text-gray-500">
                P1 Priority Dashboards - Productivity, TAT, Cost Analysis
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg
                    transition-colors whitespace-nowrap
                    ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }
                  `}
                  title={tab.description}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50">{renderContent()}</div>
    </div>
  );
};

export default P1AnalyticsPage;
