import React from 'react';
import {
  Activity,
  Calendar,
  Thermometer,
  FileText,
  FlaskConical,
  Scan,
  Pill,
  Zap,
  BedDouble,
  Receipt,
  Syringe,
  Smile,
  Eye,
  Dumbbell,
  Users,
  ClipboardList,
  ChevronRight,
  Stethoscope, // New import for general icon
} from 'lucide-react';

export type ModuleType =
  | 'overview'
  | 'timeline'
  | 'vitals'
  | 'all-notes'
  | 'orders'
  | 'labs'
  | 'radiology'
  | 'pharmacy'
  | 'treatment-plan'
  | 'admissions'
  | 'billing'
  | 'procedures'
  | 'dental'
  | 'ophthalmology'
  | 'physiotherapy'
  | 'care-team';

interface SidebarNavigationProps {
  activeModule: ModuleType;
  onChange: (module: ModuleType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type NavGroup = {
  title: string;
  items: {
    id: ModuleType;
    label: string;
    icon: React.ElementType;
  }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'General',
    items: [
      { id: 'overview', label: 'Overview', icon: Activity },
      { id: 'timeline', label: 'Timeline', icon: Calendar },
      { id: 'care-team', label: 'Care Team', icon: Users },
    ],
  },
  {
    title: 'Clinical',
    items: [
      { id: 'all-notes', label: 'Clinical Notes', icon: FileText },
      { id: 'vitals', label: 'Vitals', icon: Thermometer },
      { id: 'treatment-plan', label: 'Treatment Plan', icon: Zap },
      { id: 'admissions', label: 'Ward / Bed', icon: BedDouble },
    ],
  },
  {
    title: 'Orders & Results',
    items: [
      { id: 'orders', label: 'Orders', icon: ClipboardList },
      { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
      { id: 'labs', label: 'Laboratory', icon: FlaskConical },
      { id: 'radiology', label: 'Radiology', icon: Scan },
      { id: 'procedures', label: 'Procedures', icon: Syringe },
    ],
  },
  {
    title: 'Specialty Clinics',
    items: [
      { id: 'dental', label: 'Dental', icon: Smile },
      { id: 'ophthalmology', label: 'Ophthalmology', icon: Eye },
      { id: 'physiotherapy', label: 'Physiotherapy', icon: Dumbbell },
    ],
  },
  {
    title: 'Administrative',
    items: [{ id: 'billing', label: 'Financials', icon: Receipt }],
  },
];

export function SidebarNavigation({
  activeModule,
  onChange,
  isCollapsed,
  onToggleCollapse,
}: SidebarNavigationProps) {
  return (
    <div
      className={`
        flex flex-col bg-white h-full
        ${isCollapsed ? 'w-full' : 'w-full'}
      `}
    >
      {/* Header with Collapse Toggle */}
      <div
        className={`flex items-center p-3 border-b border-gray-200 bg-gray-50/50 ${isCollapsed ? 'justify-center' : 'justify-end'}`}
      >
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-white hover:text-gray-600 hover:shadow-sm transition-all border border-transparent hover:border-gray-200"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Collapse
              </span>
              <ChevronRight size={18} className="rotate-180" />
            </div>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div
            key={group.title}
            className={`${groupIndex > 0 ? 'border-t border-gray-100 pt-4' : ''}`}
          >
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                {group.title}
              </h3>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeModule === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`
                      w-full flex items-center rounded-lg transition-all duration-200 group relative
                      ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2 gap-3'}
                      ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm ring-1 ring-indigo-200/50'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon
                      size={isCollapsed ? 20 : 18}
                      className={`
                        flex-shrink-0 transition-colors
                        ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}
                      `}
                    />

                    {!isCollapsed && (
                      <span className="truncate text-sm">{item.label}</span>
                    )}

                    {isActive && !isCollapsed && (
                      <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
