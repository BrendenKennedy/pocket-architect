import { useState, useEffect } from 'react';
import { FolderOpen, Eye, Trash2, Edit2, Copy, Plus } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { CreationWizard } from './ui/creation-wizard';
import { ProjectDetailsDialog } from './ProjectDetailsDialog';
import { toast } from 'sonner@2.0.3';
import { ProjectColorDot } from './ui/neon-dot';
import { DataTable, TableColumn, TableAction, TableRenderers } from './ui/data-table';
import { PageLayout } from './ui/page-layout';
import { PageHeader } from './ui/page-header';
import { ActionBar } from './ui/action-bar';
import { useDataFilters } from '../hooks/useDataFilters';
import { useWizard } from '../hooks/useWizard';
import { useDialog } from '../hooks/useDialog';
import { Card } from './ui/card';
import { bridgeApi } from '../bridge/api';

// AWS Regions - Keep this data as-is (omitted for brevity)
const awsRegions = [
  { value: 'us-east-1', label: 'US East (N. Virginia) - us-east-1' },
  { value: 'us-west-2', label: 'US West (Oregon) - us-west-2' },
  // ... rest of regions
];

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  instanceCount: number;
  color: string;
  instances: number[]; // Array of instance IDs
  created: string;
  monthlyCost: number;
  vpc: string;
  platform: string;
  region: string;
  lastModified: string;
  tags: string[];
  costMonthToDate: number;
  costLifetime: number;
  costLimit: number;
  uptimeDays: number;
}

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await bridgeApi.listProjects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);
  
  // Use custom hooks
  const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = useDataFilters({
    data: projects,
    searchFields: ['name', 'description', 'vpc'],
    filterFn: (item, filter) => item.status === filter,
  });

  const createWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      toast.success(isEditMode ? 'Project updated successfully!' : 'Project created successfully!');
      resetForm();
    },
    onCancel: () => {
      resetForm();
    },
  });

  const detailsDialog = useDialog<Project>();

  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectPlatform, setProjectPlatform] = useState('aws');
  const [projectRegion, setProjectRegion] = useState('us-east-1');
  const [projectVpc, setProjectVpc] = useState('new');
  const [projectCostLimit, setProjectCostLimit] = useState('');
  const [projectColor, setProjectColor] = useState('#A855F7');
  const [isEditMode, setIsEditMode] = useState(false);

  const resetForm = () => {
    setProjectName('');
    setProjectDescription('');
    setProjectPlatform('aws');
    setProjectRegion('us-east-1');
    setProjectVpc('new');
    setProjectCostLimit('');
    setProjectColor('#A855F7');
    setIsEditMode(false);
  };

  const handleRefresh = () => {
    toast.success('Projects refreshed');
  };

  const handleTerminate = () => {
    toast.info('Terminate functionality');
  };

  const handleCopyField = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleEditProject = (project: Project) => {
    setIsEditMode(true);
    setProjectName(project.name);
    setProjectDescription(project.description);
    setProjectPlatform(project.platform);
    setProjectRegion(project.region);
    setProjectVpc(project.vpc.includes('new') ? 'new' : 'existing');
    setProjectCostLimit(project.costLimit.toString());
    setProjectColor(project.color);
    createWizard.open();
  };

  // Define table columns
  const columns: TableColumn<Project>[] = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-[20%]',
      align: 'left' as const,
      render: (project) => (
        <div className="flex items-center gap-2">
          {TableRenderers.withIcon(
            <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
            project.name
          )}
          {project.color && (
            <ProjectColorDot
              color={project.color}
              projectName={project.name}
              size="sm"
            />
          )}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      width: 'w-[25%]',
      align: 'left' as const,
      render: (project) => TableRenderers.muted(project.description),
    },
    {
      key: 'platform',
      header: 'Platform',
      width: 'w-[10%]',
      align: 'center' as const,
      render: (project) => TableRenderers.badge(project.platform.toUpperCase()),
    },
    {
      key: 'region',
      header: 'Region',
      width: 'w-[12%]',
      align: 'center' as const,
      render: (project) => TableRenderers.code(project.region),
    },
    {
      key: 'instanceCount',
      label: 'Instances',
      align: 'center' as const,
      render: (project) => <span className="text-muted-foreground">{project.instanceCount}</span>,
    },
    {
      key: 'monthlyCost',
      header: 'Monthly Cost',
      width: 'w-[10%]',
      align: 'center' as const,
      render: (project) => <span className="text-muted-foreground">${project.monthlyCost.toFixed(2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[10%]',
      align: 'center' as const,
      render: (project) => TableRenderers.statusBadge(project.status, 'sm'),
    },
  ];

  // Define table actions
  const actions: TableAction<Project>[] = [
    {
      icon: Copy,
      label: 'Clone',
      onClick: (project) => {
        toast.info(`Cloning project: ${project.name}`);
      },
      tooltip: 'Clone project',
    },
    {
      icon: Eye,
      label: 'View',
      onClick: (project) => detailsDialog.open(project),
      tooltip: 'View project details',
    },
    {
      icon: Edit2,
      label: 'Edit',
      onClick: handleEditProject,
      tooltip: 'Edit project',
    },
    {
      icon: Trash2,
      label: 'Terminate',
      onClick: (project) => {
        toast.info(`Terminating project: ${project.name}`);
      },
      tooltip: 'Terminate project',
    },
  ];

  const filterOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'healthy', label: 'Healthy' },
    { value: 'degraded', label: 'Degraded' },
    { value: 'offline', label: 'Offline' },
  ];

  const renderWizardStep = () => {
    switch (createWizard.currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-project"
              />
              <p className="text-sm text-muted-foreground">Use lowercase letters, numbers, and hyphens only</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe your project..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Project Color</Label>
              <div className="flex gap-2">
                {['#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      projectColor === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setProjectColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={projectPlatform} onValueChange={setProjectPlatform}>
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
              <Select value={projectRegion} onValueChange={setProjectRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {awsRegions.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>VPC Configuration</Label>
              <Select value={projectVpc} onValueChange={setProjectVpc}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Create New VPC</SelectItem>
                  <SelectItem value="existing">Use Existing VPC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Review Project Configuration</h3>
            <Card className="bg-muted border-input p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Name:</span>
                  <span>{projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span className="max-w-[200px] truncate">{projectDescription || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span>{projectPlatform.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region:</span>
                  <span>{projectRegion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VPC:</span>
                  <span>{projectVpc === 'new' ? 'New VPC' : 'Existing VPC'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Color:</span>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: projectColor }} />
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
        title="Projects"
        icon={FolderOpen}
        onRefresh={handleRefresh}
      />

      <ActionBar
        onCreateClick={createWizard.open}
        createLabel="Create Project"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search projects..."
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        filterOptions={filterOptions}
      />

      <DataTable
        data={filteredData}
        columns={columns}
        actions={actions}
        getRowId={(project) => project.id}
        emptyState={{
          icon: FolderOpen,
          title: 'No Projects Yet',
          description: 'Get started by creating your first project to organize and manage your infrastructure.',
          actionLabel: 'Create Project',
          onAction: createWizard.open,
        }}
      />

      {/* Create Project Wizard */}
      <CreationWizard
        open={createWizard.isOpen}
        onOpenChange={createWizard.setIsOpen}
        title={isEditMode ? "Edit Project" : "Create New Project"}
        description="Configure your project settings"
        icon={FolderOpen}
        currentStep={createWizard.currentStep}
        totalSteps={3}
        onNext={createWizard.nextStep}
        onPrevious={!createWizard.isFirstStep ? createWizard.previousStep : undefined}
        onCancel={createWizard.cancel}
        nextLabel={createWizard.isLastStep ? (isEditMode ? 'Update Project' : 'Create Project') : 'Next'}
        nextDisabled={createWizard.currentStep === 1 && !projectName}
        size="md"
      >
        {renderWizardStep()}
      </CreationWizard>

      {/* Project Details Dialog */}
      <ProjectDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        project={detailsDialog.data}
        copiedField={copiedField}
        onCopyField={handleCopyField}
      />
    </PageLayout>
  );
}