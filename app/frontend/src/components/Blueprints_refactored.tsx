import { useState, useEffect } from 'react';
import { Box, Eye, Trash2, Edit2, Copy } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { CreationWizard } from './ui/creation-wizard';
import { BlueprintDetailsDialog } from './BlueprintDetailsDialog';
import { toast } from 'sonner@2.0.3';
import { DataTable, TableColumn, TableAction, TableRenderers } from './ui/data-table';
import { PageLayout } from './ui/page-layout';
import { PageHeader } from './ui/page-header';
import { ActionBar } from './ui/action-bar';
import { useDataFilters } from '../hooks/useDataFilters';
import { useWizard } from '../hooks/useWizard';
import { useDialog } from '../hooks/useDialog';
import { Card } from './ui/card';
import { bridgeApi } from '../bridge/api';

interface Blueprint {
  id: number;
  name: string;
  description: string;
  useCase: string;
  category: string;
  platform: string;
  region: string;
  instanceType: string;
  storage: number;
  workloadType: string;
  created: string;
  lastModified: string;
  usageCount: number;
  tags: string[];
  securityConfigId?: number;
}

export function Blueprints() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlueprints = async () => {
      try {
        const data = await bridgeApi.listBlueprints();
        setBlueprints(data);
      } catch (error) {
        console.error('Failed to fetch blueprints:', error);
        toast.error('Failed to load blueprints');
      } finally {
        setLoading(false);
      }
    };

    fetchBlueprints();
  }, []);

  // Use custom hooks
  const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = useDataFilters({
    data: blueprints,
    searchFields: ['name', 'description', 'useCase'],
    filterFn: (item, filter) => item.category === filter,
  });

  const createWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      toast.success(isEditMode ? 'Blueprint updated successfully!' : 'Blueprint created successfully!');
      resetForm();
    },
    onCancel: () => {
      resetForm();
    },
  });

  const detailsDialog = useDialog<Blueprint>();

  // Form state
  const [bpName, setBpName] = useState('');
  const [bpDescription, setBpDescription] = useState('');
  const [bpUseCase, setBpUseCase] = useState('');
  const [bpPlatform, setBpPlatform] = useState('aws');
  const [bpRegion, setBpRegion] = useState('us-east-1');
  const [bpInstanceType, setBpInstanceType] = useState('t3.medium');
  const [bpStorage, setBpStorage] = useState('30');
  const [bpWorkloadType, setBpWorkloadType] = useState('general');
  const [isEditMode, setIsEditMode] = useState(false);

  const resetForm = () => {
    setBpName('');
    setBpDescription('');
    setBpUseCase('');
    setBpPlatform('aws');
    setBpRegion('us-east-1');
    setBpInstanceType('t3.medium');
    setBpStorage('30');
    setBpWorkloadType('general');
    setIsEditMode(false);
  };

  const handleRefresh = () => {
    toast.success('Blueprints refreshed');
  };

  // Define table columns
  const columns: TableColumn<Blueprint>[] = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-[20%]',
      align: 'left' as const,
      render: (blueprint) => TableRenderers.withIcon(
        <Box className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
        blueprint.name
      ),
    },
    {
      key: 'description',
      header: 'Description',
      width: 'w-[25%]',
      align: 'left' as const,
      render: (blueprint) => TableRenderers.muted(blueprint.description),
    },
    {
      key: 'useCase',
      header: 'Use Case',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (blueprint) => TableRenderers.badge(blueprint.useCase),
    },
    {
      key: 'platform',
      header: 'Platform',
      width: 'w-[10%]',
      align: 'center' as const,
      render: (blueprint) => TableRenderers.badge(blueprint.platform.toUpperCase()),
    },
    {
      key: 'instanceType',
      header: 'Instance Type',
      width: 'w-[12%]',
      align: 'center' as const,
      render: (blueprint) => TableRenderers.code(blueprint.instanceType),
    },
    {
      key: 'usageCount',
      header: 'Usage',
      width: 'w-[10%]',
      align: 'center' as const,
      render: (blueprint) => <span className="text-text-secondary">{blueprint.usageCount}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (blueprint) => <span className="text-text-secondary">{blueprint.created}</span>,
    },
  ];

  // Define table actions
  const actions: TableAction<Blueprint>[] = [
    {
      icon: Copy,
      label: 'Duplicate',
      onClick: (blueprint) => {
        toast.info(`Duplicating blueprint: ${blueprint.name}`);
      },
      tooltip: 'Duplicate blueprint',
    },
    {
      icon: Eye,
      label: 'View',
      onClick: (blueprint) => detailsDialog.open(blueprint),
      tooltip: 'View blueprint details',
    },
    {
      icon: Edit2,
      label: 'Edit',
      onClick: (blueprint) => {
        toast.info(`Editing blueprint: ${blueprint.name}`);
      },
      tooltip: 'Edit blueprint',
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: (blueprint) => {
        toast.info(`Deleting blueprint: ${blueprint.name}`);
      },
      tooltip: 'Delete blueprint',
    },
  ];

  const filterOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'web', label: 'Web Application' },
    { value: 'compute', label: 'Compute Intensive' },
    { value: 'database', label: 'Database' },
    { value: 'development', label: 'Development' },
  ];

  const renderWizardStep = () => {
    switch (createWizard.currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Blueprint Name</Label>
              <Input
                value={bpName}
                onChange={(e) => setBpName(e.target.value)}
                placeholder="web-app-stack"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={bpDescription}
                onChange={(e) => setBpDescription(e.target.value)}
                placeholder="Describe your blueprint..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Use Case</Label>
              <Input
                value={bpUseCase}
                onChange={(e) => setBpUseCase(e.target.value)}
                placeholder="Web Application"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={bpPlatform} onValueChange={setBpPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws">AWS</SelectItem>
                  <SelectItem value="gcp">Google Cloud Platform</SelectItem>
                  <SelectItem value="azure">Microsoft Azure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={bpRegion} onValueChange={setBpRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Instance Type</Label>
              <Select value={bpInstanceType} onValueChange={setBpInstanceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="t3.micro">t3.micro</SelectItem>
                  <SelectItem value="t3.small">t3.small</SelectItem>
                  <SelectItem value="t3.medium">t3.medium</SelectItem>
                  <SelectItem value="t3.large">t3.large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Storage (GB)</Label>
              <Input
                type="number"
                value={bpStorage}
                onChange={(e) => setBpStorage(e.target.value)}
                placeholder="30"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Review Blueprint Configuration</h3>
            <Card className="bg-muted border-input p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Name:</span>
                  <span>{bpName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Description:</span>
                  <span className="max-w-[200px] truncate">{bpDescription || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Use Case:</span>
                  <span>{bpUseCase || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Platform:</span>
                  <span>{bpPlatform.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Region:</span>
                  <span>{bpRegion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Instance Type:</span>
                  <span>{bpInstanceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Storage:</span>
                  <span>{bpStorage} GB</span>
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title="Blueprints"
        icon={Box}
        onRefresh={handleRefresh}
      />

      <ActionBar
        onCreateClick={createWizard.open}
        createLabel="Create Blueprint"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search blueprints..."
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        filterOptions={filterOptions}
      />

      <DataTable
        data={filteredData}
        columns={columns}
        actions={actions}
        getRowId={(blueprint) => blueprint.id}
        emptyState={{
          icon: Box,
          title: 'No Blueprints Yet',
          description: 'Create reusable infrastructure templates to speed up your deployments.',
          actionLabel: 'Create Blueprint',
          onAction: createWizard.open,
        }}
      />

      {/* Create Blueprint Wizard */}
      <CreationWizard
        open={createWizard.isOpen}
        onOpenChange={createWizard.setIsOpen}
        title={isEditMode ? "Edit Blueprint" : "Create New Blueprint"}
        description="Configure your blueprint settings"
        icon={Box}
        currentStep={createWizard.currentStep}
        totalSteps={3}
        onNext={createWizard.nextStep}
        onPrevious={!createWizard.isFirstStep ? createWizard.previousStep : undefined}
        onCancel={createWizard.cancel}
        nextLabel={createWizard.isLastStep ? (isEditMode ? 'Update Blueprint' : 'Create Blueprint') : 'Next'}
        nextDisabled={createWizard.currentStep === 1 && !bpName}
        size="md"
      >
        {renderWizardStep()}
      </CreationWizard>

      {/* Blueprint Details Dialog */}
      <BlueprintDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        blueprint={detailsDialog.data}
      />
    </PageLayout>
  );
}