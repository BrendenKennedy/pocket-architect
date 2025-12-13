import { Award, Eye, Trash2, Edit2 } from 'lucide-react';
import { CrudTabConfig } from '../types/crud';
import { TableRenderers } from '../components/ui/data-table';
import { Certificate } from '../types/models';

// ============================================================================
// CERTIFICATES TAB
// ============================================================================

const certificateColumns: CrudTabConfig<Certificate>['table']['columns'] = [
  {
    key: 'domain',
    header: 'Domain',
    width: 'w-[30%]',
    align: 'left',
    render: (cert) => TableRenderers.withIcon(
      <Award className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      cert.domain
    ),
  },
  {
    key: 'type',
    header: 'Type',
    width: 'w-[15%]',
    align: 'center',
    render: (cert) => TableRenderers.badge(cert.type),
  },
  {
    key: 'status',
    header: 'Status',
    width: 'w-[15%]',
    align: 'center',
    render: (cert) => {
      const statusColors = {
        'issued': 'bg-green-500/20 text-green-500',
        'pending': 'bg-yellow-500/20 text-yellow-500',
        'expired': 'bg-red-500/20 text-red-500',
        'revoked': 'bg-gray-500/20 text-gray-500',
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[cert.status] || 'bg-gray-500/20 text-gray-500'}`}>
          {cert.status}
        </span>
      );
    },
  },
  {
    key: 'expiration',
    header: 'Expiration',
    width: 'w-[20%]',
    align: 'center',
    render: (cert) => (
      <span className="text-muted-foreground">
        {new Date(cert.expiration).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: 'arn',
    header: 'ARN',
    width: 'w-[20%]',
    align: 'left',
    render: (cert) => (
      <span className="font-mono text-xs text-muted-foreground truncate">
        {cert.arn}
      </span>
    ),
  },
];

const certificateActions: CrudTabConfig<Certificate>['table']['actions'] = [
  {
    icon: Eye,
    label: 'View',
    onClick: () => {}, // Will be overridden by CrudPage
    tooltip: 'View certificate details',
  },
  {
    icon: Edit2,
    label: 'Edit',
    onClick: () => {
      console.log('Edit certificate');
    },
    tooltip: 'Edit certificate',
  },
  {
    icon: Trash2,
    label: 'Delete',
    onClick: () => {
      console.log('Delete certificate');
    },
    tooltip: 'Delete certificate',
  },
];

export const certificatesTab: CrudTabConfig<Certificate> = {
  key: 'certificates',
  label: 'Certificates',
  icon: Award,
  api: {
    list: async () => [], // TODO: Implement bridgeApi.listCertificates
    create: async (data) => ({ ...data, id: Date.now() }), // TODO: Implement bridgeApi.createCertificate
    update: async (id, data) => ({ ...data, id }), // TODO: Implement bridgeApi.updateCertificate
    delete: async (id) => {}, // TODO: Implement bridgeApi.deleteCertificate
  },
  table: {
    columns: certificateColumns,
    actions: certificateActions,
    getRowId: (cert) => cert.id,
    emptyState: {
      title: 'No SSL/TLS Certificates',
      description: 'Manage SSL/TLS certificates to enable secure HTTPS connections for your applications.',
      action: {
        label: 'Request Certificate',
        onClick: () => {}, // Will be handled by CrudPage
      },
    },
  },
  wizard: {
    title: 'Request SSL/TLS Certificate',
    steps: [
      {
        title: 'Domain Configuration',
        description: 'Specify the domain and certificate details',
        sections: [
          {
            fields: [
              {
                name: 'domain',
                label: 'Domain Name',
                type: 'text',
                required: true,
                placeholder: 'example.com',
                validation: {
                  pattern: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
                },
              },
              {
                name: 'type',
                label: 'Certificate Type',
                type: 'select',
                required: true,
                options: [
                  { value: 'amazon-issued', label: 'Amazon Issued' },
                  { value: 'imported', label: 'Imported' },
                ],
                defaultValue: 'amazon-issued',
              },
              {
                name: 'validationMethod',
                label: 'Validation Method',
                type: 'select',
                required: true,
                options: [
                  { value: 'dns', label: 'DNS Validation' },
                  { value: 'email', label: 'Email Validation' },
                ],
                defaultValue: 'dns',
              },
            ],
          },
        ],
      },
      {
        title: 'Additional Domains',
        description: 'Add subject alternative names (SANs) if needed',
        sections: [
          {
            fields: [
              {
                name: 'additionalDomains',
                label: 'Additional Domain Names',
                type: 'textarea',
                placeholder: '*.example.com\napi.example.com',
                helpText: 'One domain per line. Leave empty for single domain certificate.',
              },
              {
                name: 'transparencyLogging',
                label: 'Enable Certificate Transparency Logging',
                type: 'checkbox',
                defaultValue: true,
                helpText: 'Required for publicly trusted certificates',
              },
            ],
          },
        ],
      },
      {
        title: 'Review & Request',
        description: 'Review your certificate request',
        sections: [
          {
            title: 'Certificate Summary',
            fields: [], // Summary will be shown in step content
          },
        ],
      },
    ],
    initialData: {
      type: 'amazon-issued',
      validationMethod: 'dns',
      transparencyLogging: true,
    },
  },
  filters: {
    searchFields: ['domain', 'arn'],
    filterOptions: [
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'all', label: 'All Statuses' },
          { value: 'issued', label: 'Issued' },
          { value: 'pending', label: 'Pending' },
          { value: 'expired', label: 'Expired' },
          { value: 'revoked', label: 'Revoked' },
        ],
      },
      {
        key: 'type',
        label: 'Type',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'amazon-issued', label: 'Amazon Issued' },
          { value: 'imported', label: 'Imported' },
        ],
      },
    ],
  },
  permissions: {
    canCreate: true,
    canEdit: false, // Certificates typically can't be edited after issuance
    canDelete: true,
  },
};