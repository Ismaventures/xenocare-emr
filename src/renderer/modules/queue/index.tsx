import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Monitor,
  RefreshCw,
  LayoutList,
  KanbanSquare,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { StatsCard, Tabs, EmptyState } from '../../components/ui/DataDisplay';
import { Button } from '../../components/ui/FormElements';
import { QueueList } from './components/QueueList';
import { QueueKanbanBoard } from './components/QueueKanbanBoard';
import { QueueDisplay, QueueWidget } from './components/QueueDisplay';
import { AddToQueueForm } from './components/AddToQueueForm';
import {
  useQueue,
  useQueueStats,
  useDepartmentQueues,
  useQueueSubscription,
} from './hooks/useQueue';
import { Department, DEPARTMENTS, getDepartmentColor } from './dtos/queue.dto';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../api/supabaseClient';

export default function QueueManagement() {
  const { user, hasRole } = useAuth();
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department>('Reception');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  // Enable real-time updates
  useQueueSubscription();

  const {
    data: stats,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useQueueStats();
  const {
    data: queue,
    isLoading: loadingQueue,
    refetch: refetchQueue,
  } = useQueue({
    department: selectedDepartment,
  });
  const { data: departmentQueues, refetch: refetchDepartments } =
    useDepartmentQueues();

  // Get visit IDs from queue for payment status lookup
  const visitIds = useMemo(
    () =>
      (queue || []).filter((q) => q.visit_id).map((q) => q.visit_id as string),
    [queue],
  );

  // Fetch payment status for visits in queue
  const { data: visitPaymentStatus } = useQuery({
    queryKey: ['queue-payment-status', visitIds],
    queryFn: async () => {
      if (visitIds.length === 0) return {};

      const { data, error } = await supabase
        .from('billing_orders')
        .select('id, visit_id, status')
        .in('visit_id', visitIds)
        .eq('status', 'Pending');

      if (error) {
        console.error('Error fetching payment status:', error);
        return {};
      }

      // Build a map of visit_id to payment status
      const statusMap: Record<string, { payment_status: string }> = {};
      for (const order of data || []) {
        if (order.visit_id && !statusMap[order.visit_id]) {
          // If any order is pending, mark the visit as pending
          statusMap[order.visit_id] = { payment_status: 'Pending' };
        }
      }

      return statusMap;
    },
    enabled: visitIds.length > 0,
    staleTime: 30000,
  });

  // Determine user's primary department based on role
  const getUserDepartment = (): Department => {
    if (hasRole(['receptionist'])) return 'Reception';
    if (hasRole(['nurse'])) return 'Nursing';
    if (hasRole(['doctor', 'medical_director'])) return 'Consultation';
    if (hasRole(['lab_technician'])) return 'Laboratory';
    if (hasRole(['radiologist'])) return 'Radiology';
    if (hasRole(['pharmacist'])) return 'Pharmacy';
    if (hasRole(['billing_clerk'])) return 'Billing';
    return 'Reception';
  };

  // Set initial department based on user role
  React.useEffect(() => {
    if (!hasRole(['super_admin', 'admin'])) {
      setSelectedDepartment(getUserDepartment());
    }
  }, [user]);

  const handleRefresh = () => {
    refetchStats();
    refetchQueue();
    refetchDepartments();
  };

  // Show full display mode
  if (showDisplay) {
    return (
      <div className="fixed inset-0 z-50">
        <Button
          variant="secondary"
          className="fixed top-4 right-4 z-50"
          onClick={() => setShowDisplay(false)}
        >
          Exit Display
        </Button>
        <QueueDisplay />
      </div>
    );
  }

  // Department tabs
  const departmentTabs = DEPARTMENTS.map((dept) => {
    const queueInfo = departmentQueues?.find((d) => d.department === dept);
    return {
      id: dept,
      label: dept,
      count: queueInfo?.waiting || 0,
    };
  });

  // Filter tabs for non-admin users
  const availableTabs = hasRole(['super_admin', 'admin'])
    ? departmentTabs
    : departmentTabs.filter((tab) => tab.id === getUserDepartment());

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Queue Management</h1>
          <p className="text-gray-500">
            Manage patient flow through departments
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <KanbanSquare className="h-4 w-4" />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutList className="h-4 w-4" />
              List
            </button>
          </div>
          <Button variant="secondary" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => setShowDisplay(true)}>
            <Monitor className="h-4 w-4 mr-1" />
            Display Mode
          </Button>
          {hasRole(['super_admin', 'admin', 'receptionist']) && (
            <Button variant="primary" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add to Queue
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Waiting"
          value={stats?.waiting || 0}
          icon={Users}
          color="yellow"
        />
        <StatsCard
          title="In Progress"
          value={stats?.in_progress || 0}
          icon={Clock}
          color="blue"
        />
        <StatsCard
          title="Completed Today"
          value={stats?.completed_today || 0}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="No Shows"
          value={stats?.no_shows || 0}
          icon={XCircle}
          color="red"
        />
        <StatsCard
          title="Avg Wait Time"
          value={stats?.average_wait_time || '0 min'}
          icon={Clock}
          color="purple"
        />
      </div>

      {/* Department Overview Widget */}
      {hasRole(['super_admin', 'admin']) && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Department Overview
          </h3>
          <QueueWidget
            onDepartmentClick={(dept) =>
              setSelectedDepartment(dept as Department)
            }
          />
        </div>
      )}

      {/* Department Tabs & Queue */}
      <div className="bg-white rounded-lg shadow">
        {availableTabs.length > 1 && (
          <div className="border-b border-gray-200 px-4">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedDepartment(tab.id as Department)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    selectedDepartment === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        selectedDepartment === tab.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        )}

        <div className="p-6">
          {viewMode === 'kanban' ? (
            <QueueKanbanBoard
              entries={queue}
              department={selectedDepartment}
              isLoading={loadingQueue}
              onPatientSelect={(patientId) => {
                // Could navigate to patient detail
                console.log('Selected patient:', patientId);
              }}
              paymentStatusMap={visitPaymentStatus || {}}
            />
          ) : (
            <QueueList
              entries={queue}
              department={selectedDepartment}
              isLoading={loadingQueue}
              onPatientSelect={(patientId) => {
                // Could navigate to patient detail
                console.log('Selected patient:', patientId);
              }}
              paymentStatusMap={visitPaymentStatus || {}}
            />
          )}
        </div>
      </div>

      {/* Add to Queue Modal */}
      <AddToQueueForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        defaultDepartment={selectedDepartment}
      />
    </div>
  );
}
