import React, { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { LucideIcon, Plus } from 'lucide-react';
import { theme, cn } from '../lib/theme-factory';

// UI Components
import { DataTable, TableColumn, TableAction } from './ui/data-table';
import { ActionBar } from './ui/action-bar';
import { PageHeader } from './ui/page-header';
import { PageLayout } from './ui/page-layout';
import { CreationWizard } from './ui/creation-wizard';
import { DetailsWizard } from './ui/details-wizard';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

// Hooks
import { useDataFilters } from '../hooks/useDataFilters';
import { useWizard } from '../hooks/useWizard';
import { useDialog } from '../hooks/useDialog';

// Types
import { CrudPageConfig, CrudState } from '../types/crud';

interface CrudPageProps<T = any> {
  config: CrudPageConfig<T>;
}

interface TabContentProps<T = any> {
  tab: CrudTabConfig<T>;
  data: T[];
  loading: boolean;
  filteredData: T[];
  onView: (item: T) => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}

function TabContent<T extends Record<string, any>>({
  tab,
  data,
  loading,
  filteredData,
  onView,
  onEdit,
  onDelete
}: TabContentProps<T>) {
  // Enhanced actions for this tab
  const enhancedActions: TableAction<T>[] = tab.table.actions.map(action => ({
    ...action,
    onClick: (item) => {
      switch (action.label.toLowerCase()) {
        case 'edit':
          return onEdit(item);
        case 'delete':
          return onDelete(item);
        case 'view':
          return onView(item);
        default:
          return action.onClick(item);
      }
    },
  }));

  return loading || filteredData.length > 0 ? (
    <DataTable
      data={filteredData}
      columns={tab.table.columns}
      actions={enhancedActions}
      getRowId={tab.table.getRowId}
      loading={loading}
    />
  ) : tab.table.emptyState ? (
    <Card className={cn(theme.table.wrapper())}>
      <div className={cn(theme.empty.wrapper(), "py-24")}>
        {tab.icon && <tab.icon className={cn(theme.empty.icon(), "size-16 mb-4")} />}
        <h3 className="text-xl font-semibold mb-2">{tab.table.emptyState.title}</h3>
        {tab.table.emptyState.description && (
          <p className={cn(theme.empty.text(), "mb-6 max-w-md mx-auto")}>{tab.table.emptyState.description}</p>
        )}
        {tab.table.emptyState.action && (
          <Button
            onClick={tab.table.emptyState.action.onClick}
            size="lg"
            className="gap-2"
          >
            <Plus className="size-5" />
            {tab.table.emptyState.action.label}
          </Button>
        )}
      </div>
    </Card>
  ) : (
    <DataTable
      data={filteredData}
      columns={tab.table.columns}
      actions={enhancedActions}
      getRowId={tab.table.getRowId}
      loading={loading}
    />
  );
}

export function CrudPage<T extends Record<string, any>>({
  config
}: CrudPageProps<T>) {
  // Determine if this is a multi-tab configuration
  const isMultiTab = config.tabs && config.tabs.length > 0;
  const tabConfigs = config.tabs || [config as CrudTabConfig<T>];
  const defaultTab = config.defaultTab || tabConfigs[0]?.key || 'default';

  // Active tab state
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Per-tab state management
  const [tabData, setTabData] = useState<Record<string, T[]>>({});
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});

  // Get current tab configuration
  const currentTabConfig = tabConfigs.find(tab => tab.key === activeTab) || tabConfigs[0];

  // Backward compatibility: if single-tab, use old state names
  const data = isMultiTab ? tabData[activeTab] || [] : (tabData[activeTab] || []);
  const loading = isMultiTab ? tabLoading[activeTab] || false : (tabLoading[activeTab] || false);

  // Per-tab filter hooks
  const tabFilters = useMemo(() => {
    const filters: Record<string, ReturnType<typeof useDataFilters>> = {};
    tabConfigs.forEach(tab => {
      filters[tab.key] = useDataFilters({
        data: tabData[tab.key] || [],
        searchFields: tab.filters?.searchFields || [],
        filterFn: tab.filters?.filterOptions ? (item, filter) => {
          // Apply filters based on config
          return true; // TODO: Implement filter logic
        } : undefined,
      });
    });
    return filters;
  }, [tabConfigs, tabData]);

  // Current tab's filter hook
  const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = tabFilters[activeTab] || {
    searchQuery: '',
    setSearchQuery: () => {},
    filterValue: '',
    setFilterValue: () => {},
    filteredData: []
  };

  // Per-tab wizard hooks
  const tabWizards = useMemo(() => {
    const wizards: Record<string, ReturnType<typeof useWizard>> = {};
    tabConfigs.forEach(tab => {
      wizards[tab.key] = useWizard({
        totalSteps: tab.wizard.steps.length,
        onComplete: async () => {
          try {
            const result = await tab.api.create(wizardData);
            setTabData(prev => ({
              ...prev,
              [activeTab]: [...(prev[activeTab] || []), result]
            }));
            toast.success(`${tab.label} created successfully!`);
            resetWizard();
          } catch (error) {
            toast.error(`Failed to create ${tab.label.toLowerCase()}`);
            console.error('Create error:', error);
          }
        },
        onCancel: () => {
          resetWizard();
          tab.wizard.onCancel?.();
        },
      });
    });
    return wizards;
  }, [tabConfigs, activeTab]);

  // Current tab's wizard hook
  const createWizard = tabWizards[activeTab];

  const detailsDialog = useDialog<T>();

  // Per-tab wizard data
  const [tabWizardData, setTabWizardData] = useState<Record<string, Record<string, any>>>({});

  // Load data on mount and tab change
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const loadTabData = async (tabKey: string) => {
    const tab = tabConfigs.find(t => t.key === tabKey);
    if (!tab) return;

    try {
      setTabLoading(prev => ({ ...prev, [tabKey]: true }));
      const result = await tab.api.list();
      setTabData(prev => ({ ...prev, [tabKey]: result }));
    } catch (error) {
      toast.error(`Failed to load ${tab.label.toLowerCase()}`);
      console.error('Load error:', error);
    } finally {
      setTabLoading(prev => ({ ...prev, [tabKey]: false }));
    }
  };

  const resetWizard = () => {
    const currentData = currentTabConfig?.wizard.initialData || {};
    setTabWizardData(prev => ({ ...prev, [activeTab]: currentData }));
    createWizard.reset();
  };

  // Get current wizard data
  const wizardData = tabWizardData[activeTab] || currentTabConfig?.wizard.initialData || {};

  const handleCreate = () => {
    resetWizard();
    createWizard.open();
  };

  const handleEdit = (item: T) => {
    // TODO: Implement edit functionality
    toast.info(`Edit functionality for ${currentTabConfig?.label || config.title}`);
  };

  const handleDelete = async (item: T) => {
    try {
      const id = currentTabConfig?.table.getRowId(item);
      if (id && currentTabConfig) {
        await currentTabConfig.api.delete(id);
        setTabData(prev => ({
          ...prev,
          [activeTab]: (prev[activeTab] || []).filter(i => currentTabConfig.table.getRowId(i) !== id)
        }));
        toast.success(`${currentTabConfig.label} deleted successfully!`);
      }
    } catch (error) {
      toast.error(`Failed to delete ${currentTabConfig?.label || config.title}`);
      console.error('Delete error:', error);
    }
  };

  const handleView = (item: T) => {
    detailsDialog.open(item);
  };

  // Enhanced actions with config permissions
  const enhancedActions: TableAction<T>[] = (currentTabConfig?.table.actions || []).map(action => ({
    ...action,
    onClick: (item) => {
      switch (action.label.toLowerCase()) {
        case 'edit':
          return handleEdit(item);
        case 'delete':
          return handleDelete(item);
        case 'view':
          return handleView(item);
        default:
          return action.onClick(item);
      }
    },
  }));

  // Render wizard step content
  const renderWizardStep = () => {
    const step = currentTabConfig?.wizard.steps[createWizard.currentStep - 1];
    if (!step) return null;

    return (
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        {step.title && (
          <div className="text-center">
            <h3 className="text-lg font-medium">{step.title}</h3>
            {step.description && (
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            )}
          </div>
        )}

        {step.sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4">
            {section.title && (
              <h4 className="font-medium">{section.title}</h4>
            )}

            <div className={`grid gap-4 ${section.columns === 2 ? 'grid-cols-2' : section.columns === 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {section.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {/* TODO: Render different field types */}
                  <div className="text-sm text-muted-foreground">
                    Field: {field.name} (Type: {field.type})
                  </div>

                  {field.helpText && (
                    <p className="text-xs text-muted-foreground">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render details dialog
  const renderDetailsDialog = () => {
    if (!detailsDialog.data) return null;

    return (
      <DetailsWizard
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        title={`${config.title} Details`}
        description={`Detailed information about ${detailsDialog.data.name || 'this item'}`}
        icon={config.icon}
        showFooter={false}
        size="lg"
      >
        <div className="p-4">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(detailsDialog.data, null, 2)}
          </pre>
        </div>
      </DetailsWizard>
    );
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title={config.title}
          description={config.description}
          icon={config.icon}
        />

        {/* Action Bar */}
        <ActionBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterValue={filterValue}
          onFilterChange={setFilterValue}
          filterOptions={currentTabConfig?.filters?.filterOptions}
          onRefresh={() => loadTabData(activeTab)}
          createButton={
            currentTabConfig?.permissions?.canCreate !== false && {
              label: `Create ${currentTabConfig?.label.slice(0, -1) || config.title.slice(0, -1)}`,
              onClick: handleCreate,
            }
          }
        />

        {/* Tab Navigation or Single Content */}
        {isMultiTab ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {tabConfigs.map(tab => (
                <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-2">
                  {tab.icon && <tab.icon className="w-4 h-4" />}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabConfigs.map(tab => (
              <TabsContent key={tab.key} value={tab.key} className="mt-6">
                <TabContent
                  tab={tab}
                  data={tabData[tab.key] || []}
                  loading={tabLoading[tab.key] || false}
                  filteredData={tabFilters[tab.key]?.filteredData || []}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <TabContent
            tab={currentTabConfig}
            data={data}
            loading={loading}
            filteredData={filteredData}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {/* Create Wizard */}
        <CreationWizard
          open={createWizard.isOpen}
          onOpenChange={createWizard.setIsOpen}
          title={currentTabConfig?.wizard.title || config.wizard?.title || 'Create New Item'}
          description={`Create a new ${currentTabConfig?.label.slice(0, -1).toLowerCase() || config.title.slice(0, -1).toLowerCase()}`}
          icon={currentTabConfig?.icon || config.icon}
          currentStep={createWizard.currentStep}
          totalSteps={currentTabConfig?.wizard.steps.length || config.wizard?.steps.length || 0}
          onNext={createWizard.nextStep}
          onPrevious={!createWizard.isFirstStep ? createWizard.previousStep : undefined}
          onCancel={createWizard.cancel}
          nextLabel={createWizard.isLastStep ? 'Create' : 'Next'}
          nextDisabled={false} // TODO: Add validation
          size="md"
        >
          {renderWizardStep()}
        </CreationWizard>

        {/* Details Dialog */}
        {renderDetailsDialog()}
      </div>
    </PageLayout>
  );
}