import React, { useMemo, useState } from 'react';
import { Search, Settings, Server, Activity, FileText } from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import {
  DataTable,
  EmptyState,
  StatsCard,
} from '../../components/ui/DataDisplay';
import { Button, Input, Select } from '../../components/ui/FormElements';
import { Modal } from '../../components/ui/Modal';
import ConfigurationEditForm from './components/ConfigurationEditForm';
import ServerSettings from './components/ServerSettings';
import ComprehensiveAuditViewer from './components/ComprehensiveAuditViewer';
import ClinicalTemplatesManager from './components/ClinicalTemplatesManager';
import {
  useConfigCategories,
  useSystemConfigurations,
  useUpdateSystemConfiguration,
} from './hooks/useConfigurations';
import { SystemConfigurationDTO } from './dtos/configurations.dto';
import { useToast } from '../../components/ui/Toast';

const EMPTY_CATEGORIES: any[] = [];
const EMPTY_CONFIGS: any[] = [];

type ActiveTab = 'settings' | 'server' | 'audit' | 'templates';

export default function Configurations() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('settings');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [selected, setSelected] = useState<SystemConfigurationDTO | null>(null);
  const { showToast } = useToast();

  const categoriesQuery = useConfigCategories();
  const configsQuery = useSystemConfigurations({
    query,
    category_id: categoryId || undefined,
    activeOnly,
  });
  const updateConfig = useUpdateSystemConfiguration();

  const categories = useMemo(
    () => categoriesQuery.data || EMPTY_CATEGORIES,
    [categoriesQuery.data],
  );
  const configs = useMemo(
    () => configsQuery.data || EMPTY_CONFIGS,
    [configsQuery.data],
  );

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All Categories' },
      ...categories.map((c) => ({ value: c.category_id, label: c.name })),
    ],
    [categories],
  );

  const stats = useMemo(() => {
    const system = configs.filter((c) => c.is_system).length;
    return { total: configs.length, system };
  }, [configs]);

  const columns = [
    {
      key: 'key',
      header: 'Key',
      render: (c: SystemConfigurationDTO) => (
        <span className="font-mono text-xs">{c.key}</span>
      ),
      className: 'max-w-[320px]',
    },
    {
      key: 'value',
      header: 'Value',
      render: (c: SystemConfigurationDTO) => (
        <span className="text-sm text-gray-900 truncate block max-w-[360px]">
          {c.value}
        </span>
      ),
      className: 'max-w-[380px]',
    },
    {
      key: 'category',
      header: 'Category',
      render: (c: SystemConfigurationDTO) => (
        <span className="text-sm text-gray-600">{c.category?.name || '—'}</span>
      ),
    },
    {
      key: 'is_system',
      header: 'Type',
      render: (c: SystemConfigurationDTO) => (
        <span className="text-sm text-gray-700">
          {c.is_system ? 'System' : 'User'}
        </span>
      ),
    },
  ];

  let tableContent: React.ReactNode;
  if (configsQuery.isLoading && !configsQuery.data) {
    tableContent = (
      <div className="p-4">
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  } else if (configs.length > 0) {
    tableContent = (
      <div className="p-4">
        <DataTable
          data={configs}
          columns={columns as any}
          onRowClick={(c) => setSelected(c)}
          selectedRow={selected}
          keyField={'config_id' as any}
        />
      </div>
    );
  } else {
    tableContent = (
      <EmptyState
        icon={Settings}
        title="No configurations"
        description="No configuration keys matched your filters"
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurations</h1>
          <p className="text-gray-500">
            System settings and operational parameters
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              System Settings
            </div>
          </button>
          <button
            onClick={() => setActiveTab('server')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'server'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Server Connection
            </div>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'audit'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Audit Trail
            </div>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Clinical Templates
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'server' ? (
        <ServerSettings />
      ) : activeTab === 'audit' ? (
        <ComprehensiveAuditViewer />
      ) : activeTab === 'templates' ? (
        <ClinicalTemplatesManager />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatsCard title="Configurations" value={stats.total} />
            <StatsCard
              title="System Keys"
              value={stats.system}
              variant="info"
            />
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex flex-wrap gap-4">
              <div className="flex-1 min-w-[220px]">
                <Input
                  placeholder="Search by key or description..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  leftIcon={Search}
                />
              </div>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={categoryOptions}
              />
              <Button
                variant={activeOnly ? 'primary' : 'outline'}
                onClick={() => setActiveOnly((v) => !v)}
              >
                Active Only
              </Button>
            </div>

            {tableContent}
          </div>

          {selected && (
            <Modal
              isOpen={!!selected}
              onClose={() => setSelected(null)}
              title="Edit Configuration"
              size="lg"
            >
              <ConfigurationEditForm
                config={selected}
                isLoading={updateConfig.isPending}
                onCancel={() => setSelected(null)}
                onSubmit={async (value) => {
                  try {
                    await updateConfig.mutateAsync({
                      config_id: selected.config_id,
                      value,
                    });
                    showToast({
                      type: 'success',
                      title: 'Configuration Updated',
                      message: 'Setting saved successfully',
                    });
                    setSelected(null);
                  } catch (error) {
                    showToast({
                      type: 'error',
                      title: 'Update Failed',
                      message: 'Failed to save configuration',
                    });
                  }
                }}
              />
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
