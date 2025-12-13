import { FolderOpen, Eye, Trash2, Edit2 } from 'lucide-react';
import { bridgeApi } from '../bridge/api';
import { CrudPageConfig, TableColumn, TableAction } from '../types/crud';
import { TableRenderers } from '../components/ui/data-table';
import { Project } from '../types/models';

// Table columns configuration
const columns: TableColumn<Project>[] = [
  {
    key: 'name',
    header: 'Name',
    width: 'w-[25%]',
    align: 'left',
    render: (project) => TableRenderers.withIcon(
      <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      project.name
    ),
  },
  {
    key: 'description',
    header: 'Description',
    width: 'w-[30%]',
    align: 'left',
    render: (project) => TableRenderers.muted(project.description),
  },
  {
    key: 'status',
    header: 'Status',
    width: 'w-[15%]',
    align: 'center',
    render: (project) => TableRenderers.statusBadge(project.status),
  },
  {
    key: 'platform',
    header: 'Platform',
    width: 'w-[15%]',
    align: 'center',
    render: (project) => TableRenderers.badge(project.platform.toUpperCase()),
  },
  {
    key: 'region',
    header: 'Region',
    width: 'w-[15%]',
    align: 'center',
    render: (project) => TableRenderers.code(project.region),
  },
];

// Table actions configuration
const actions: TableAction<Project>[] = [
  {
    icon: Eye,
    label: 'View',
    onClick: (project) => {
      // This will be handled by CrudPage
    },
    tooltip: 'View project details',
  },
  {
    icon: Edit2,
    label: 'Edit',
    onClick: (project) => {
      // TODO: Implement edit functionality
      console.log(`Editing project: ${project.name}`);
    },
    tooltip: 'Edit project',
  },
  {
    icon: Trash2,
    label: 'Delete',
    onClick: (project) => {
      // TODO: Implement delete functionality
      console.log(`Deleting project: ${project.name}`);
    },
    tooltip: 'Delete project',
  },
];

// Filter options
const filterOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'degraded', label: 'Degraded' },
  { value: 'error', label: 'Error' },
];

// Wizard steps configuration
const wizardSteps = [
  {
    title: 'Project Details',
    description: 'Provide basic information for your project',
    sections: [
      {
        fields: [
          {
            name: 'name',
            label: 'Project Name',
            type: 'text',
            required: true,
            placeholder: 'my-project',
            validation: {
              minLength: 3,
              maxLength: 50,
            },
          },
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
            placeholder: 'Describe your project...',
            validation: {
              maxLength: 500,
            },
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
            name: 'costLimit',
            label: 'Monthly Cost Limit ($)',
            type: 'number',
            placeholder: '100',
            validation: {
              min: 0,
            },
          },
        ],
      },
    ],
  },
  {
    title: 'Review & Create',
    description: 'Review your project configuration',
    sections: [
      {
        title: 'Project Summary',
        fields: [], // Summary will be handled in the step render
      },
    ],
  },
];

// Complete CRUD configuration
export const projectsConfig: CrudPageConfig<Project> = {
  title: 'Projects',
  icon: FolderOpen,
  description: 'Organize your cloud resources into projects',

  api: {
    list: bridgeApi.listProjects,
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
    getRowId: (project) => project.id,
    emptyState: {
      title: 'No Projects Yet',
      description: 'Create your first project to organize your cloud resources.',
      action: {
        label: 'Create Project',
        onClick: () => {
          // This will be handled by CrudPage
        },
      },
    },
  },

  wizard: {
    title: 'Create New Project',
    steps: wizardSteps,
    initialData: {
      platform: 'aws',
      region: 'us-east-1',
    },
  },

  filters: {
    searchFields: ['name', 'description'],
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