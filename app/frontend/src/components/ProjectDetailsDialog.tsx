import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Copy, Check, Server, DollarSign, Eye, Edit2, Trash2, Play, Square } from 'lucide-react';
import { Card } from './ui/card';
import { DetailsWizard } from './ui/details-wizard';
import { DataTable, TableColumn, TableAction, TableRenderers } from './ui/data-table';
import { CreationWizard } from './ui/creation-wizard';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { useWizard } from '../hooks/useWizard';

interface ProjectDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
  copiedField: string;
  onCopyField: (value: string, label: string) => void;
}

type Instance = {
  id: string;
  name: string;
  type: string;
  status: string;
  ip: string;
  blueprint: string;
};

const mockBlueprints = [
  { value: 'web-server-v2', label: 'Web Server v2 - Ubuntu 22.04 + Nginx' },
  { value: 'ml-training-v3', label: 'ML Training v3 - GPU Optimized' },
  { value: 'postgresql-v1', label: 'PostgreSQL v1 - Database Server' },
  { value: 'redis-v1', label: 'Redis v1 - Cache Server' },
  { value: 'jupyter-v2', label: 'Jupyter v2 - Data Science Notebook' },
];

const instanceTypes = [
  { value: 't3.small', label: 't3.small - 2 vCPU, 2GB RAM' },
  { value: 't3.medium', label: 't3.medium - 2 vCPU, 4GB RAM' },
  { value: 't3.large', label: 't3.large - 2 vCPU, 8GB RAM' },
  { value: 't3.xlarge', label: 't3.xlarge - 4 vCPU, 16GB RAM' },
  { value: 'r5.xlarge', label: 'r5.xlarge - 4 vCPU, 32GB RAM (Memory Optimized)' },
  { value: 'p3.2xlarge', label: 'p3.2xlarge - 8 vCPU, 61GB RAM, 1x V100 GPU' },
];

export function ProjectDetailsDialog({
  open,
  onOpenChange,
  project,
  copiedField,
  onCopyField
}: ProjectDetailsDialogProps) {
  const [instances, setInstances] = useState<Instance[]>(project?.instances || []);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  
  // Instance creation wizard
  const createInstanceWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      if (isEditMode && editingInstanceId) {
        // Update existing instance
        setInstances(instances.map(i => 
          i.id === editingInstanceId 
            ? {
                ...i,
                name: instanceName,
                type: instanceType,
                blueprint: instanceBlueprint,
              }
            : i
        ));
        toast.success(`Instance ${instanceName} updated successfully!`);
      } else {
        // Create new instance
        const newInstance: Instance = {
          id: `i-${Math.random().toString(36).substr(2, 9)}`,
          name: instanceName,
          type: instanceType,
          status: 'running',
          ip: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          blueprint: instanceBlueprint,
        };
        setInstances([...instances, newInstance]);
        toast.success(`Instance ${instanceName} created successfully!`);
      }
      resetInstanceForm();
    },
    onCancel: () => {
      resetInstanceForm();
    },
  });

  // Instance form state
  const [instanceName, setInstanceName] = useState('');
  const [instanceBlueprint, setInstanceBlueprint] = useState('web-server-v2');
  const [instanceType, setInstanceType] = useState('t3.medium');
  const [instanceStorage, setInstanceStorage] = useState('50');

  const resetInstanceForm = () => {
    setInstanceName('');
    setInstanceBlueprint('web-server-v2');
    setInstanceType('t3.medium');
    setInstanceStorage('50');
    setIsEditMode(false);
    setEditingInstanceId(null);
  };

  const handleEditInstance = (instance: Instance) => {
    toast.info(`Opening edit wizard for ${instance.name}`);
    setIsEditMode(true);
    setEditingInstanceId(instance.id);
    setInstanceName(instance.name);
    setInstanceBlueprint(instance.blueprint);
    setInstanceType(instance.type);
    setInstanceStorage('50'); // Default value since we don't store this
    createInstanceWizard.open();
  };

  if (!project) return null;

  const runningInstances = instances.filter((i: any) => i.status === 'running').length;
  const stoppedInstances = instances.filter((i: any) => i.status === 'stopped').length;

  // Define instance table columns
  const instanceColumns: TableColumn<Instance>[] = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-[25%]',
      align: 'left' as const,
      render: (instance) => TableRenderers.withIcon(
        <Server className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
        instance.name
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (instance) => TableRenderers.code(instance.type),
    },
    {
      key: 'ip',
      header: 'Private IP',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (instance) => <span className="font-mono text-sm text-muted-foreground">{instance.ip}</span>,
    },
    {
      key: 'blueprint',
      header: 'Blueprint',
      width: 'w-[20%]',
      align: 'center' as const,
      render: (instance) => TableRenderers.muted(instance.blueprint),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (instance) => TableRenderers.statusBadge(instance.status, 'sm'),
    },
  ];

  // Define instance table actions
  const instanceActions: TableAction<Instance>[] = [
    {
      icon: Play,
      label: 'Start',
      onClick: (instance) => {
        if (instance.status === 'stopped') {
          setInstances(instances.map(i => i.id === instance.id ? { ...i, status: 'running' } : i));
          toast.success(`Instance ${instance.name} started`);
        }
      },
      tooltip: 'Start instance',
      condition: (instance) => instance.status === 'stopped',
    },
    {
      icon: Square,
      label: 'Stop',
      onClick: (instance) => {
        if (instance.status === 'running') {
          setInstances(instances.map(i => i.id === instance.id ? { ...i, status: 'stopped' } : i));
          toast.success(`Instance ${instance.name} stopped`);
        }
      },
      tooltip: 'Stop instance',
      condition: (instance) => instance.status === 'running',
    },
    {
      icon: Eye,
      label: 'View',
      onClick: (instance) => {
        toast.info(`Viewing details for ${instance.name}`);
      },
      tooltip: 'View instance details',
    },
    {
      icon: Edit2,
      label: 'Edit',
      onClick: handleEditInstance,
      tooltip: 'Edit instance',
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: (instance) => {
        setInstances(instances.filter(i => i.id !== instance.id));
        toast.success(`Instance ${instance.name} deleted`);
      },
      tooltip: 'Delete instance',
    },
  ];

  const renderInstanceWizardStep = () => {
    switch (createInstanceWizard.currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Instance Name</Label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="my-instance-01"
              />
              <p className="text-sm text-muted-foreground">Use lowercase letters, numbers, and hyphens only</p>
            </div>
            <div className="space-y-2">
              <Label>Blueprint</Label>
              <Select value={instanceBlueprint} onValueChange={setInstanceBlueprint}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockBlueprints.map((bp) => (
                    <SelectItem key={bp.value} value={bp.value}>
                      {bp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Pre-configured server template</p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Instance Type</Label>
              <Select value={instanceType} onValueChange={setInstanceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {instanceTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Storage (GB)</Label>
              <Input
                type="number"
                value={instanceStorage}
                onChange={(e) => setInstanceStorage(e.target.value)}
                placeholder="50"
              />
              <p className="text-sm text-muted-foreground">Root volume size in GB</p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Review Instance Configuration</h3>
            <Card className="bg-muted border-input p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instance Name:</span>
                  <span>{instanceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blueprint:</span>
                  <span>{mockBlueprints.find(b => b.value === instanceBlueprint)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instance Type:</span>
                  <span>{instanceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage:</span>
                  <span>{instanceStorage} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project:</span>
                  <span>{project.name}</span>
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <>
      <DetailsWizard
        open={open}
        onOpenChange={onOpenChange}
        title={project.name}
        description={`Detailed information about the ${project.name} project`}
        icon={Server}
        showFooter={false}
        size="xl"
      >
        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="instances">Instances</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 overflow-y-auto pr-2 space-y-4">
            <Card className="bg-muted border-border p-4">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-muted-foreground mb-1">Project Name</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{project.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => onCopyField(project.name, 'Project Name')}
                      >
                        {copiedField === 'Project Name' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Status</div>
                    <Badge 
                      variant={project.status === 'healthy' ? 'default' : 'secondary'}
                      className={
                        project.status === 'healthy' 
                          ? 'bg-green-500/20 text-green-500 hover:bg-green-500/20' 
                          : project.status === 'degraded'
                          ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20'
                          : 'bg-red-500/20 text-red-500 hover:bg-red-500/20'
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Description</div>
                  <div>{project.description}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-muted-foreground mb-1">Platform</div>
                    <div className="font-mono uppercase">{project.platform}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Region</div>
                    <div className="font-mono">{project.region}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-muted-foreground mb-1">Created</div>
                    <div>{project.created}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Last Modified</div>
                    <div>{project.lastModified}</div>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Instances Tab */}
          <TabsContent value="instances" className="flex-1 overflow-y-auto pr-2 space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-background/50 border-border p-4">
                <div className="text-2xl mb-1">{instances.length}</div>
                <div className="text-xs text-muted-foreground">Total Instances</div>
              </Card>
              <Card className="bg-green-500/10 border-green-500/30 p-4">
                <div className="text-2xl text-green-500 mb-1">{runningInstances}</div>
                <div className="text-xs text-muted-foreground">Running</div>
              </Card>
              <Card className="bg-muted/50 border-border p-4">
                <div className="text-2xl mb-1">{stoppedInstances}</div>
                <div className="text-xs text-muted-foreground">Stopped</div>
              </Card>
            </div>

            {/* Create Instance Button */}
            <div className="flex justify-end">
              <Button onClick={createInstanceWizard.open} size="sm" className="gap-2">
                <Server className="w-4 h-4" />
                Create Instance from Blueprint
              </Button>
            </div>

            {/* Instances Table */}
            <DataTable
              data={instances}
              columns={instanceColumns}
              actions={instanceActions}
              getRowId={(instance) => instance.id}
            />
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs" className="flex-1 overflow-y-auto pr-2 space-y-4">
            <Card className="bg-muted border-border p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <div className="text-xs text-muted-foreground">Month to Date</div>
                    </div>
                    <div className="text-2xl">${project.costMonthToDate.toFixed(2)}</div>
                  </div>
                  <div className="bg-background/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <div className="text-xs text-muted-foreground">Monthly Budget</div>
                    </div>
                    <div className="text-2xl">${project.monthlyCost.toFixed(2)}</div>
                  </div>
                </div>

                <div className="bg-background/50 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <div className="text-xs text-muted-foreground">Lifetime Cost</div>
                  </div>
                  <div className="text-2xl">${project.costLifetime.toFixed(2)}</div>
                </div>

                <div className="bg-background/50 border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground">Budget Usage</div>
                    <div className="text-xs">{((project.costMonthToDate / project.costLimit) * 100).toFixed(1)}%</div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${Math.min((project.costMonthToDate / project.costLimit) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Budget Limit: ${project.costLimit.toFixed(2)}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="flex-1 overflow-y-auto pr-2 space-y-4">
            <Card className="bg-muted border-border p-4">
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">VPC</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{project.vpc}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => onCopyField(project.vpc, 'VPC')}
                    >
                      {copiedField === 'VPC' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Network Info</div>
                  <div className="bg-background/30 border border-border rounded p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Instances:</span>
                      <span>{instances.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Running Instances:</span>
                      <span className="text-green-500">{runningInstances}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stopped Instances:</span>
                      <span>{stoppedInstances}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="flex-1 overflow-y-auto pr-2 space-y-4">
            <Card className="bg-muted border-border p-4">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-muted-foreground mb-1">Project ID</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{project.id}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => onCopyField(project.id.toString(), 'Project ID')}
                      >
                        {copiedField === 'Project ID' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Uptime</div>
                    <div>{project.uptimeDays} days</div>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Platform Details</div>
                  <div className="bg-background/30 border border-border rounded p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider:</span>
                      <span className="uppercase font-mono">{project.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region:</span>
                      <span className="font-mono">{project.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VPC:</span>
                      <span className="font-mono">{project.vpc}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Timestamps</div>
                  <div className="bg-background/30 border border-border rounded p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{project.created}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Modified:</span>
                      <span>{project.lastModified}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DetailsWizard>

      {/* Create Instance Wizard */}
      <CreationWizard
        open={createInstanceWizard.isOpen}
        onOpenChange={createInstanceWizard.setIsOpen}
        title={isEditMode ? "Edit Instance" : "Create New Instance"}
        description={isEditMode ? `Update instance configuration in ${project.name}` : `Create a new instance in ${project.name}`}
        icon={Server}
        currentStep={createInstanceWizard.currentStep}
        totalSteps={3}
        onNext={createInstanceWizard.nextStep}
        onPrevious={!createInstanceWizard.isFirstStep ? createInstanceWizard.previousStep : undefined}
        onCancel={createInstanceWizard.cancel}
        nextLabel={createInstanceWizard.isLastStep ? (isEditMode ? 'Update Instance' : 'Create Instance') : 'Next'}
        nextDisabled={createInstanceWizard.currentStep === 1 && !instanceName}
        size="md"
      >
        {renderInstanceWizardStep()}
      </CreationWizard>
    </>
  );
}