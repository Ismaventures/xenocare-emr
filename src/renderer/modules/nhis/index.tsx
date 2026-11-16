// =============================================================================
// NHIS Module Main Entry Point
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  CheckCircle2,
  Clock,
  Send,
  History,
  FileText,
  MapPin,
  Users,
  Stethoscope,
  Settings,
  ChevronDown,
} from 'lucide-react';
import {
  NhisDashboard,
  NhisVerificationPanel,
  NhisApprovalsList,
  NhisClaimsList,
  NhisPostingsList,
  NhisProfilesList,
  NhisSpecialtyApprovalQueue,
  NhisProvisionalVerificationQueue,
  NhisOutgoingReferralQueue,
  NhisPreAuthConfig,
} from './components';

// Hooks for specialty referrals
import {
  usePendingSpecialtyReferrals,
  useApproveSpecialtyReferral,
  useRejectSpecialtyReferral,
  useAllProvisionalApprovals,
} from './hooks';
import { useAuth } from '../../contexts/AuthContext';
import { Tabs } from '../../components/ui/DataDisplay';

// Guidance
import { InlineGuidance } from '../../components/guidance/InlineGuidance';

// Import NHIS Logo
const nhisLogo = require('../../../../assets/National-Health-Insurance-Authority-511x340.jpg');

type TabId =
  | 'dashboard'
  | 'verification'
  | 'specialty'
  | 'outgoing-referrals'
  | 'provisional'
  | 'approvals'
  | 'claims'
  | 'postings'
  | 'profiles'
  | 'preauth-config';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: number;
  subItems?: SubTab[];
  isOpen?: boolean;
}

interface SubTab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export function NhisModule() {
  const location = useLocation();
  const { user, staff } = useAuth(); // Destructure staff
  const [activeTab, setActiveTab] = useState<TabId>(
    location.state?.activeTab || 'dashboard',
  );
  const [verificationPatientId, setVerificationPatientId] = useState<
    string | undefined
  >();
  const [verificationEncounterId, setVerificationEncounterId] = useState<
    string | undefined
  >();

  // Specialty referrals hooks
  const {
    data: pendingSpecialtyReferrals,
    isLoading: isLoadingReferrals,
    refetch: refetchReferrals,
  } = usePendingSpecialtyReferrals();
  const approveReferralMutation = useApproveSpecialtyReferral();
  const rejectReferralMutation = useRejectSpecialtyReferral();

  // Provisional approvals hook
  const { data: provisionalApprovals = [] } = useAllProvisionalApprovals();

  // Define tab mappings for content
  const TABS: Tab[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Module statistics and KPIs',
    },
    {
      id: 'verification',
      label: 'Verification', // Parent item
      icon: Shield,
      description: 'Manage eligibility',
      // We will render these as flat items in the sidebar for now per request,
      // or as a group. The user asked for "sections under verification they should also be on the sidebar"
    },
    {
      id: 'specialty',
      label: 'Specialty Referrals',
      icon: Stethoscope,
      description: 'Specialty referrals',
      badge: pendingSpecialtyReferrals?.length,
    },
    {
      id: 'outgoing-referrals',
      label: 'Outgoing Referrals',
      icon: Send,
      description: 'Referrals to other facilities',
    },
    {
      id: 'approvals',
      label: 'Service Approvals',
      icon: History,
      description: 'Process service approval requests',
    },
    {
      id: 'provisional',
      label: 'Provisional Queue',
      icon: Clock,
      description: 'Authorization code verification',
      badge:
        provisionalApprovals.length > 0
          ? provisionalApprovals.length
          : undefined,
    },
    {
      id: 'claims',
      label: 'Claims',
      icon: FileText,
      description: 'HMO claims submission',
    },
    {
      id: 'profiles',
      label: 'Profiles',
      icon: Users,
      description: 'Patient NHIS profiles',
    },
    {
      id: 'preauth-config',
      label: 'Pre-Auth Config',
      icon: Settings,
      description: 'Configure services requiring NHIS pre-authorization',
    },
  ];

  // Grouping logic for sidebar - REMOVED per user request to use top bar
  // const SIDEBAR_GROUPS = [ ... ];

  // React to router state changes (deep linking)
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    // Clear any patient prefill - NHIS admin should select from queue
    setVerificationPatientId(undefined);
  }, [location.state]);

  // Navigate to verification with pre-filled patient (for internal use)
  const handleVerifyPatient = (patientId: string, encounterId?: string) => {
    setVerificationPatientId(patientId);
    setVerificationEncounterId(encounterId);
    setActiveTab('verification');
  };

  // Handle specialty referral approval
  const handleApproveSpecialtyReferral = async (
    item: any,
    isProvisional: boolean,
    notes?: string,
    authorizationCode?: string,
  ) => {
    await approveReferralMutation.mutateAsync({
      referralId: item.id,
      approvedBy: user?.id || '',
      isProvisional,
      notes,
      authorizationCode,
    });
  };

  // Handle specialty referral rejection
  const handleRejectSpecialtyReferral = async (item: any, reason: string) => {
    await rejectReferralMutation.mutateAsync({
      referralId: item.id,
      rejectedBy: user?.id || '',
      reason,
    });
  };

  // Split tabs: primary tabs shown directly, extras under "More" dropdown
  const MORE_TAB_IDS: TabId[] = ['claims', 'profiles', 'preauth-config'];
  const PRIMARY_TABS = TABS.filter((t) => !MORE_TAB_IDS.includes(t.id));
  const MORE_TABS = TABS.filter((t) => MORE_TAB_IDS.includes(t.id));
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "More" dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isMoreTabActive = MORE_TAB_IDS.includes(activeTab);
  const activeMoreTab = MORE_TABS.find((t) => t.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="h-full min-h-0 overflow-y-auto p-4">
            <InlineGuidance
              module="nhis"
              title="NHIS Dashboard Overview"
              message="This dashboard provides a summary of all NHIS activities today. You can see the number of active verifications, pending approvals, and claim statuses at a glance."
            />
            <div className="mt-4">
              <NhisDashboard />
            </div>
          </div>
        );
      case 'verification':
        return (
          <div className="h-full min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50 p-4">
              <NhisVerificationPanel
                patientId={verificationPatientId || ''}
                encounterId={verificationEncounterId || ''}
                onVerificationComplete={() => {
                  setVerificationPatientId(undefined);
                  setVerificationEncounterId(undefined);
                  setActiveTab('dashboard');
                }}
              />
            </div>
          </div>
        );
      case 'specialty':
        return (
          <div className="h-full min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-900">
                Specialty Referrals
              </h2>
              <p className="text-sm text-gray-500">
                Manage specialist clinic NHIS internal referrals
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50 p-4">
              <NhisSpecialtyApprovalQueue
                items={pendingSpecialtyReferrals || []}
                isLoading={isLoadingReferrals}
                onRefresh={() => refetchReferrals()}
                onApprove={handleApproveSpecialtyReferral}
                onReject={handleRejectSpecialtyReferral}
              />
            </div>
          </div>
        );
      case 'outgoing-referrals':
        return (
          <div className="h-full min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-900">
                Outgoing Referrals
              </h2>
              <p className="text-sm text-gray-500">
                Manage external NHIS referral requests
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50 p-4">
              <NhisOutgoingReferralQueue showHeader={false} />
            </div>
          </div>
        );
      case 'approvals':
        return (
          <div className="h-full min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <NhisApprovalsList />
            </div>
          </div>
        );
      case 'provisional':
        return (
          <div className="h-full min-h-0 overflow-y-auto p-4">
            <NhisProvisionalVerificationQueue />
          </div>
        );
      case 'claims':
        return (
          <div className="h-full min-h-0 overflow-y-auto p-4">
            <InlineGuidance
              module="nhis"
              title="Claims Submission"
              message="Review verified encounters and submit claims to the respective HMOs. Ensure all services and drugs are correctly coded with their prices before submission."
            />
            <div className="mt-4">
              <NhisClaimsList />
            </div>
          </div>
        );
      case 'postings':
        return (
          <div className="h-full min-h-0 overflow-y-auto p-4">
            <NhisPostingsList />
          </div>
        );
      case 'profiles':
        return (
          <div className="h-full min-h-0 overflow-y-auto p-4">
            <NhisProfilesList />
          </div>
        );
      case 'preauth-config':
        return (
          <div className="h-full min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-900">
                Pre-Authorization Configuration
              </h2>
              <p className="text-sm text-gray-500">
                Mark services that require NHIS desk approval before being
                performed
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50 p-4">
              <NhisPreAuthConfig />
            </div>
          </div>
        );
      default:
        return <NhisDashboard />;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50 overflow-hidden">
      {/* ── Top Header & Branding ── */}
      <div className="shrink-0 bg-gradient-to-r from-primary-700 via-primary-700 to-emerald-600 sticky top-0 z-20 shadow-md">
        <div className="px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl overflow-hidden shadow-lg border-2 border-white/20 flex-shrink-0 bg-white/10 p-0.5">
                <img
                  src={nhisLogo}
                  alt="NHIS"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight">
                  NHIS Portal
                </h1>
                <p className="text-[11px] text-white/60 font-medium">
                  National Health Insurance Scheme Management
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 sticky top-[62px] z-10">
        <div className="flex items-center px-4">
          {/* Scrollable primary tabs */}
          <div className="flex-1 overflow-x-auto scrollbar-none">
            <nav
              className="flex flex-nowrap gap-x-1 py-1 items-center"
              aria-label="Tabs"
            >
              {PRIMARY_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group relative flex items-center gap-2 py-2.5 px-3.5 rounded-lg font-medium text-sm transition-all duration-150 whitespace-nowrap
                      ${
                        isActive
                          ? 'bg-primary-700/10 text-primary-700'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary-700 rounded-full" />
                    )}
                    <Icon
                      size={16}
                      className={`flex-shrink-0 ${isActive ? 'text-primary-700' : 'text-gray-400 group-hover:text-gray-500'}`}
                    />
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        className={`ml-0.5 min-w-[20px] text-center px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                          isActive
                            ? 'bg-primary-700 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* "More" dropdown */}
          <div className="relative flex-shrink-0 ml-2 py-1" ref={moreRef}>
            <button
              onClick={() => setMoreOpen((prev) => !prev)}
              className={`
                flex items-center gap-2 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap border
                ${
                  isMoreTabActive
                    ? 'bg-primary-700 text-white border-primary-700 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }
              `}
            >
              {activeMoreTab ? (
                <>
                  {React.createElement(activeMoreTab.icon, {
                    size: 16,
                    className: isMoreTabActive ? 'text-white' : 'text-gray-500',
                  })}
                  {activeMoreTab.label}
                </>
              ) : (
                <>
                  <Settings size={16} className="text-gray-500" />
                  More
                </>
              )}
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''} ${isMoreTabActive ? 'text-white/70' : 'text-gray-400'}`}
              />
            </button>

            {moreOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-gray-200/80 py-1.5 z-50 ring-1 ring-black/5">
                <div className="px-3.5 py-2 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    More Options
                  </p>
                </div>
                {MORE_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMoreOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors
                        ${isActive ? 'bg-primary-700/5 text-primary-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}
                      `}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-primary-700/10' : 'bg-gray-100'
                      }`}>
                        <Icon
                          size={16}
                          className={isActive ? 'text-primary-700' : 'text-gray-400'}
                        />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-[13px]">{tab.label}</div>
                        <div className="text-[11px] text-gray-400 font-normal">
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden bg-gray-50 p-4">
        <main className="h-full min-h-0 w-full overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default NhisModule;

// Re-export components and hooks for external use
export * from './components';
export * from './hooks';
export * from './types';
export * from './api';
