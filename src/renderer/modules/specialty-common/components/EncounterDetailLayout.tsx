/**
 * EncounterDetailLayout
 * =====================
 * Shared layout shell used by ALL specialty clinic encounter detail views
 * (18 generic specialties + ophthalmology + any future dedicated modules).
 *
 * Provides the two-panel layout:
 *   LEFT  — sidebar (patient identity, encounter metadata, diagnosis, jump-to nav)
 *   RIGHT — content area (header, encounter/workspace selectors, scrollable body)
 *
 * Consumers pass data-specific content through props and children.
 */
import React, { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Calendar,
  Building2,
  Stethoscope,
  Hash,
  Printer,
  Share2,
  X,
  Maximize2,
  Minimize2,
  User,
} from 'lucide-react';

// ─── Theme type (re-exported for consumers) ─────────────────────────────────

export type EncounterDetailTheme = {
  primary: string;
  primaryHover: string;
  text: string;
  softBg: string;
  softBorder: string;
  sidebarDot: string;
  priorityFrom: string;
  priorityTo: string;
  complaintCardAccent: string;
};

// ─── Jump-to nav item ───────────────────────────────────────────────────────

export interface JumpToItem {
  id: string;
  label: string;
  count?: number;
}

// ─── Tab item (for the Clinical workspace selector) ─────────────────────────

export interface WorkspaceTab {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

// ─── Encounter selector option ──────────────────────────────────────────────

export interface EncounterOption {
  id: string;
  label: string;
  isCurrent?: boolean;
}

// ─── Diagnosis code badge ───────────────────────────────────────────────────

export interface DiagnosisCode {
  code: string;
  description?: string;
  isPrimary?: boolean;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface EncounterDetailLayoutProps {
  // ── Mode ──
  /** 'modal' renders with fixed backdrop + dialog; 'fullpage' fills the container */
  mode: 'modal' | 'fullpage';

  // ── Patient ──
  patientName: string;
  emrNumber: string;
  initials: string;

  // ── Specialty ──
  specialtyName: string;
  theme: EncounterDetailTheme;

  // ── Encounter metadata ──
  encounterDate?: string;
  facilityName?: string;
  visitId?: string;

  // ── Status ──
  status?: string;
  statusBadgeClass?: string;

  // ── Doctor ──
  doctorName?: string;
  subtitle?: string;

  // ── Diagnosis ──
  diagnosisCodes?: DiagnosisCode[];
  /** Override entire diagnosis section with custom content */
  diagnosisContent?: ReactNode;

  // ── Jump-to nav ──
  jumpToItems: JumpToItem[];
  activeJumpToId?: string;
  onJumpTo: (id: string) => void;

  // ── Sidebar extras ──
  /** Rendered between diagnosis and jump-to in the sidebar */
  sidebarExtra?: ReactNode;
  /** Rendered at the bottom of the sidebar */
  sidebarFooter?: ReactNode;
  /** Urgent alert at bottom of sidebar */
  urgentAlert?: ReactNode;

  // ── Print / Share / Back ──
  onPrint?: () => void;
  onShare?: () => void;
  onClose: () => void;
  closeLabel?: string;

  // ── Expand/collapse ──
  isExpanded: boolean;
  onToggleExpand: () => void;

  // ── Header action buttons (right side of header) ──
  headerActions?: ReactNode;

  // ── Updates badge count ──
  updatesCount?: number;

  // ── Encounter selector ──
  encounterOptions: EncounterOption[];
  selectedEncounterId: string;
  onSelectEncounter: (id: string) => void;
  showAllEncountersOption?: boolean;

  // ── Clinical workspace ──
  workspaceTabs: WorkspaceTab[];
  activeTabId: string;
  onChangeTab: (id: string) => void;

  // ── Footer ──
  footer?: ReactNode;

  // ── Content ──
  children: ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EncounterDetailLayout({
  mode,
  patientName,
  emrNumber,
  initials,
  specialtyName,
  theme,
  encounterDate,
  facilityName = 'NDC Medical Centre',
  visitId,
  status,
  statusBadgeClass,
  doctorName,
  subtitle,
  diagnosisCodes = [],
  diagnosisContent,
  jumpToItems,
  activeJumpToId,
  onJumpTo,
  sidebarExtra,
  sidebarFooter,
  urgentAlert,
  onPrint,
  onShare,
  onClose,
  closeLabel,
  isExpanded,
  onToggleExpand,
  headerActions,
  updatesCount,
  encounterOptions,
  selectedEncounterId,
  onSelectEncounter,
  showAllEncountersOption,
  workspaceTabs,
  activeTabId,
  onChangeTab,
  footer,
  children,
}: EncounterDetailLayoutProps) {
  const activeTabMeta = workspaceTabs.find((t) => t.id === activeTabId) || workspaceTabs[0];

  // ── Inner layout (shared between modal and fullpage) ───────────────────────

  const innerLayout = (
    <div
      className={`w-full bg-[#ebecef] shadow-2xl flex flex-col overflow-hidden print:shadow-none print:rounded-none print:h-auto print:overflow-visible transition-all duration-300 ${
        mode === 'modal'
          ? isExpanded
            ? 'rounded-xl'
            : 'rounded-2xl'
          : 'h-full rounded-none'
      }`}
      style={
        mode === 'modal'
          ? isExpanded
            ? { maxWidth: '99vw', width: '99vw', height: '98vh' }
            : {
                maxWidth: 'min(96vw, 1680px)',
                width: 'min(96vw, 1680px)',
                height: '92vh',
              }
          : undefined
      }
      onClick={mode === 'modal' ? (e) => e.stopPropagation() : undefined}
    >
      <div className="flex flex-1 min-h-0 overflow-hidden print:flex print:min-h-0">
        {/* ── SIDEBAR (modal only) ── */}
        {mode === 'modal' && (
        <aside className="hidden sm:flex sm:flex-col w-[190px] lg:w-[210px] shrink-0 border-r border-slate-200/90 bg-[#fafbfb] print:flex overflow-y-auto">
          {/* Patient identity */}
          <div className="px-3 py-3.5 border-b border-slate-200/80">
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-12 h-12 rounded-full ${theme.softBg} ring-2 ring-white shadow-md flex items-center justify-center text-base font-bold ${theme.text}`}
              >
                {initials || <User className="w-7 h-7" />}
              </div>
              <p className="mt-3 text-base font-bold text-slate-900 leading-tight">
                {patientName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                ID {emrNumber}
              </p>
              <div className="flex gap-2 mt-4 w-full">
                {onPrint && (
                  <button
                    type="button"
                    onClick={onPrint}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                )}
                {onShare && (
                  <button
                    type="button"
                    onClick={onShare}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Encounter metadata + Jump-to */}
          <div className="px-3 py-3 space-y-3 flex-1">
            {/* Metadata */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-2">
                Encounter metadata
              </p>
              <ul className="text-xs text-slate-600 space-y-2">
                {encounterDate && (
                  <li className="flex gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                    <span>{encounterDate}</span>
                  </li>
                )}
                <li className="flex gap-2">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span>{facilityName}</span>
                </li>
                <li className="flex gap-2">
                  <Stethoscope className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span>{specialtyName}</span>
                </li>
                {visitId && (
                  <li className="flex gap-2">
                    <Hash className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                    <span className="font-mono text-[10px] break-all">
                      {visitId}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Diagnosis codes */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-2">
                Diagnosis codes
              </p>
              {diagnosisContent ? (
                diagnosisContent
              ) : diagnosisCodes.length === 0 ? (
                <p className="text-xs text-slate-400 italic">None recorded</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {diagnosisCodes.map((icd, i) => (
                    <span
                      key={`${icd.code}-${i}`}
                      title={icd.description || undefined}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                        icd.isPrimary
                          ? `${theme.softBg} ${theme.text} border-slate-200/80`
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {icd.code}
                      {icd.isPrimary ? ' (Primary)' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Extra sidebar content */}
            {sidebarExtra}

            {/* Jump-to navigation */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-2">
                Jump to
              </p>
              <nav className="space-y-0.5">
                {jumpToItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onJumpTo(item.id)}
                    className={`w-full text-left flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-xs font-medium transition-colors ${
                      activeJumpToId === item.id
                        ? `${theme.softBg} ${theme.text} font-bold`
                        : 'text-slate-700 hover:bg-white/90'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.sidebarDot}`}
                    />
                    {item.label}
                    {item.count != null && item.count > 0 ? (
                      <span className="ml-auto text-[10px] font-bold bg-slate-200/80 text-slate-600 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Sidebar footer */}
          {sidebarFooter}

          {/* Urgent alert */}
          {urgentAlert}
        </aside>
        )}

        {/* ── CONTENT AREA ── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-[#f4f5f7]">
          {/* Fullpage compact patient strip (replaces sidebar) */}
          {mode === 'fullpage' && (
            <div className="shrink-0 border-b border-slate-200/90 bg-white print:hidden">
              {/* Row 1: Patient identity + metadata + actions */}
              <div className="px-5 md:px-6 py-3 flex items-center gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm shrink-0"
                  aria-label={closeLabel || 'Back'}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {closeLabel || 'Back'}
                </button>
                <span className="hidden sm:block w-px h-7 bg-slate-200" />
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full ${theme.softBg} ring-1 ring-white shadow flex items-center justify-center text-sm font-bold ${theme.text}`}
                  >
                    {initials || <User className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{patientName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">ID {emrNumber}</p>
                  </div>
                </div>
                <span className="hidden sm:block w-px h-7 bg-slate-200" />
                <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                  {encounterDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {encounterDate}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                    {specialtyName}
                  </span>
                  {visitId && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px]">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      {visitId}
                    </span>
                  )}
                  {status && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        statusBadgeClass || 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      }`}
                    >
                      {status}
                    </span>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                  {headerActions}
                  {onPrint && (
                    <button
                      type="button"
                      onClick={onPrint}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                  )}
                  {onShare && (
                    <button
                      type="button"
                      onClick={onShare}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                  )}
                </div>
              </div>
              {/* Row 2: Selectors + Jump-to pills */}
              <div className="px-5 md:px-6 pb-3 flex items-end gap-3 flex-wrap">
                <div className="min-w-[180px] max-w-[240px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Encounter</p>
                  <select
                    value={selectedEncounterId}
                    onChange={(e) => onSelectEncounter(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-300"
                    aria-label="Select encounter"
                    disabled={encounterOptions.length === 0}
                  >
                    {showAllEncountersOption && (
                      <option value="all">All Encounters ({encounterOptions.length})</option>
                    )}
                    {encounterOptions.map((enc) => (
                      <option key={enc.id} value={enc.id}>{enc.label}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[180px] max-w-[240px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Workspace</p>
                  <select
                    value={activeTabId}
                    onChange={(e) => onChangeTab(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-300"
                    aria-label="Clinical workspace"
                  >
                    {workspaceTabs.map((tab) => (
                      <option key={tab.id} value={tab.id}>
                        {tab.label}{tab.count ? ` (${tab.count})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {jumpToItems.length > 0 && (
                  <>
                    <span className="hidden sm:block w-px h-7 bg-slate-200" />
                    <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 pb-0.5">
                      {jumpToItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onJumpTo(item.id)}
                          className={`whitespace-nowrap inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors shrink-0 ${
                            activeJumpToId === item.id
                              ? `${theme.softBg} ${theme.text} font-bold`
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${theme.sidebarDot}`} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* Extra sidebar content (triage, etc.) */}
              {sidebarExtra && (
                <div className="px-5 md:px-6 pb-3">
                  {sidebarExtra}
                </div>
              )}
            </div>
          )}

          {/* Header (modal mode only) */}
          {mode === 'modal' && (
          <header className="shrink-0 px-5 md:px-7 pt-5 pb-4 border-b border-slate-200/90 bg-[#f4f5f7] print:border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold uppercase tracking-[0.16em] ${theme.text} opacity-90`}
                >
                  {specialtyName}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
                  Specialty Encounter Detail
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  {subtitle ||
                    (doctorName
                      ? `Consultation with Dr. ${doctorName}`
                      : 'Specialty consultation')}
                  <span className="text-slate-400"> · </span>
                  {specialtyName}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {status && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        statusBadgeClass ||
                        'bg-emerald-100 text-emerald-700 border-emerald-300'
                      }`}
                    >
                      {status}
                    </span>
                  )}
                  {updatesCount != null && updatesCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-violet-50 text-violet-800 border-violet-200">
                      Updates ({updatesCount})
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0 print:hidden">
                {headerActions}
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
                {mode === 'modal' && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 shadow-sm"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Encounter / Clinical workspace selectors */}
            <div className="mt-4 flex flex-col lg:flex-row lg:items-end gap-3 print:hidden">
              <div className="flex-1 min-w-[220px]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Encounter / Visit
                </p>
                <select
                  value={selectedEncounterId}
                  onChange={(e) => onSelectEncounter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-300"
                  aria-label="Select encounter visit"
                  disabled={encounterOptions.length === 0}
                >
                  {showAllEncountersOption && (
                    <option value="all">
                      All Encounters ({encounterOptions.length})
                    </option>
                  )}
                  {encounterOptions.length === 0 ? (
                    <option value="" disabled>
                      No encounters available
                    </option>
                  ) : (
                    encounterOptions.map((enc) => (
                      <option key={enc.id} value={enc.id}>
                        {enc.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex-1 min-w-[220px] max-w-md">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Clinical workspace
                </p>
                <select
                  value={activeTabId}
                  onChange={(e) => onChangeTab(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-300"
                  aria-label="Clinic care section"
                >
                  {workspaceTabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                      {tab.count ? ` (${tab.count})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {activeTabMeta && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm shrink-0">
                  <activeTabMeta.icon size={16} className={theme.text} />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Viewing
                    </p>
                    <p className="text-[11px] font-bold text-slate-800">
                      {activeTabMeta.label}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </header>
          )}

          {/* Mobile patient bar */}
          <div className="sm:hidden px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-3 print:hidden">
            <div
              className={`w-10 h-10 rounded-full ${theme.softBg} flex items-center justify-center text-sm font-bold ${theme.text}`}
            >
              {initials || <User className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">
                {patientName}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                {emrNumber}
              </p>
            </div>
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50"
                aria-label="Print"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50"
                aria-label="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Scrollable content body */}
          <div className="flex-1 overflow-y-auto print:overflow-visible min-h-0">
            <div className="px-5 md:px-7 py-6">{children}</div>
            {footer}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Modal wrapping ────────────────────────────────────────────────────────

  if (mode === 'modal') {
    return createPortal(
      <>
        <div
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[2px] print:hidden"
          onClick={onClose}
        />
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 print:p-0 print:static print:h-auto print:block print:w-full print:bg-white print:overflow-visible"
          role="dialog"
          aria-modal="true"
          aria-label="Encounter Detail"
        >
          {innerLayout}
        </div>
      </>,
      document.body,
    );
  }

  // ── Fullpage wrapping ─────────────────────────────────────────────────────

  return innerLayout;
}
