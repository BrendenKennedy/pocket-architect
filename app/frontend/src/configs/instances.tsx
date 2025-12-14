import { Server, Eye, Trash2, Edit2, Copy as CopyIcon, Play, Square } from 'lucide-react';
import { bridgeApi } from '../bridge/api';
import { CrudPageConfig, TableColumn, TableAction } from '../types/crud';
import { TableRenderers } from '../components/ui/data-table';
import { Instance } from '../types/models';

// Table columns configuration
const columns: TableColumn<Instance>[] = [
  {
    key: 'name',
    header: 'Name',
    width: 'w-[20%]',
    align: 'left',
    render: (instance) => TableRenderers.withIcon(
      <Server className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      instance.name
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: 'w-[12%]',
    align: 'center',
    render: (instance) => TableRenderers.statusBadge(instance.status),
  },
  {
    key: 'instanceType',
    header: 'Type',
    width: 'w-[15%]',
    align: 'center',
    render: (instance) => TableRenderers.code(instance.instanceType),
  },
  {
    key: 'platform',
    header: 'Platform',
    width: 'w-[10%]',
    align: 'center',
    render: (instance) => TableRenderers.badge(instance.platform.toUpperCase()),
  },
  {
    key: 'privateIp',
    header: 'Private IP',
    width: 'w-[15%]',
    align: 'center',
    render: (instance) => <span className="font-mono text-sm text-muted-foreground">{instance.privateIp}</span>,
  },
  {
    key: 'projectName',
    header: 'Project',
    width: 'w-[15%]',
    align: 'center',
    render: (instance) => TableRenderers.muted(instance.projectName || 'N/A'),
  },
  {
    key: 'monthlyCost',
    header: 'Monthly Cost',
    width: 'w-[13%]',
    align: 'right',
    render: (instance) => <span className="text-green-600 font-medium">${instance.monthlyCost?.toFixed(2) || '0.00'}</span>,
  },
];

// Table actions configuration
const actions: TableAction<Instance>[] = [
  {
    icon: Play,
    label: 'Start',
    onClick: (instance) => {
      // TODO: Implement start functionality
      console.log(`Starting instance: ${instance.name}`);
    },
    tooltip: 'Start instance',
    condition: (instance) => instance.status === 'stopped',
  },
  {
    icon: Square,
    label: 'Stop',
    onClick: (instance) => {
      // TODO: Implement stop functionality
      console.log(`Stopping instance: ${instance.name}`);
    },
    tooltip: 'Stop instance',
    condition: (instance) => instance.status === 'running',
  },
  {
    icon: Eye,
    label: 'View',
    onClick: (instance) => {
      // This will be handled by CrudPage
    },
    tooltip: 'View instance details',
  },
  {
    icon: Edit2,
    label: 'Edit',
    onClick: (instance) => {
      // TODO: Implement edit functionality
      console.log(`Editing instance: ${instance.name}`);
    },
    tooltip: 'Edit instance',
  },
  {
    icon: Trash2,
    label: 'Delete',
    onClick: (instance) => {
      // TODO: Implement delete functionality
      console.log(`Deleting instance: ${instance.name}`);
    },
    tooltip: 'Delete instance',
  },
];

// Filter options
const filterOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'pending', label: 'Pending' },
  { value: 'terminated', label: 'Terminated' },
];

// Wizard steps configuration (simplified for now)
const wizardSteps = [
  {
    title: 'Instance Configuration',
    description: 'Configure your instance settings',
    sections: [
      {
        fields: [
          {
            name: 'name',
            label: 'Instance Name',
            type: 'text',
            required: true,
            placeholder: 'my-instance-01',
            validation: {
              minLength: 3,
              maxLength: 50,
            },
          },
          {
            name: 'instanceType',
            label: 'Instance Type',
            type: 'select',
            required: true,
            options: [
              { value: 't3.micro', label: 't3.micro - 2 vCPU, 1GB RAM' },
              { value: 't3.small', label: 't3.small - 2 vCPU, 2GB RAM' },
              { value: 't3.medium', label: 't3.medium - 2 vCPU, 4GB RAM' },
            ],
            defaultValue: 't3.medium',
          },
        ],
      },
    ],
  },
  {
    title: 'Network & Security',
    description: 'Configure networking and security settings',
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
        ],
      },
    ],
  },
  {
    title: 'Review & Deploy',
    description: 'Review your instance configuration',
    sections: [
      {
        title: 'Instance Summary',
        fields: [], // Summary will be handled in the step render
      },
    ],
  },
];

// Complete CRUD configuration
export const instancesConfig: CrudPageConfig<Instance> = {
  title: 'Instances',
  icon: Server,
  description: 'Manage your cloud instances',

  api: {
    list: bridgeApi.listInstances,
    create: async (data) => {
      // TODO: Implement create API
      throw new Error('Create not implemented yet');
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
    getRowId: (instance) => instance.id,
    emptyState: {
      title: 'No Instances Yet',
      description: 'Deploy your first cloud instance to get started.',
      action: {
        label: 'Deploy Instance',
        onClick: () => {
          // This will be handled by CrudPage
        },
      },
    },
  },

  wizard: {
    title: 'Deploy New Instance',
    steps: wizardSteps,
    initialData: {
      platform: 'aws',
      region: 'us-east-1',
      instanceType: 't3.medium',
    },
  },

  filters: {
    searchFields: ['name', 'projectName', 'instanceType'],
    filterOptions: [
      {
        key: 'status',
        label: 'Status',
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