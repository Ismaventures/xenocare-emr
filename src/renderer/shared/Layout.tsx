import React, { useState, useMemo, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { menuItems as staticMenuItems } from '../config/menu';
import { useDynamicMenuItems } from '../hooks/useDynamicMenuItems';
import { NotificationBell } from '../components/ui/NotificationBell';
import { useTimeTheme } from '../hooks/useTimeTheme';
import { useUnreadCount } from '../modules/messaging/hooks/useMessaging';
import { GlobalPatientSearch } from '../components/shared/GlobalPatientSearch';

interface SidebarItemProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed?: boolean;
  onClick?: () => void;
  /** Optional image source to use instead of icon */
  imageSrc?: string;
  /** Optional badge count to display */
  badge?: number;
}

function SidebarItem({
  to,
  icon: Icon,
  label,
  collapsed,
  onClick,
  isCrystalMode,
  surfaceDeep,
  imageSrc,
  badge,
}: SidebarItemProps & { isCrystalMode?: boolean; surfaceDeep?: boolean }) {
  const location = useLocation();
  // For root path, use exact match; for others, use startsWith
  const isActive =
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  // Badge component
  const BadgeComponent =
    badge && badge > 0 ? (
      <span
        className={`absolute ${collapsed ? 'top-0 right-0' : 'top-1/2 -translate-y-1/2 right-3'} min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full px-1 shadow-md`}
      >
        {badge > 99 ? '99+' : badge}
      </span>
    ) : null;

  // Crystal mode - soft cream background with emerald accents
  if (isCrystalMode) {
    return (
      <Link
        to={to}
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-[1.1rem] transition-all duration-300 group relative antialiased ${
          isActive
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-700/25 ring-1 ring-white/25'
            : 'text-stone-800 hover:bg-white/80 hover:text-emerald-800 hover:shadow-md hover:shadow-stone-200/80'
        }`}
      >
        <div
          className={`${collapsed ? '' : 'mr-3'} ${isActive ? '' : 'group-hover:scale-105'} transition-transform duration-200`}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={label}
              className="w-5 h-5 object-contain flex-shrink-0"
            />
          ) : (
            <Icon
              size={20}
              className="flex-shrink-0"
              strokeWidth={isActive ? 2.25 : 2}
            />
          )}
        </div>
        {!collapsed && (
          <span
            className={`text-[15px] leading-snug tracking-tight ${isActive ? 'font-bold' : 'font-semibold'} ${isActive ? '' : 'group-hover:font-bold'} transition-all duration-200 [text-rendering:optimizeLegibility]`}
          >
            {label}
          </span>
        )}
        {collapsed && (
          <div className="absolute left-full ml-3 px-3 py-2 bg-stone-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
            {label}
            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-stone-800 rotate-45" />
          </div>
        )}
        {!isActive && BadgeComponent}
        {isActive && !collapsed && !badge && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] ring-1 ring-emerald-900/10" />
        )}
      </Link>
    );
  }

  // Deep sidebar Ã¢â‚¬â€ teal / navy / night gradient (matches main clinical banners)
  if (surfaceDeep) {
    return (
      <Link
        to={to}
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`flex items-center antialiased ${collapsed ? 'justify-center px-2' : 'px-3.5 mx-1.5'} py-2.5 rounded-[1.1rem] transition-all duration-200 group relative ${
          isActive
            ? 'bg-white/22 text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)] ring-1 ring-white/30 font-bold'
            : 'text-white/95 hover:bg-white/14 hover:text-white hover:shadow-lg hover:shadow-black/15 font-semibold'
        }`}
      >
        <div
          className={`${collapsed ? '' : 'mr-3'} shrink-0 ${isActive ? 'text-cyan-50' : 'text-teal-50/90 group-hover:text-white'}`}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={label}
              className="w-[19px] h-[19px] object-contain brightness-110"
            />
          ) : (
            <Icon
              size={19}
              strokeWidth={isActive ? 2.35 : 2.05}
              className="flex-shrink-0"
            />
          )}
        </div>
        {!collapsed && (
          <span className="text-[15px] sm:text-[16px] leading-snug tracking-tight [text-rendering:optimizeLegibility]">
            {label}
          </span>
        )}
        {collapsed && (
          <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-slate-700">
            {label}
            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-slate-700" />
          </div>
        )}
        {!isActive && BadgeComponent}
        {isActive && !collapsed && !badge && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-cyan-100 shadow-[0_0_10px_rgba(207,250,254,0.95)] ring-1 ring-white/40" />
        )}
      </Link>
    );
  }

  // Fallback light rail (only if neither crystal nor deep)
  return (
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center antialiased ${collapsed ? 'justify-center' : ''} px-4 py-2.5 transition-all duration-200 group relative rounded-[1.1rem] mx-1.5 shadow-sm ${
        isActive
          ? 'bg-emerald-50 text-[#0d5e56] border border-emerald-200/80 font-bold shadow-md'
          : 'text-slate-700 hover:bg-white hover:text-slate-900 border border-transparent font-semibold hover:shadow'
      }`}
    >
      <div
        className={`${collapsed ? '' : 'mr-3'} ${isActive ? 'text-[#0d5e56]' : 'text-slate-400 group-hover:text-[#0d5e56]'}`}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={label}
            className="w-5 h-5 object-contain flex-shrink-0"
          />
        ) : (
          <Icon size={20} className="flex-shrink-0" />
        )}
      </div>
      {!collapsed && (
        <span className="text-[15px] font-semibold tracking-tight [text-rendering:optimizeLegibility]">
          {label}
        </span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
          {label}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
        </div>
      )}
      {BadgeComponent}
    </Link>
  );
}

export default function Layout() {
  const { user, signOut, canAccessModule, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Get dynamic menu items based on user's specialty
  const { menuItems } = useDynamicMenuItems();

  // Get unread message count - only when authenticated
  const unreadQuery = useUnreadCount();
  const unreadMessageCount = unreadQuery.data ?? 0;

  // Filter navigation items based on user permissions
  const accessibleNavItems = menuItems.filter((item) =>
    canAccessModule(item.module),
  );

  // Get current page title (use static items for title lookup to avoid flicker)
  const getCurrentTitle = () => {
    // First try dynamic items, then fall back to static
    const currentItem =
      menuItems.find((item) => location.pathname.startsWith(item.to)) ||
      staticMenuItems.find((item) => location.pathname.startsWith(item.to));
    return currentItem?.label || 'Dashboard';
  };

  // Get user initials
  const getUserInitials = () => {
    if (!user) return 'U';
    const name = user.user_metadata?.full_name || user.email || '';
    const parts = name.split(/[\s@]/);
    return parts
      .slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase() || '')
      .join('');
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'Guest';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  };

  // Get user role display
  const getUserRole = () => {
    if (!user) return 'Guest';
    const role = user.user_metadata?.role || 'user';
    return role
      .split('_')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Get time-based theme
  const {
    colors: themeColors,
    isNightMode,
    themeMode,
    setThemeMode,
    toggleTheme,
  } = useTimeTheme();

  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Sync Tailwind dark: variants with the app's night mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isNightMode);
  }, [isNightMode]);

  const isCrystalMode = themeMode === 'crystal';
  const surfaceDeep = !isCrystalMode;

  const sidebarShellClass = useMemo(() => {
    const width =
      'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]';
    if (isCrystalMode) {
      return `${width} bg-gradient-to-b from-[#fafcfb] via-white to-[#f3f7f5] border-r border-stone-200/80`;
    }
    if (themeMode === 'navy') {
      return `${width} bg-gradient-to-b ${themeColors.sidebar.gradient} border-r border-white/12`;
    }
    if (isNightMode) {
      return `${width} bg-gradient-to-b ${themeColors.sidebar.gradient} border-r border-slate-600/50`;
    }
    return `${width} bg-gradient-to-b ${themeColors.header.gradient} border-r border-white/20`;
  }, [
    isCrystalMode,
    themeMode,
    isNightMode,
    themeColors.sidebar.gradient,
    themeColors.header.gradient,
  ]);

  const sidebarElevation = useMemo(() => {
    if (isCrystalMode) {
      return 'shadow-[16px_0_48px_-14px_rgba(13,94,86,0.16),6px_0_20px_-6px_rgba(0,0,0,0.08)]';
    }
    if (isNightMode) {
      return 'shadow-[16px_0_40px_-12px_rgba(0,0,0,0.58),inset_-1px_0_0_rgba(255,255,255,0.05)]';
    }
    return 'shadow-[18px_0_50px_-14px_rgba(13,94,86,0.32),10px_0_32px_-10px_rgba(15,23,42,0.14),inset_-1px_0_0_rgba(255,255,255,0.14)]';
  }, [isCrystalMode, isNightMode]);

  return (
    <div
      className={`flex h-screen min-h-0 w-full min-w-0 overflow-x-hidden ${isNightMode ? 'bg-slate-900' : 'bg-gray-100'}`}
    >
      {/* Sidebar Ã¢â‚¬â€ compact width, soft geometry, floating shadow stack */}
      <aside
        className={`${
          sidebarCollapsed
            ? 'w-[3.75rem]'
            : 'w-[12.5rem] sm:w-[13rem] lg:w-[13.5rem]'
        } max-h-screen flex flex-col shrink-0 relative z-20 overflow-hidden rounded-r-[1.65rem] antialiased [text-rendering:optimizeLegibility] ${sidebarElevation} ${sidebarShellClass}`}
      >
        <div
          className={`flex-shrink-0 border-b ${
            isCrystalMode
              ? 'border-stone-200/70 bg-white/55'
              : 'border-white/12 bg-black/10'
          } ${sidebarCollapsed ? 'px-2 pt-3 pb-2.5' : 'px-3 pt-3.5 pb-3'}`}
        >
          <div
            className={`flex ${sidebarCollapsed ? 'flex-col items-center gap-2.5' : 'items-center gap-2.5'}`}
          >
            <div
              className={`relative flex items-center justify-center flex-shrink-0 rounded-[1.25rem] shadow-[0_6px_18px_-6px_rgba(0,0,0,0.22)] ring-1 transition-all duration-300 ${
                isCrystalMode
                  ? 'bg-white ring-stone-200/85'
                  : 'bg-white ring-white/40'
              } ${sidebarCollapsed ? 'h-9 w-9 p-1' : 'h-10 w-10 sm:h-11 sm:w-11 p-1.5'}`}
            >
              <img
                src={require('../../../assets/ndclogo.png')}
                alt="NDC Medical Centre"
                className="h-full w-full object-contain"
              />
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1 pr-0.5">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.17em] leading-tight ${
                    isCrystalMode ? 'text-emerald-800' : 'text-white/95'
                  }`}
                >
                  NDC Medical Centre
                </p>
                <p
                  className={`mt-0.5 text-[17px] font-bold leading-tight tracking-tight ${
                    isCrystalMode
                      ? 'text-[#0d5e56]'
                      : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)]'
                  }`}
                >
                  EMR
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={
                sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              }
              className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-all duration-200 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.25)] ${
                isCrystalMode
                  ? 'border-stone-200/90 bg-white text-[#0d5e56] hover:bg-emerald-50 hover:shadow-lg'
                  : 'border-white/30 bg-white/15 text-white hover:bg-white/25 hover:shadow-lg'
              }`}
            >
              {sidebarCollapsed ? (
                <ChevronRight size={18} strokeWidth={2.35} />
              ) : (
                <ChevronLeft size={18} strokeWidth={2.35} />
              )}
            </button>
          </div>
        </div>

        <nav
          className={`mt-0.5 flex-1 overflow-y-auto space-y-1 px-1.5 pb-3 scrollbar-thin ${
            surfaceDeep && isNightMode
              ? 'scrollbar-thumb-slate-600'
              : surfaceDeep
                ? 'scrollbar-thumb-teal-300/40'
                : 'scrollbar-thumb-stone-300'
          }`}
        >
          {accessibleNavItems.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              collapsed={sidebarCollapsed}
              isCrystalMode={isCrystalMode}
              surfaceDeep={surfaceDeep}
              imageSrc={item.imageSrc}
              badge={item.to === '/messaging' ? unreadMessageCount : undefined}
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col pb-5 pt-1 px-1.5">
          <button
            type="button"
            onClick={handleSignOut}
            className={`flex items-center antialiased ${sidebarCollapsed ? 'justify-center px-2' : 'mx-0 px-3'} py-2.5 text-[15px] font-semibold transition-all duration-200 group rounded-[1.1rem] border border-transparent [text-rendering:optimizeLegibility] ${
              isCrystalMode
                ? 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 hover:shadow-sm'
                : 'text-white/90 hover:bg-white/12 hover:text-white hover:shadow-md hover:shadow-black/10'
            }`}
          >
            <LogOut
              size={18}
              strokeWidth={2.05}
              className={`shrink-0 ${sidebarCollapsed ? '' : 'mr-2.5'} opacity-90 group-hover:opacity-100`}
            />
            {!sidebarCollapsed && (
              <span className="tracking-tight">Sign Out</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Ã¢â‚¬â€ tight gutter next to sidebar; tinted shell matches teal clinical UI */}
      <div
        className={`flex-1 flex flex-col overflow-hidden min-w-0 ${
          isCrystalMode
            ? 'bg-[#f4f7f6]'
            : isNightMode
              ? 'bg-slate-950'
              : themeMode === 'navy'
                ? 'bg-[#f4f7f6]'
                : 'bg-gradient-to-r from-teal-100/45 via-[#eef6f5] to-[#eef6f5]'
        }`}
      >
        <header
          className={`shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10 sticky top-0 shrink-0 min-w-0 ${isNightMode ? 'bg-slate-800' : 'bg-white'}`}
        >
          <div className="px-3 sm:px-5 md:px-6 py-3 sm:py-3.5 flex flex-col gap-3 min-[520px]:flex-row min-[520px]:justify-between min-[520px]:items-center min-h-[4rem] sm:min-h-[4.5rem] min-w-0">
            {/* Left side Search */}
            <div className="w-full min-w-0 min-[520px]:flex-1 min-[520px]:max-w-xl">
              <div className="relative group min-w-0">
                <Search
                  className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-[18px] w-[18px] transition-colors ${isNightMode ? 'text-slate-400' : 'text-slate-400 group-hover:text-emerald-600'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowGlobalSearch(true)}
                  className={`pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 w-full min-w-0 text-left rounded-xl text-sm transition-all flex items-center justify-between font-medium outline-none ring-0 ${
                    isNightMode
                      ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      : 'bg-[#f8f9fa] text-slate-500 hover:bg-[#f0f2f1]'
                  }`}
                >
                  <span className="truncate pr-2">
                    Search patient, records or workflows...
                  </span>
                </button>
              </div>
            </div>

            {/* Right side Actions */}
            <div className="flex items-center justify-end gap-2 sm:gap-4 md:gap-6 shrink-0 self-end min-[520px]:self-auto w-full min-[520px]:w-auto">
              <div className="flex items-center gap-2 sm:gap-4">
                <NotificationBell />
              </div>

              <div
                className={`hidden min-[520px]:block h-6 w-px shrink-0 ${isNightMode ? 'bg-slate-600' : 'bg-slate-200'}`}
              />

              {/* Header User Avatar + Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full bg-[#0d5e56] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-white font-bold"
                >
                  {getUserInitials()}
                </button>

                {showUserMenu && (
                  <div
                    className={`absolute right-0 top-12 w-72 rounded-2xl border shadow-xl z-50 overflow-hidden ${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                  >
                    <div
                      className={`px-4 py-3 ${isNightMode ? 'border-b border-slate-700' : 'border-b border-slate-100'}`}
                    >
                      <p
                        className={`text-sm font-semibold ${isNightMode ? 'text-slate-100' : 'text-slate-800'}`}
                      >
                        {getUserDisplayName()}
                      </p>
                      <p
                        className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}
                      >
                        {getUserRole()}
                      </p>
                    </div>

                    <div className="px-4 py-3">
                      <p
                        className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}
                      >
                        Theme
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setThemeMode('auto')}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${themeMode === 'auto' ? 'bg-[#0d5e56] text-white' : isNightMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Sun size={12} />
                            Auto
                          </span>
                        </button>
                        <button
                          onClick={() => setThemeMode('navy')}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${themeMode === 'navy' ? 'bg-[#0d5e56] text-white' : isNightMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Moon size={12} />
                            Navy
                          </span>
                        </button>
                        <button
                          onClick={() => setThemeMode('crystal')}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${themeMode === 'crystal' ? 'bg-[#0d5e56] text-white' : isNightMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Sparkles size={12} />
                            UI
                          </span>
                        </button>
                      </div>

                      <button
                        onClick={toggleTheme}
                        className={`w-full mt-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isNightMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                      >
                        Cycle Theme Mode
                      </button>
                    </div>

                    <div
                      className={`px-2 py-2 ${isNightMode ? 'border-t border-slate-700' : 'border-t border-slate-100'}`}
                    >
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          void handleSignOut();
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isNightMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Global Search Modal */}
        <GlobalPatientSearch
          externalOpen={showGlobalSearch}
          setExternalOpen={setShowGlobalSearch}
        />

        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full min-w-0 bg-transparent ${
            isCrystalMode
              ? 'px-4 sm:px-5 md:px-6 pt-3 pb-6 sm:pb-8'
              : isNightMode
                ? 'px-3 sm:px-5 md:px-6 pt-3 pb-6 sm:pb-8'
                : themeMode === 'navy'
                  ? 'px-3 sm:px-5 md:px-6 pt-3 pb-6 sm:pb-8'
                  : 'px-3 sm:px-4 md:px-5 lg:px-6 pt-2 sm:pt-3 pb-6 sm:pb-8'
          }`}
        >
          <div className="w-full min-w-0 max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
