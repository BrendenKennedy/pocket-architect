import { useState } from 'react';
import { Trash2, Server, Eye, Edit2, Copy as CopyIcon, Rocket } from 'lucide-react';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { CreationWizard } from './ui/creation-wizard';
import { InstanceDetailsDialog } from './InstanceDetailsDialog';
import { toast } from 'sonner@2.0.3';
import { ProjectColorDot } from './ui/neon-dot';
import { DataTable, TableColumn, TableAction, TableRenderers } from './ui/data-table';
import { PageLayout } from './ui/page-layout';
import { PageHeader } from './ui/page-header';
import { ActionBar } from './ui/action-bar';
import { useDataFilters } from '../hooks/useDataFilters';
import { useWizard } from '../hooks/useWizard';
import { useDialog } from '../hooks/useDialog';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

const mockInstances = [
  { id: 1, name: 'prod-web-01', project: 'production-web-app', projectColor: '#A855F7', blueprint: 'Web Application Stack', status: 'running', created: '2024-11-20', instanceType: 't3.medium', ip: '10.0.1.15', publicIp: '54.123.45.67', sshEnabled: true, sshUser: 'ubuntu', sshPort: 22 },
  { id: 2, name: 'prod-web-02', project: 'production-web-app', projectColor: '#A855F7', blueprint: 'Web Application Stack', status: 'running', created: '2024-11-20', instanceType: 't3.medium', ip: '10.0.1.16', publicIp: '54.123.45.68', sshEnabled: true, sshUser: 'ubuntu', sshPort: 22 },
  { id: 3, name: 'dev-main-01', project: 'dev-environment', projectColor: '#3B82F6', blueprint: 'Development Environment', status: 'stopped', created: '2024-11-22', instanceType: 't3.small', ip: '10.1.2.10', publicIp: '54.123.45.69', sshEnabled: true, sshUser: 'ec2-user', sshPort: 22 },
  { id: 4, name: 'staging-node-01', project: 'staging-cluster', projectColor: '#10B981', blueprint: 'Kubernetes Cluster', status: 'running', created: '2024-11-21', instanceType: 't3.large', ip: '10.2.3.20', publicIp: '54.123.45.70', sshEnabled: true, sshUser: 'ubuntu', sshPort: 22 },
  { id: 5, name: 'ml-training-01', project: 'ml-pipeline', projectColor: '#F59E0B', blueprint: 'ML Compute Cluster', status: 'running', created: '2024-11-19', instanceType: 'p3.8xlarge', ip: '10.3.4.50', publicIp: '54.123.45.71', sshEnabled: true, sshUser: 'ubuntu', sshPort: 22 },
];

type Instance = typeof mockInstances[0];

export function Instances() {
  const [instances] = useState(mockInstances);
  
  // Use custom hooks for common functionality
  const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = useDataFilters({
    data: instances,
    searchFields: ['name', 'project', 'blueprint', 'instanceType'],
    filterFn: (item, filter) => item.status === filter,
  });

  const deployWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      toast.success(isEditMode ? 'Instance updated successfully!' : 'Instance deployment initiated!');
      resetWizardForm();
    },
    onCancel: () => {
      resetWizardForm();
    },
  });

  const detailsDialog = useDialog<Instance>();
  const statusDialog = useDialog();
  const { copyToClipboard } = useCopyToClipboard();

  // Wizard form state
  const [blueprint, setBlueprint] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [parentProject, setParentProject] = useState('');
  const [useSnapshot, setUseSnapshot] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const resetWizardForm = () => {
    setBlueprint('');
    setInstanceName('');
    setParentProject('');
    setUseSnapshot(false);
    setIsEditMode(false);
  };

  const handleRefresh = () => {
    toast.success('Instances refreshed');
  };

  const handleCopyField = (value: string, label: string) => {
    copyToClipboard(value, `${label} copied to clipboard!`);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getInstanceYAML = (instance: Instance) => {
    return `# Instance Configuration
apiVersion: v1
kind: Instance
metadata:
  name: ${instance.name}
  project: ${instance.project}
  blueprint: ${instance.blueprint}
  created: ${instance.created}
spec:
  compute:
    instanceType: ${instance.instanceType}
    status: ${instance.status}
  networking:
    privateIP: ${instance.ip}
    publicIP: ${instance.publicIp}
    sshEnabled: ${instance.sshEnabled}
    sshUser: ${instance.sshUser}
    sshPort: ${instance.sshPort}
  resources:
    vCPUs: 2
    memory: 4Gi
    storage: 30Gi`;
  };

  // Define table columns
  const columns: TableColumn<Instance>[] = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-[15%]',
      align: 'left' as const,
      render: (instance) => TableRenderers.withIcon(
        <Server className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
        instance.name
      ),
    },
    {
      key: 'project',
      header: 'Project',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (instance) => (
        <div className="flex gap-2">
          {TableRenderers.muted(instance.project)}
          {instance.projectColor && (
            <ProjectColorDot
              color={instance.projectColor}
              projectName={instance.project}
              size="sm"
            />
          )}
        </div>
      ),
    },
    {
      key: 'blueprint',
      header: 'Blueprint',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (instance) => TableRenderers.muted(instance.blueprint),
    },
    {
      key: 'instanceType',
      header: 'Type',
      width: 'w-[12%]',
      align: 'center' as const,
      render: (instance) => TableRenderers.badge(instance.instanceType),
    },
    {
      key: 'ip',
      header: 'IP Address',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (instance) => TableRenderers.code(instance.ip),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[10%]',
      align: 'center' as const,
      render: (instance) => TableRenderers.statusBadge(instance.status, 'sm'),
    },
    {
      key: 'created',
      header: 'Created',
      width: 'w-[12%]',
      align: 'center' as const,
      render: (instance) => <span className="text-text-secondary">{instance.created}</span>,
    },
  ];

  // Define table actions
  const actions: TableAction<Instance>[] = [
    {
      icon: CopyIcon,
      label: 'Duplicate',
      onClick: (instance) => {
        toast.info(`Duplicating instance: ${instance.name}`);
      },
      tooltip: 'Duplicate instance',
    },
    {
      icon: Eye,
      label: 'View',
      onClick: (instance) => detailsDialog.open(instance),
      tooltip: 'View instance details',
    },
    {
      icon: Edit2,
      label: 'Edit',
      onClick: (instance) => {
        toast.info(`Editing instance: ${instance.name}`);
      },
      tooltip: 'Edit instance',
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: (instance) => {
        toast.info(`Deleting instance: ${instance.name}`);
      },
      tooltip: 'Delete instance',
    },
  ];

  const filterOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'running', label: 'Running' },
    { value: 'stopped', label: 'Stopped' },
  ];

  const renderWizardStep = () => {
    switch (deployWizard.currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Parent Project</Label>
              <Select value={parentProject} onValueChange={setParentProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prod">production-web-app</SelectItem>
                  <SelectItem value="dev">dev-environment</SelectItem>
                  <SelectItem value="staging">staging-cluster</SelectItem>
                  <SelectItem value="ml">ml-pipeline</SelectItem>
                  <SelectItem value="none">No Project (Standalone)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-text-secondary">Assign this instance to an existing project for grouped management</p>
            </div>
            <div className="space-y-2">
              <Label>Select Blueprint</Label>
              <Select value={blueprint} onValueChange={setBlueprint}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a blueprint..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web Application Stack</SelectItem>
                  <SelectItem value="dev">Development Environment</SelectItem>
                  <SelectItem value="k8s">Kubernetes Cluster</SelectItem>
                  <SelectItem value="database">Database Server</SelectItem>
                  <SelectItem value="ml">ML Compute Cluster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Instance Name</Label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="prod-web-01"
              />
              <p className="text-sm text-text-secondary">Use lowercase letters, numbers, and hyphens only</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={useSnapshot}
                onCheckedChange={(checked) => setUseSnapshot(checked as boolean)}
              />
              <Label>Deploy from snapshot (optional)</Label>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Review Instance Deployment</h3>
            <Card className="bg-muted border-input p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Parent Project:</span>
                  <span>{parentProject || 'Standalone'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Blueprint:</span>
                  <span>{blueprint}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Instance Name:</span>
                  <span>{instanceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">From Snapshot:</span>
                  <span>{useSnapshot ? 'Yes' : 'No'}</span>
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
        title="Instances"
        icon={Server}
        onRefresh={handleRefresh}
      />

      <ActionBar
        onCreateClick={deployWizard.open}
        createLabel="Deploy Instance"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search instances..."
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        filterOptions={filterOptions}
      />

      <DataTable
        data={filteredData}
        columns={columns}
        actions={actions}
        getRowId={(instance) => instance.id}
      />

      {/* Deploy Instance Wizard */}
      <CreationWizard
        open={deployWizard.isOpen}
        onOpenChange={deployWizard.setIsOpen}
        title={isEditMode ? "Edit Instance" : "Deploy New Instance"}
        description="Configure and launch a new compute instance"
        icon={Rocket}
        currentStep={deployWizard.currentStep}
        totalSteps={3}
        onNext={deployWizard.nextStep}
        onPrevious={!deployWizard.isFirstStep ? deployWizard.previousStep : undefined}
        onCancel={deployWizard.cancel}
        nextLabel={deployWizard.isLastStep ? (isEditMode ? 'Update Instance' : 'Deploy Instance') : 'Next'}
        nextDisabled={deployWizard.currentStep === 1 && !blueprint}
        size="md"
      >
        {renderWizardStep()}
      </CreationWizard>

      {/* Status Dialog */}
      <Dialog open={statusDialog.isOpen} onValueChange={statusDialog.setIsOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Instance Status</DialogTitle>
            <DialogDescription>
              View the current operational status of your instances
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">CPU Usage</span>
                <span>45%</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Memory Usage</span>
                <span>62%</span>
              </div>
              <Progress value={62} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Disk Usage</span>
                <span>38%</span>
              </div>
              <Progress value={38} className="h-2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={statusDialog.close}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instance Details Dialog */}
      <InstanceDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        instance={detailsDialog.data}
        copiedField={copiedField || ''}
        onCopyField={handleCopyField}
        getInstanceYAML={getInstanceYAML}
      />
    </PageLayout>
  );
}