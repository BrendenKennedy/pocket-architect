import { useState, useEffect } from 'react';
import { HardDrive, Eye, Trash2, Edit2, Copy } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { CreationWizard } from './ui/creation-wizard';
import { ImageDetailsDialog } from './ImageDetailsDialog';
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

interface Image {
  id: number;
  name: string;
  description: string;
  imageId: string;
  platform: string;
  region: string;
  os: string;
  architecture: string;
  size: number;
  created: string;
  lastModified: string;
  status: string;
  tags: string[];
  public: boolean;
  sourceInstanceId?: number;
}

export function Images() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Implement image fetching when backend bridge supports it
    setImages([]);
    setLoading(false);
  }, []);

  // Use custom hooks
  const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = useDataFilters({
    data: images,
    searchFields: ['name', 'description', 'osVersion'],
    filterFn: (item, filter) => item.osType === filter,
  });

  const createWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      toast.success('Image created successfully!');
      resetForm();
    },
    onCancel: () => {
      resetForm();
    },
  });

  const detailsDialog = useDialog<Image>();

  // Form state
  const [imageName, setImageName] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [imagePlatform, setImagePlatform] = useState('aws');
  const [imageRegion, setImageRegion] = useState('us-east-1');
  const [imageOsType, setImageOsType] = useState('Linux');
  const [imageOsVersion, setImageOsVersion] = useState('');
  const [imageArchitecture, setImageArchitecture] = useState('x86_64');

  const resetForm = () => {
    setImageName('');
    setImageDescription('');
    setImagePlatform('aws');
    setImageRegion('us-east-1');
    setImageOsType('Linux');
    setImageOsVersion('');
    setImageArchitecture('x86_64');
  };

  const handleRefresh = () => {
    toast.success('Images refreshed');
  };

  // Define table columns
  const columns: TableColumn<Image>[] = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-[20%]',
      align: 'left' as const,
      render: (image) => TableRenderers.withIcon(
        <HardDrive className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
        image.name
      ),
    },
    {
      key: 'description',
      header: 'Description',
      width: 'w-[20%]',
      align: 'left' as const,
      render: (image) => TableRenderers.muted(image.description),
    },
    {
      key: 'imageId',
      header: 'Image ID',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (image) => TableRenderers.code(image.imageId),
    },
    {
      key: 'osVersion',
      header: 'OS Version',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (image) => TableRenderers.badge(image.osVersion),
    },
    {
      key: 'architecture',
      header: 'Architecture',
      width: 'w-[12%]',
      align: 'center' as const,
      render: (image) => <span className="text-text-secondary">{image.architecture}</span>,
    },
    {
      key: 'size',
      header: 'Size',
      width: 'w-[10%]',
      align: 'center' as const,
      render: (image) => <span className="text-text-secondary">{image.size} GB</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[12%]',
      align: 'center' as const,
      render: (image) => TableRenderers.statusBadge(image.status, 'sm'),
    },
  ];

  // Define table actions
  const actions: TableAction<Image>[] = [
    {
      icon: Copy,
      label: 'Copy ID',
      onClick: (image) => {
        navigator.clipboard.writeText(image.imageId);
        toast.success('Image ID copied to clipboard!');
      },
      tooltip: 'Copy image ID',
    },
    {
      icon: Eye,
      label: 'View',
      onClick: (image) => detailsDialog.open(image),
      tooltip: 'View image details',
    },
    {
      icon: Edit2,
      label: 'Edit',
      onClick: (image) => {
        toast.info(`Editing image: ${image.name}`);
      },
      tooltip: 'Edit image',
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: (image) => {
        toast.info(`Deleting image: ${image.name}`);
      },
      tooltip: 'Delete image',
    },
  ];

  const filterOptions = [
    { value: 'all', label: 'All OS Types' },
    { value: 'Linux', label: 'Linux' },
    { value: 'Windows', label: 'Windows' },
  ];

  const renderWizardStep = () => {
    switch (createWizard.currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Image Name</Label>
              <Input
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                placeholder="ubuntu-22.04-lts"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                placeholder="Describe your image..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={imagePlatform} onValueChange={setImagePlatform}>
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
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>OS Type</Label>
              <Select value={imageOsType} onValueChange={setImageOsType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Linux">Linux</SelectItem>
                  <SelectItem value="Windows">Windows</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>OS Version</Label>
              <Input
                value={imageOsVersion}
                onChange={(e) => setImageOsVersion(e.target.value)}
                placeholder="Ubuntu 22.04"
              />
            </div>
            <div className="space-y-2">
              <Label>Architecture</Label>
              <Select value={imageArchitecture} onValueChange={setImageArchitecture}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="x86_64">x86_64</SelectItem>
                  <SelectItem value="arm64">ARM64</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={imageRegion} onValueChange={setImageRegion}>
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
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Review Image Configuration</h3>
            <Card className="bg-muted border-input p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Name:</span>
                  <span>{imageName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Description:</span>
                  <span className="max-w-[200px] truncate">{imageDescription || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Platform:</span>
                  <span>{imagePlatform.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">OS Type:</span>
                  <span>{imageOsType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">OS Version:</span>
                  <span>{imageOsVersion || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Architecture:</span>
                  <span>{imageArchitecture}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Region:</span>
                  <span>{imageRegion}</span>
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
        title="Images"
        icon={HardDrive}
        onRefresh={handleRefresh}
      />

      <ActionBar
        onCreateClick={createWizard.open}
        createLabel="Create Image"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search images..."
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        filterOptions={filterOptions}
      />

      <DataTable
        data={filteredData}
        columns={columns}
        actions={actions}
        getRowId={(image) => image.id}
      />

      {/* Create Image Wizard */}
      <CreationWizard
        open={createWizard.isOpen}
        onOpenChange={createWizard.setIsOpen}
        title="Create New Image"
        description="Configure your image settings"
        icon={HardDrive}
        currentStep={createWizard.currentStep}
        totalSteps={3}
        onNext={createWizard.nextStep}
        onPrevious={!createWizard.isFirstStep ? createWizard.previousStep : undefined}
        onCancel={createWizard.cancel}
        nextLabel={createWizard.isLastStep ? 'Create Image' : 'Next'}
        nextDisabled={createWizard.currentStep === 1 && !imageName}
        size="md"
      >
        {renderWizardStep()}
      </CreationWizard>

      {/* Image Details Dialog */}
      <ImageDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        image={detailsDialog.data}
      />
    </PageLayout>
  );
}