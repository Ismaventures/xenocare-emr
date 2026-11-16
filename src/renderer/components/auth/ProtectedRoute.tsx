import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

// =============================================================================
// Access Denied Component
// =============================================================================

function AccessDenied() {
  const { staff } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="bg-red-100 rounded-full p-4 mb-4">
        <svg
          className="w-12 h-12 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-4">
        You don’t have permission to access this module.
      </p>
      {staff && (
        <p className="text-sm text-gray-500">
          Your role:{' '}
          <span className="font-medium">
            {staff.role.replace('_', ' ').toUpperCase()}
          </span>
        </p>
      )}
      <a
        href="/"
        className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Go to Dashboard
      </a>
    </div>
  );
}

// =============================================================================
// Protected Route Component
// =============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  roles = undefined,
  fallback = undefined,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, staff, hasRole } = useAuth();
  const location = useLocation();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !staff) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role access
  if (roles && roles.length > 0 && !hasRole(roles)) {
    return fallback || <AccessDenied />;
  }

  return children;
}

// =============================================================================
// Module Protected Route
// =============================================================================

interface ModuleRouteProps {
  children: React.ReactNode;
  module: string;
}

export function ModuleRoute({ children, module }: ModuleRouteProps) {
  const { isAuthenticated, isLoading, staff, canAccessModule } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !staff) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAccessModule(module)) {
    return <AccessDenied />;
  }

  return children;
}

// =============================================================================
// Role Gate Component
// =============================================================================

interface RoleGateProps {
  children: React.ReactNode;
  roles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGate({ children, roles, fallback = null }: RoleGateProps) {
  const { hasRole, staff } = useAuth();

  if (!staff) return fallback;

  // Super admin bypasses all checks
  if (staff.role === 'super_admin') return children;

  // Check roles
  if (!hasRole(roles)) {
    return fallback;
  }

  return children;
}

// =============================================================================
// Role Display Names
// =============================================================================

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
  medical_director: 'Medical Director',
  doctor: 'Doctor',
  nurse: 'Nurse',
  lab_technician: 'Lab Technician',
  radiologist: 'Radiologist',
  pharmacist: 'Pharmacist',
  billing_clerk: 'Billing Clerk',
  receptionist: 'Receptionist',
  cashier: 'Cashier',
  customer_service: 'Customer Service',
  inventory_manager: 'Inventory Manager',
  config_admin: 'Configuration Admin',
};

export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}
