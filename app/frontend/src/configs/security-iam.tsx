import { Users, Eye, Trash2, Edit2 } from 'lucide-react';
import { CrudTabConfig } from '../types/crud';
import { TableRenderers } from '../components/ui/data-table';
import { IAMRole } from '../types/models';

// ============================================================================
// IAM ROLES TAB
// ============================================================================

const iamRoleColumns: CrudTabConfig<IAMRole>['table']['columns'] = [
  {
    key: 'name',
    header: 'Role Name',
    width: 'w-[25%]',
    align: 'left',
    render: (role) => TableRenderers.withIcon(
      <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      role.name
    ),
  },
  {
    key: 'description',
    header: 'Description',
    width: 'w-[35%]',
    align: 'left',
    render: (role) => TableRenderers.muted(role.description),
  },
  {
    key: 'trustPolicy',
    header: 'Trust Policy',
    width: 'w-[20%]',
    align: 'center',
    render: (role) => TableRenderers.badge(role.trustPolicy),
  },
  {
    key: 'policyCount',
    header: 'Policies',
    width: 'w-[20%]',
    align: 'center',
    render: (role) => (
      <span className="text-primary font-medium">
        {role.policyCount}
      </span>
    ),
  },
];

const iamRoleActions: CrudTabConfig<IAMRole>['table']['actions'] = [
  {
    icon: Eye,
    label: 'View',
    onClick: () => {}, // Will be overridden by CrudPage
    tooltip: 'View IAM role details',
  },
  {
    icon: Edit2,
    label: 'Edit',
    onClick: () => {
      console.log('Edit IAM role');
    },
    tooltip: 'Edit IAM role',
  },
  {
    icon: Trash2,
    label: 'Delete',
    onClick: () => {
      console.log('Delete IAM role');
    },
    tooltip: 'Delete IAM role',
  },
];

export const iamRolesTab: CrudTabConfig<IAMRole> = {
  key: 'iam',
  label: 'IAM Roles',
  icon: Users,
  api: {
    list: async () => [], // TODO: Implement bridgeApi.listIAMRoles
    create: async (data) => ({ ...data, id: Date.now() }), // TODO: Implement bridgeApi.createIAMRole
    update: async (id, data) => ({ ...data, id }), // TODO: Implement bridgeApi.updateIAMRole
    delete: async (id) => {}, // TODO: Implement bridgeApi.deleteIAMRole
  },
  table: {
    columns: iamRoleColumns,
    actions: iamRoleActions,
    getRowId: (role) => role.id,
    emptyState: {
      title: 'No IAM Roles',
      description: 'Create IAM roles to grant specific permissions and access controls to your resources.',
      action: {
        label: 'Create IAM Role',
        onClick: () => {}, // Will be handled by CrudPage
      },
    },
  },
  wizard: {
    title: 'Create IAM Role',
    steps: [
      {
        title: 'Role Details',
        description: 'Define the basic IAM role settings',
        sections: [
          {
            fields: [
              {
                name: 'name',
                label: 'Role Name',
                type: 'text',
                required: true,
                placeholder: 'EC2-WebServer-Role',
                validation: { minLength: 3, maxLength: 64, pattern: /^[a-zA-Z0-9+=,.@-]+$/ },
              },
              {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                placeholder: 'Describe the purpose of this IAM role...',
                validation: { maxLength: 1000 },
              },
            ],
          },
        ],
      },
      {
        title: 'Trust Policy',
        description: 'Configure which entities can assume this role',
        sections: [
          {
            fields: [
              {
                name: 'trustPolicy',
                label: 'Trust Policy Type',
                type: 'select',
                required: true,
                options: [
                  { value: 'ec2', label: 'EC2 Service' },
                  { value: 'lambda', label: 'Lambda Service' },
                  { value: 'custom', label: 'Custom Trust Policy' },
                ],
                defaultValue: 'ec2',
              },
              {
                name: 'customTrustPolicy',
                label: 'Custom Trust Policy (JSON)',
                type: 'textarea',
                placeholder: '{"Version": "2012-10-17", "Statement": [...]}',
                helpText: 'Only required if using custom trust policy',
              },
            ],
          },
        ],
      },
      {
        title: 'Permissions',
        description: 'Attach managed policies to define role permissions',
        sections: [
          {
            fields: [
              {
                name: 'managedPolicies',
                label: 'Managed Policies',
                type: 'select',
                options: [
                  { value: 'AmazonEC2ReadOnlyAccess', label: 'Amazon EC2 Read Only Access' },
                  { value: 'AmazonS3FullAccess', label: 'Amazon S3 Full Access' },
                  { value: 'CloudWatchFullAccess', label: 'CloudWatch Full Access' },
                  { value: 'custom', label: 'Custom Policy (Advanced)' },
                ],
                helpText: 'Select one or more managed policies',
              },
              {
                name: 'customPolicy',
                label: 'Custom Policy (JSON)',
                type: 'textarea',
                placeholder: '{"Version": "2012-10-17", "Statement": [...]}',
                helpText: 'Only required if using custom policy',
              },
            ],
          },
        ],
      },
      {
        title: 'Review & Create',
        description: 'Review your IAM role configuration',
        sections: [
          {
            title: 'Role Summary',
            fields: [], // Summary will be shown in step content
          },
        ],
      },
    ],
    initialData: {
      trustPolicy: 'ec2',
    },
  },
  filters: {
    searchFields: ['name', 'description'],
    filterOptions: [
      {
        key: 'trustPolicy',
        label: 'Trust Policy',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'ec2', label: 'EC2 Service' },
          { value: 'lambda', label: 'Lambda Service' },
          { value: 'custom', label: 'Custom' },
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