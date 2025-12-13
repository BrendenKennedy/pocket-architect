import { Box, Eye, Trash2, Edit2, Copy } from 'lucide-react';
import { bridgeApi } from '../bridge/api';
import { CrudPageConfig, TableColumn, TableAction } from '../types/crud';
import { TableRenderers } from '../components/ui/data-table';
import { Blueprint } from '../types/models';

// Table columns configuration
const columns: TableColumn<Blueprint>[] = [
  {
    key: 'name',
    header: 'Name',
    width: 'w-[20%]',
    align: 'left',
    render: (blueprint) => TableRenderers.withIcon(
      <Box className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      blueprint.name
    ),
  },
  {
    key: 'description',
    header: 'Description',
    width: 'w-[25%]',
    align: 'left',
    render: (blueprint) => TableRenderers.muted(blueprint.description),
  },
  {
    key: 'useCase',
    header: 'Use Case',
    width: 'w-[15%]',
    align: 'center',
    render: (blueprint) => TableRenderers.badge(blueprint.useCase),
  },
  {
    key: 'platform',
    header: 'Platform',
    width: 'w-[10%]',
    align: 'center',
    render: (blueprint) => TableRenderers.badge(blueprint.platform.toUpperCase()),
  },
  {
    key: 'instanceType',
    header: 'Instance Type',
    width: 'w-[12%]',
    align: 'center',
    render: (blueprint) => TableRenderers.code(blueprint.instanceType),
  },
  {
    key: 'usageCount',
    header: 'Usage',
    width: 'w-[10%]',
    align: 'center',
    render: (blueprint) => <span className="text-text-secondary">{blueprint.usageCount}</span>,
  },
  {
    key: 'created',
    header: 'Created',
    width: 'w-[15%]',
    align: 'center',
    render: (blueprint) => <span className="text-text-secondary">{blueprint.created}</span>,
  },
];

// Table actions configuration
const actions: TableAction<Blueprint>[] = [
  {
    icon: Copy,
    label: 'Duplicate',
    onClick: (blueprint) => {
      // TODO: Implement duplicate functionality
      console.log(`Duplicating blueprint: ${blueprint.name}`);
    },
    tooltip: 'Duplicate blueprint',
  },
  {
    icon: Eye,
    label: 'View',
    onClick: (blueprint) => {
      // This will be handled by CrudPage
    },
    tooltip: 'View blueprint details',
  },
  {
    icon: Edit2,
    label: 'Edit',
    onClick: (blueprint) => {
      // TODO: Implement edit functionality
      console.log(`Editing blueprint: ${blueprint.name}`);
    },
    tooltip: 'Edit blueprint',
  },
  {
    icon: Trash2,
    label: 'Delete',
    onClick: (blueprint) => {
      // TODO: Implement delete functionality
      console.log(`Deleting blueprint: ${blueprint.name}`);
    },
    tooltip: 'Delete blueprint',
  },
];

// Filter options
const filterOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'web', label: 'Web Application' },
  { value: 'compute', label: 'Compute Intensive' },
  { value: 'database', label: 'Database' },
  { value: 'development', label: 'Development' },
];

// Wizard steps configuration
const wizardSteps = [
  {
    title: 'Basic Information',
    description: 'Provide basic details for your blueprint',
    sections: [
      {
        fields: [
          {
            name: 'name',
            label: 'Blueprint Name',
            type: 'text',
            required: true,
            placeholder: 'web-app-stack',
            validation: {
              minLength: 3,
              maxLength: 50,
            },
          },
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
            placeholder: 'Describe your blueprint...',
            validation: {
              maxLength: 500,
            },
          },
          {
            name: 'useCase',
            label: 'Use Case',
            type: 'text',
            placeholder: 'Web Application',
          },
        ],
      },
    ],
  },
  {
    title: 'Infrastructure Configuration',
    description: 'Configure the infrastructure settings',
    sections: [
      {
        fields: [
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
          {
            name: 'instanceType',
            label: 'Instance Type',
            type: 'select',
            required: true,
            options: [
              { value: 't3.micro', label: 't3.micro' },
              { value: 't3.small', label: 't3.small' },
              { value: 't3.medium', label: 't3.medium' },
              { value: 't3.large', label: 't3.large' },
            ],
            defaultValue: 't3.medium',
          },
          {
            name: 'storage',
            label: 'Storage (GB)',
            type: 'number',
            required: true,
            defaultValue: 30,
            validation: {
              min: 1,
              max: 1000,
            },
          },
        ],
      },
    ],
  },
  {
    title: 'Review & Create',
    description: 'Review your blueprint configuration',
    sections: [
      {
        title: 'Blueprint Summary',
        fields: [], // Summary will be handled in the step render
      },
    ],
  },
];

// Complete CRUD configuration
export const blueprintsConfig: CrudPageConfig<Blueprint> = {
  title: 'Blueprints',
  icon: Box,
  description: 'Create and manage reusable infrastructure templates',

  api: {
    list: bridgeApi.listBlueprints,
    create: async (data) => {
      // Transform data to match API expectations
      return bridgeApi.createBlueprint(data);
    },
    update: async (id, data) => {
      // TODO: Implement update API
      throw new Error('Update not implemented yet');
    },
    delete: async (id) => {
      // TODO: Implement delete API
      throw new Error('Delete not implemented yet');
    },
  },

  table: {
    columns,
    actions,
    getRowId: (blueprint) => blueprint.id,
    emptyState: {
      title: 'No Blueprints Yet',
      description: 'Create reusable infrastructure templates to speed up your deployments.',
      action: {
        label: 'Create Blueprint',
        onClick: () => {
          // This will be handled by CrudPage
        },
      },
    },
  },

  wizard: {
    title: 'Create New Blueprint',
    steps: wizardSteps,
    initialData: {
      platform: 'aws',
      region: 'us-east-1',
      instanceType: 't3.medium',
      storage: 30,
    },
  },

  filters: {
    searchFields: ['name', 'description', 'useCase'],
    filterOptions: [
      {
        key: 'category',
        label: 'Category',
        options: filterOptions,
      },
    ],
  },

  permissions: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
};