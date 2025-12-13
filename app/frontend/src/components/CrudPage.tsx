import React, { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { LucideIcon, Plus } from 'lucide-react';

// UI Components
import { DataTable, TableColumn, TableAction } from './ui/data-table';
import { ActionBar } from './ui/action-bar';
import { PageHeader } from './ui/page-header';
import { PageLayout } from './ui/page-layout';
import { CreationWizard } from './ui/creation-wizard';
import { DetailsWizard } from './ui/details-wizard';
import { Card } from './ui/card';
import { Button } from './ui/button';

// Hooks
import { useDataFilters } from '../hooks/useDataFilters';
import { useWizard } from '../hooks/useWizard';
import { useDialog } from '../hooks/useDialog';

// Types
import { CrudPageConfig, CrudState } from '../types/crud';

interface CrudPageProps<T> {
  config: CrudPageConfig<T>;
}

export function CrudPage<T extends Record<string, any>>({
  config
}: CrudPageProps<T>) {
  // State management
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom hooks
  const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = useDataFilters({
    data,
    searchFields: config.filters?.searchFields || [],
    filterFn: config.filters?.filterOptions ? (item, filter) => {
      // Apply filters based on config
      return true; // TODO: Implement filter logic
    } : undefined,
  });

  const createWizard = useWizard({
    totalSteps: config.wizard.steps.length,
    onComplete: async () => {
      try {
        const result = await config.api.create(wizardData);
        setData(prev => [...prev, result]);
        toast.success(`${config.title} created successfully!`);
        resetWizard();
      } catch (error) {
        toast.error(`Failed to create ${config.title.toLowerCase()}`);
        console.error('Create error:', error);
      }
    },
    onCancel: () => {
      resetWizard();
      config.wizard.onCancel?.();
    },
  });

  const detailsDialog = useDialog<T>();

  // Wizard form state
  const [wizardData, setWizardData] = useState<Record<string, any>>(config.wizard.initialData || {});

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await config.api.list();
      setData(result);
    } catch (error) {
      toast.error(`Failed to load ${config.title.toLowerCase()}`);
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setWizardData(config.wizard.initialData || {});
    createWizard.reset();
  };

  const handleCreate = () => {
    resetWizard();
    createWizard.open();
  };

  const handleEdit = (item: T) => {
    // TODO: Implement edit functionality
    toast.info(`Edit functionality for ${config.title.toLowerCase()}`);
  };

  const handleDelete = async (item: T) => {
    try {
      const id = config.table.getRowId(item);
      await config.api.delete(id);
      setData(prev => prev.filter(i => config.table.getRowId(i) !== id));
      toast.success(`${config.title} deleted successfully!`);
    } catch (error) {
      toast.error(`Failed to delete ${config.title.toLowerCase()}`);
      console.error('Delete error:', error);
    }
  };

  const handleView = (item: T) => {
    detailsDialog.open(item);
  };

  // Enhanced actions with config permissions
  const enhancedActions: TableAction<T>[] = config.table.actions.map(action => ({
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
    const step = config.wizard.steps[createWizard.currentStep - 1];
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
          filterOptions={config.filters?.filterOptions}
          onRefresh={loadData}
          createButton={
            config.permissions?.canCreate !== false && {
              label: `Create ${config.title.slice(0, -1)}`,
              onClick: handleCreate,
            }
          }
        />

        {/* Data Table */}
        <DataTable
          data={filteredData}
          columns={config.table.columns}
          actions={enhancedActions}
          getRowId={config.table.getRowId}
          loading={loading}
        />

        {/* Empty State */}
        {!loading && filteredData.length === 0 && config.table.emptyState && (
          <Card className="bg-card border-border">
            <div className="py-24 text-center">
              <config.icon className="size-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{config.table.emptyState.title}</h3>
              {config.table.emptyState.description && (
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">{config.table.emptyState.description}</p>
              )}
              {config.table.emptyState.action && (
                <Button
                  onClick={config.table.emptyState.action.onClick}
                  size="lg"
                  className="gap-2"
                >
                  <Plus className="size-5" />
                  {config.table.emptyState.action.label}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Create Wizard */}
        <CreationWizard
          open={createWizard.isOpen}
          onOpenChange={createWizard.setIsOpen}
          title={config.wizard.title}
          description={`Create a new ${config.title.slice(0, -1).toLowerCase()}`}
          icon={config.icon}
          currentStep={createWizard.currentStep}
          totalSteps={config.wizard.steps.length}
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