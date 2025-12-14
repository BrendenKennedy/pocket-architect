import { Lock, Eye, Trash2, Edit2 } from 'lucide-react';
import { CrudTabConfig } from '../types/crud';
import { TableRenderers } from '../components/ui/data-table';
import { FirewallRule } from '../types/models';

// ============================================================================
// FIREWALL RULES TAB
// ============================================================================

const firewallRuleColumns: CrudTabConfig<FirewallRule>['table']['columns'] = [
  {
    key: 'name',
    header: 'Name',
    width: 'w-[25%]',
    align: 'left',
    render: (rule) => TableRenderers.withIcon(
      <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      rule.name
    ),
  },
  {
    key: 'description',
    header: 'Description',
    width: 'w-[30%]',
    align: 'left',
    render: (rule) => TableRenderers.muted(rule.description),
  },
  {
    key: 'vpcId',
    header: 'VPC ID',
    width: 'w-[20%]',
    align: 'center',
    render: (rule) => (
      <span className="font-mono text-sm text-muted-foreground">
        {rule.vpcId}
      </span>
    ),
  },
  {
    key: 'ingressRules',
    header: 'Inbound Rules',
    width: 'w-[12.5%]',
    align: 'center',
    render: (rule) => (
      <span className="text-primary font-medium">
        {rule.ingressRules}
      </span>
    ),
  },
  {
    key: 'egressRules',
    header: 'Outbound Rules',
    width: 'w-[12.5%]',
    align: 'center',
    render: (rule) => (
      <span className="text-primary font-medium">
        {rule.egressRules}
      </span>
    ),
  },
];

const firewallRuleActions: CrudTabConfig<FirewallRule>['table']['actions'] = [
  {
    icon: Eye,
    label: 'View',
    onClick: () => {}, // Will be overridden by CrudPage
    tooltip: 'View firewall rule details',
  },
  {
    icon: Edit2,
    label: 'Edit',
    onClick: () => {
      console.log('Edit firewall rule');
    },
    tooltip: 'Edit firewall rule',
  },
  {
    icon: Trash2,
    label: 'Delete',
    onClick: () => {
      console.log('Delete firewall rule');
    },
    tooltip: 'Delete firewall rule',
  },
];

export const firewallRulesTab: CrudTabConfig<FirewallRule> = {
  key: 'firewall-rules',
  label: 'Firewall Rules',
  icon: Lock,
  api: {
    list: async () => [], // TODO: Implement bridgeApi.listFirewallRules
    create: async (data) => ({ ...data, id: Date.now() }), // TODO: Implement bridgeApi.createFirewallRule
    update: async (id, data) => ({ ...data, id }), // TODO: Implement bridgeApi.updateFirewallRule
    delete: async (id) => {}, // TODO: Implement bridgeApi.deleteFirewallRule
  },
  table: {
    columns: firewallRuleColumns,
    actions: firewallRuleActions,
    getRowId: (rule) => rule.id,
    emptyState: {
      title: 'No Firewall Rules',
      description: 'Define firewall rules to control inbound and outbound traffic to your instances.',
      action: {
        label: 'Create Firewall Rule',
        onClick: () => {}, // Will be handled by CrudPage
      },
    },
  },
  wizard: {
    title: 'Create Firewall Rule',
    steps: [
      {
        title: 'Rule Details',
        description: 'Define the basic firewall rule settings',
        sections: [
          {
            fields: [
              {
                name: 'name',
                label: 'Rule Name',
                type: 'text',
                required: true,
                placeholder: 'web-traffic-rule',
                validation: { minLength: 3, maxLength: 50 },
              },
              {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                placeholder: 'Describe this firewall rule...',
                validation: { maxLength: 200 },
              },
              {
                name: 'vpcId',
                label: 'VPC ID',
                type: 'text',
                required: true,
                placeholder: 'vpc-12345678',
                validation: { pattern: /^vpc-[a-f0-9]+$/ },
              },
            ],
          },
        ],
      },
      {
        title: 'Traffic Configuration',
        description: 'Configure inbound and outbound traffic rules',
        sections: [
          {
            title: 'Inbound Rules (Ingress)',
            fields: [
              {
                name: 'ingressType',
                label: 'Rule Type',
                type: 'select',
                options: [
                  { value: 'allow-all', label: 'Allow All Traffic' },
                  { value: 'http-https', label: 'HTTP/HTTPS Only' },
                  { value: 'ssh-only', label: 'SSH Only' },
                  { value: 'custom', label: 'Custom Rules' },
                ],
                defaultValue: 'http-https',
              },
            ],
          },
          {
            title: 'Outbound Rules (Egress)',
            fields: [
              {
                name: 'egressType',
                label: 'Rule Type',
                type: 'select',
                options: [
                  { value: 'allow-all', label: 'Allow All Traffic' },
                  { value: 'limited', label: 'Limited Access' },
                  { value: 'custom', label: 'Custom Rules' },
                ],
                defaultValue: 'allow-all',
              },
            ],
          },
        ],
      },
      {
        title: 'Review & Create',
        description: 'Review your firewall rule configuration',
        sections: [
          {
            title: 'Rule Summary',
            fields: [], // Summary will be shown in step content
          },
        ],
      },
    ],
    initialData: {
      ingressType: 'http-https',
      egressType: 'allow-all',
    },
  },
  filters: {
    searchFields: ['name', 'description', 'vpcId'],
    filterOptions: [
      {
        key: 'vpc',
        label: 'VPC',
        options: [
          { value: 'all', label: 'All VPCs' },
          // TODO: Dynamically load VPC options
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