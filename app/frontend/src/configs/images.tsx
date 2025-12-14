import { HardDrive, Eye, Trash2, Edit2, Copy } from 'lucide-react';
import { CrudPageConfig } from '../types/crud';
import { TableRenderers } from '../components/ui/data-table';
import { Image } from '../types/models';

// ============================================================================
// IMAGES CONFIGURATION
// ============================================================================

const imageColumns: CrudPageConfig<Image>['table']['columns'] = [
  {
    key: 'name',
    header: 'Name',
    width: 'w-[20%]',
    align: 'left',
    render: (image) => TableRenderers.withIcon(
      <HardDrive className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      image.name
    ),
  },
  {
    key: 'description',
    header: 'Description',
    width: 'w-[20%]',
    align: 'left',
    render: (image) => TableRenderers.muted(image.description),
  },
  {
    key: 'imageId',
    header: 'Image ID',
    width: 'w-[15%]',
    align: 'center',
    render: (image) => (
      <span className="font-mono text-sm text-muted-foreground">
        {image.imageId}
      </span>
    ),
  },
  {
    key: 'os',
    header: 'OS Version',
    width: 'w-[15%]',
    align: 'center',
    render: (image) => TableRenderers.badge(image.os),
  },
  {
    key: 'architecture',
    header: 'Architecture',
    width: 'w-[12%]',
    align: 'center',
    render: (image) => (
      <span className="text-text-secondary">
        {image.architecture}
      </span>
    ),
  },
  {
    key: 'size',
    header: 'Size',
    width: 'w-[10%]',
    align: 'center',
    render: (image) => (
      <span className="text-text-secondary">
        {image.size} GB
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: 'w-[12%]',
    align: 'center',
    render: (image) => TableRenderers.statusBadge(image.status),
  },
];

const imageActions: CrudPageConfig<Image>['table']['actions'] = [
  {
    icon: Copy,
    label: 'Copy ID',
    onClick: (image) => {
      navigator.clipboard.writeText(image.imageId);
      console.log('Copy image ID:', image.imageId);
    },
    tooltip: 'Copy image ID to clipboard',
  },
  {
    icon: Eye,
    label: 'View',
    onClick: () => {}, // Will be overridden by CrudPage
    tooltip: 'View image details',
  },
  {
    icon: Edit2,
    label: 'Edit',
    onClick: () => {
      console.log('Edit image');
    },
    tooltip: 'Edit image',
  },
  {
    icon: Trash2,
    label: 'Delete',
    onClick: () => {
      console.log('Delete image');
    },
    tooltip: 'Delete image',
  },
];

export const imagesConfig: CrudPageConfig<Image> = {
  title: 'Images',
  icon: HardDrive,
  description: 'Manage custom machine images for deploying preconfigured instances',
  api: {
    list: async () => [], // TODO: Implement bridgeApi.listImages
    create: async (data) => ({ ...data, id: Date.now() }), // TODO: Implement bridgeApi.createImage
    update: async (id, data) => ({ ...data, id }), // TODO: Implement bridgeApi.updateImage
    delete: async (id) => {}, // TODO: Implement bridgeApi.deleteImage
  },
  table: {
    columns: imageColumns,
    actions: imageActions,
    getRowId: (image) => image.id,
    emptyState: {
      title: 'No Images Available',
      description: 'Create custom machine images to quickly deploy preconfigured instances.',
      action: {
        label: 'Create Image',
        onClick: () => {}, // Will be handled by CrudPage
      },
    },
  },
  wizard: {
    title: 'Create New Image',
    steps: [
      {
        title: 'Basic Configuration',
        description: 'Configure your machine image settings',
        sections: [
          {
            fields: [
              {
                name: 'name',
                label: 'Image Name',
                type: 'text',
                required: true,
                placeholder: 'my-custom-image',
                validation: { minLength: 3, maxLength: 50 },
              },
              {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                placeholder: 'Describe this machine image...',
                validation: { maxLength: 255 },
              },
              {
                name: 'platform',
                label: 'Platform',
                type: 'select',
                required: true,
                options: [
                  { value: 'aws', label: 'AWS' },
                  { value: 'gcp', label: 'Google Cloud Platform' },
                  { value: 'azure', label: 'Microsoft Azure' },
                ],
                defaultValue: 'aws',
              },
            ],
          },
        ],
      },
      {
        title: 'Technical Configuration',
        description: 'Specify the technical details of your image',
        sections: [
          {
            fields: [
              {
                name: 'os',
                label: 'Operating System',
                type: 'select',
                required: true,
                options: [
                  { value: 'ubuntu-20.04', label: 'Ubuntu 20.04 LTS' },
                  { value: 'ubuntu-22.04', label: 'Ubuntu 22.04 LTS' },
                  { value: 'amazon-linux-2', label: 'Amazon Linux 2' },
                  { value: 'windows-2019', label: 'Windows Server 2019' },
                  { value: 'windows-2022', label: 'Windows Server 2022' },
                ],
                defaultValue: 'ubuntu-22.04',
              },
              {
                name: 'architecture',
                label: 'Architecture',
                type: 'select',
                required: true,
                options: [
                  { value: 'x86_64', label: 'x86_64' },
                  { value: 'arm64', label: 'ARM64' },
                ],
                defaultValue: 'x86_64',
              },
              {
                name: 'region',
                label: 'Region',
                type: 'select',
                required: true,
                options: [
                  { value: 'us-east-1', label: 'US East (N. Virginia)' },
                  { value: 'us-west-2', label: 'US West (Oregon)' },
                  { value: 'eu-west-1', label: 'Europe (Ireland)' },
                ],
                defaultValue: 'us-east-1',
              },
            ],
          },
        ],
      },
      {
        title: 'Source & Review',
        description: 'Specify the source instance and review your configuration',
        sections: [
          {
            fields: [
              {
                name: 'sourceInstanceId',
                label: 'Source Instance ID (Optional)',
                type: 'text',
                placeholder: 'i-1234567890abcdef0',
                helpText: 'Leave empty to create from base OS image',
              },
              {
                name: 'public',
                label: 'Make Image Public',
                type: 'checkbox',
                defaultValue: false,
                helpText: 'Public images can be used by other AWS accounts',
              },
            ],
          },
          {
            title: 'Image Summary',
            fields: [], // Summary will be shown in step content
          },
        ],
      },
    ],
    initialData: {
      platform: 'aws',
      os: 'ubuntu-22.04',
      architecture: 'x86_64',
      region: 'us-east-1',
      public: false,
    },
  },
  filters: {
    searchFields: ['name', 'description', 'imageId'],
    filterOptions: [
      {
        key: 'os',
        label: 'Operating System',
        options: [
          { value: 'all', label: 'All OS' },
          { value: 'ubuntu', label: 'Ubuntu' },
          { value: 'amazon-linux', label: 'Amazon Linux' },
          { value: 'windows', label: 'Windows' },
        ],
      },
      {
        key: 'architecture',
        label: 'Architecture',
        options: [
          { value: 'all', label: 'All Architectures' },
          { value: 'x86_64', label: 'x86_64' },
          { value: 'arm64', label: 'ARM64' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'all', label: 'All Statuses' },
          { value: 'available', label: 'Available' },
          { value: 'pending', label: 'Pending' },
          { value: 'failed', label: 'Failed' },
        ],
      },
    ],
  },
  permissions: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
};