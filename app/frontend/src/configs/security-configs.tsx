import { Shield, Key, Lock, Users, Award, Eye, Trash2, Edit2, Copy } from 'lucide-react';
import { bridgeApi } from '../bridge/api';
import { CrudTabConfig } from '../types/crud';
import { TableRenderers } from '../components/ui/data-table';
import { SecurityConfig, KeyPair, FirewallRule, IAMRole, Certificate } from '../types/models';

// ============================================================================
// SECURITY CONFIGURATIONS TAB
// ============================================================================

const securityConfigColumns: CrudTabConfig<SecurityConfig>['table']['columns'] = [
  {
    key: 'name',
    header: 'Name',
    width: 'w-[25%]',
    align: 'left',
    render: (config) => TableRenderers.withIcon(
      <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      config.name
    ),
  },
  {
    key: 'description',
    header: 'Description',
    width: 'w-[30%]',
    align: 'left',
    render: (config) => TableRenderers.muted(config.description),
  },
  {
    key: 'type',
    header: 'Type',
    width: 'w-[15%]',
    align: 'center',
    render: (config) => TableRenderers.badge(config.type),
  },
  {
    key: 'severity',
    header: 'Severity',
    width: 'w-[15%]',
    align: 'center',
    render: (config) => TableRenderers.statusBadge(config.severity),
  },
  {
    key: 'status',
    header: 'Status',
    width: 'w-[15%]',
    align: 'center',
    render: (config) => TableRenderers.statusBadge(config.status),
  },
];

const securityConfigActions: CrudTabConfig<SecurityConfig>['table']['actions'] = [
  {
    icon: Eye,
    label: 'View',
    onClick: () => {}, // Will be overridden by CrudPage
    tooltip: 'View security configuration details',
  },
  {
    icon: Edit2,
    label: 'Edit',
    onClick: () => {
      console.log('Edit security config');
    },
    tooltip: 'Edit security configuration',
  },
  {
    icon: Trash2,
    label: 'Delete',
    onClick: () => {
      console.log('Delete security config');
    },
    tooltip: 'Delete security configuration',
  },
];

export const securityConfigsTab: CrudTabConfig<SecurityConfig> = {
  key: 'configurations',
  label: 'Configurations',
  icon: Shield,
  api: {
    list: async () => [], // TODO: Implement bridgeApi.listSecurityConfigs
    create: async (data) => ({ ...data, id: Date.now() }), // TODO: Implement bridgeApi.createSecurityConfig
    update: async (id, data) => ({ ...data, id }), // TODO: Implement bridgeApi.updateSecurityConfig
    delete: async (id) => {}, // TODO: Implement bridgeApi.deleteSecurityConfig
  },
  table: {
    columns: securityConfigColumns,
    actions: securityConfigActions,
    getRowId: (config) => config.id,
    emptyState: {
      title: 'No Security Configurations',
      description: 'Create security configurations to manage access control and encryption settings for your infrastructure.',
      action: {
        label: 'Create Configuration',
        onClick: () => {}, // Will be handled by CrudPage
      },
    },
  },
  wizard: {
    title: 'Create Security Configuration',
    steps: [
      {
        title: 'Configuration Details',
        description: 'Define the basic security configuration settings',
        sections: [
          {
            fields: [
              {
                name: 'name',
                label: 'Configuration Name',
                type: 'text',
                required: true,
                placeholder: 'web-app-security',
                validation: { minLength: 3, maxLength: 50 },
              },
              {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                placeholder: 'Describe this security configuration...',
                validation: { maxLength: 500 },
              },
              {
                name: 'type',
                label: 'Configuration Type',
                type: 'select',
                required: true,
                options: [
                  { value: 'network', label: 'Network Security' },
                  { value: 'access', label: 'Access Control' },
                  { value: 'encryption', label: 'Encryption' },
                  { value: 'compliance', label: 'Compliance' },
                ],
                defaultValue: 'network',
              },
            ],
          },
        ],
      },
      {
        title: 'Security Rules',
        description: 'Configure the specific security rules and policies',
        sections: [
          {
            title: 'Rule Configuration',
            fields: [
              {
                name: 'severity',
                label: 'Severity Level',
                type: 'select',
                required: true,
                options: [
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ],
                defaultValue: 'medium',
              },
              {
                name: 'rules',
                label: 'Security Rules',
                type: 'textarea',
                placeholder: 'Define security rules in JSON format...',
              },
            ],
          },
        ],
      },
      {
        title: 'Review & Apply',
        description: 'Review your security configuration before applying',
        sections: [
          {
            title: 'Configuration Summary',
            fields: [], // Summary will be shown in the step content
          },
        ],
      },
    ],
    initialData: {
      type: 'network',
      severity: 'medium',
    },
  },
  filters: {
    searchFields: ['name', 'description'],
    filterOptions: [
      {
        key: 'type',
        label: 'Type',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'network', label: 'Network' },
          { value: 'access', label: 'Access Control' },
          { value: 'encryption', label: 'Encryption' },
          { value: 'compliance', label: 'Compliance' },
        ],
      },
      {
        key: 'severity',
        label: 'Severity',
        options: [
          { value: 'all', label: 'All Severities' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'critical', label: 'Critical' },
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