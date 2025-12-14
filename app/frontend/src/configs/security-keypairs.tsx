import { Key, Eye, Trash2, Edit2, Copy } from 'lucide-react';
import { CrudTabConfig } from '../types/crud';
import { TableRenderers } from '../components/ui/data-table';
import { KeyPair } from '../types/models';

// ============================================================================
// KEY PAIRS TAB
// ============================================================================

const keyPairColumns: CrudTabConfig<KeyPair>['table']['columns'] = [
  {
    key: 'name',
    header: 'Name',
    width: 'w-[30%]',
    align: 'left',
    render: (keyPair) => TableRenderers.withIcon(
      <Key className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      keyPair.name
    ),
  },
  {
    key: 'fingerprint',
    header: 'Fingerprint',
    width: 'w-[35%]',
    align: 'left',
    render: (keyPair) => (
      <span className="font-mono text-sm text-muted-foreground">
        {keyPair.fingerprint}
      </span>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    width: 'w-[15%]',
    align: 'center',
    render: (keyPair) => TableRenderers.badge(keyPair.type),
  },
  {
    key: 'created',
    header: 'Created',
    width: 'w-[20%]',
    align: 'center',
    render: (keyPair) => (
      <span className="text-muted-foreground">
        {new Date(keyPair.created).toLocaleDateString()}
      </span>
    ),
  },
];

const keyPairActions: CrudTabConfig<KeyPair>['table']['actions'] = [
  {
    icon: Copy,
    label: 'Copy Public Key',
    onClick: (keyPair) => {
      navigator.clipboard.writeText(keyPair.name); // TODO: Copy actual public key
      console.log('Copy public key for:', keyPair.name);
    },
    tooltip: 'Copy public key to clipboard',
  },
  {
    icon: Eye,
    label: 'View',
    onClick: () => {}, // Will be overridden by CrudPage
    tooltip: 'View key pair details',
  },
  {
    icon: Edit2,
    label: 'Edit',
    onClick: () => {
      console.log('Edit key pair');
    },
    tooltip: 'Edit key pair',
  },
  {
    icon: Trash2,
    label: 'Delete',
    onClick: () => {
      console.log('Delete key pair');
    },
    tooltip: 'Delete key pair',
  },
];

export const keyPairsTab: CrudTabConfig<KeyPair> = {
  key: 'keypairs',
  label: 'Key Pairs',
  icon: Key,
  api: {
    list: async () => [], // TODO: Implement bridgeApi.listKeyPairs
    create: async (data) => ({ ...data, id: Date.now() }), // TODO: Implement bridgeApi.createKeyPair
    update: async (id, data) => ({ ...data, id }), // TODO: Implement bridgeApi.updateKeyPair
    delete: async (id) => {}, // TODO: Implement bridgeApi.deleteKeyPair
  },
  table: {
    columns: keyPairColumns,
    actions: keyPairActions,
    getRowId: (keyPair) => keyPair.id,
    emptyState: {
      title: 'No SSH Key Pairs',
      description: 'Generate SSH key pairs to securely connect to your instances.',
      action: {
        label: 'Generate Key Pair',
        onClick: () => {}, // Will be handled by CrudPage
      },
    },
  },
  wizard: {
    title: 'Generate SSH Key Pair',
    steps: [
      {
        title: 'Key Pair Details',
        description: 'Configure your SSH key pair settings',
        sections: [
          {
            fields: [
              {
                name: 'name',
                label: 'Key Pair Name',
                type: 'text',
                required: true,
                placeholder: 'my-key-pair',
                validation: { minLength: 3, maxLength: 50 },
              },
              {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                placeholder: 'Optional description for this key pair...',
                validation: { maxLength: 200 },
              },
              {
                name: 'type',
                label: 'Key Type',
                type: 'select',
                required: true,
                options: [
                  { value: 'rsa', label: 'RSA (2048-bit)' },
                  { value: 'ed25519', label: 'Ed25519' },
                  { value: 'ecdsa', label: 'ECDSA' },
                ],
                defaultValue: 'rsa',
              },
            ],
          },
        ],
      },
      {
        title: 'Generation Options',
        description: 'Configure key generation parameters',
        sections: [
          {
            fields: [
              {
                name: 'passphrase',
                label: 'Passphrase (Optional)',
                type: 'password',
                placeholder: 'Leave empty for no passphrase',
                helpText: 'Adding a passphrase provides additional security',
              },
              {
                name: 'downloadPrivate',
                label: 'Download Private Key',
                type: 'checkbox',
                defaultValue: true,
                helpText: 'Private key will be downloaded automatically after generation',
              },
            ],
          },
        ],
      },
      {
        title: 'Review & Generate',
        description: 'Review your key pair configuration',
        sections: [
          {
            title: 'Key Pair Summary',
            fields: [], // Summary will be shown in step content
          },
        ],
      },
    ],
    initialData: {
      type: 'rsa',
      downloadPrivate: true,
    },
  },
  filters: {
    searchFields: ['name', 'description'],
    filterOptions: [
      {
        key: 'type',
        label: 'Key Type',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'rsa', label: 'RSA' },
          { value: 'ed25519', label: 'Ed25519' },
          { value: 'ecdsa', label: 'ECDSA' },
        ],
      },
    ],
  },
  permissions: {
    canCreate: true,
    canEdit: false, // Key pairs typically can't be edited after creation
    canDelete: true,
  },
};