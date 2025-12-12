import { useState, useEffect } from 'react';
import { Shield, Key, Lock, Users, Award, Eye, Trash2, Edit2, Copy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { CreationWizard } from './ui/creation-wizard';
import { SecurityDetailsDialog } from './SecurityDetailsDialog';
import { toast } from 'sonner@2.0.3';
import { ProjectColorDot } from './ui/neon-dot';
import { DataTable, TableColumn, TableAction, TableRenderers } from './ui/data-table';
import { PageLayout } from './ui/page-layout';
import { PageHeader } from './ui/page-header';
import { ActionBar } from './ui/action-bar';
import { useDataFilters } from '../hooks/useDataFilters';
import { useWizard } from '../hooks/useWizard';
import { useDialog } from '../hooks/useDialog';
import { Card } from './ui/card';
import { securityConfigurations as initialSecurityConfigurations } from '../data/securityConfigs';
import { bridgeApi } from '../bridge/api';



// Type definitions for security resources
interface KeyPair {
  id: number;
  name: string;
  fingerprint: string;
  type: string;
  created: string;
  usedIn: Array<{ name: string; color: string }>;
}

interface FirewallRule {
  id: number;
  name: string;
  description: string;
  vpcId: string;
  ingressRules: number;
  egressRules: number;
}

interface IAMRole {
  id: number;
  name: string;
  description: string;
  trustPolicy: string;
  policyCount: number;
}

interface Certificate {
  id: number;
  domain: string;
  status: string;
  type: string;
  expiration: string;
  arn: string;
}

type SecurityConfig = typeof initialSecurityConfigurations[0];

export function Security() {
  // Active tab state
  const [activeTab, setActiveTab] = useState('configs');

  // Security data state - will be populated with real AWS security resources
  const [keyPairs, setKeyPairs] = useState([]);
  const [firewallRules, setFirewallRules] = useState([]);
  const [iamRoles, setIamRoles] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Data state - using the state variables defined above
  const [securityConfigurations] = useState(initialSecurityConfigurations);

  // Fetch security data
  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        // TODO: Add API calls for security data when backend supports it
        // For now, show empty states - these would be populated with real AWS security resources

        setKeyPairs([]);
        setFirewallRules([]);
        setIamRoles([]);
        setCertificates([]);

      } catch (error) {
        console.error('Failed to fetch security data:', error);
        toast.error('Failed to load security data');
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityData();
  }, []);

  // Hooks for each tab
  const configsFilters = useDataFilters({
    data: securityConfigurations,
    searchFields: ['name', 'description'],
    filterFn: (item, filter) => item.type === filter,
  });

  const keyPairsFilters = useDataFilters({
    data: keyPairs,
    searchFields: ['name', 'fingerprint'],
    filterFn: (item, filter) => item.type === filter,
  });

  const firewallRulesFilters = useDataFilters({
    data: firewallRules,
    searchFields: ['name', 'description', 'vpcId'],
    filterFn: (item, filter) => item.vpcId === filter,
  });

  const iamRolesFilters = useDataFilters({
    data: iamRoles,
    searchFields: ['name', 'description'],
    filterFn: (item, filter) => item.trustPolicy === filter,
  });

  const certificatesFilters = useDataFilters({
    data: certificates,
    searchFields: ['domain', 'arn'],
    filterFn: (item, filter) => item.status === filter,
  });

  const configWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      toast.success('Security configuration created!');
      resetConfigForm();
    },
  });

  const keyPairWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      toast.success('SSH key pair created successfully!');
      resetKeyPairForm();
    },
  });

  const firewallRuleWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      toast.success('Firewall rule created successfully!');
      resetFirewallRuleForm();
    },
  });

  const iamRoleWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      toast.success('IAM role created successfully!');
      resetIAMRoleForm();
    },
  });

  const certificateWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      toast.success('Certificate requested successfully!');
      resetCertificateForm();
    },
  });

  const detailsDialog = useDialog<any>();

  // Config form state
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [configType, setConfigType] = useState('network');

  // SSH Key Pair form state
  const [keyName, setKeyName] = useState('');
  const [keyDescription, setKeyDescription] = useState('');
  const [keyType, setKeyType] = useState('ed25519');
  const [keyPassphrase, setKeyPassphrase] = useState('');
  const [keySaveLocation, setKeySaveLocation] = useState('~/.ssh/');
  const [generatedKey, setGeneratedKey] = useState<{
    publicKey: string;
    privateKeyPath: string;
    fingerprint: string;
  } | null>(null);

  // Firewall Rule form state
  const [ruleSetName, setRuleSetName] = useState('');
  const [ruleSetDescription, setRuleSetDescription] = useState('');
  const [vpcId, setVpcId] = useState('');
  const [rulePreset, setRulePreset] = useState('custom');
  const [inboundRules, setInboundRules] = useState<Array<{
    protocol: string;
    portRange: string;
    source: string;
    description: string;
  }>>([]);
  const [outboundRules, setOutboundRules] = useState<Array<{
    protocol: string;
    portRange: string;
    destination: string;
    description: string;
  }>>([{ protocol: '-1', portRange: 'All', destination: '0.0.0.0/0', description: 'Allow all outbound' }]);

  // IAM Role form state
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [trustPolicy, setTrustPolicy] = useState('ec2');
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [inlinePolicy, setInlinePolicy] = useState('');

  // Certificate form state
  const [domain, setDomain] = useState('');
  const [additionalDomains, setAdditionalDomains] = useState<string[]>([]);
  const [isWildcard, setIsWildcard] = useState(false);
  const [validationMethod, setValidationMethod] = useState('DNS');
  const [certRegion, setCertRegion] = useState('us-east-1');

  const resetConfigForm = () => {
    setConfigName('');
    setConfigDescription('');
    setConfigType('network');
  };

  const resetKeyPairForm = () => {
    setKeyName('');
    setKeyDescription('');
    setKeyType('ed25519');
    setKeyPassphrase('');
    setKeySaveLocation('~/.ssh/');
    setGeneratedKey(null);
  };

  const resetFirewallRuleForm = () => {
    setRuleSetName('');
    setRuleSetDescription('');
    setVpcId('');
    setRulePreset('custom');
    setInboundRules([]);
    setOutboundRules([{ protocol: '-1', portRange: 'All', destination: '0.0.0.0/0', description: 'Allow all outbound' }]);
  };

  const resetIAMRoleForm = () => {
    setRoleName('');
    setRoleDescription('');
    setTrustPolicy('ec2');
    setSelectedPolicies([]);
    setInlinePolicy('');
  };

  const resetCertificateForm = () => {
    setDomain('');
    setAdditionalDomains([]);
    setIsWildcard(false);
    setValidationMethod('DNS');
    setCertRegion('us-east-1');
  };

  const handleRefresh = () => {
    toast.success('Security resources refreshed');
  };

  // Get current filters based on active tab
  const getCurrentFilters = () => {
    switch (activeTab) {
      case 'configs': return configsFilters;
      case 'keypairs': return keyPairsFilters;
      case 'firewall-rules': return firewallRulesFilters;
      case 'iam': return iamRolesFilters;
      case 'certificates': return certificatesFilters;
      default: return configsFilters;
    }
  };

  const currentFilters = getCurrentFilters();

  // Table columns for Security Configurations
  const configColumns: TableColumn<SecurityConfig>[] = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-[20%]',
      align: 'left' as const,
      render: (config) => TableRenderers.withIcon(
        <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
        config.name
      ),
    },
    {
      key: 'description',
      header: 'Description',
      width: 'w-[30%]',
      align: 'left' as const,
      render: (config) => TableRenderers.muted(config.description),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (config) => TableRenderers.badge(config.type),
    },
    {
      key: 'severity',
      header: 'Severity',
      width: 'w-[12%]',
      align: 'center' as const,
      render: (config) => TableRenderers.badge(config.severity),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[12%]',
      align: 'center' as const,
      render: (config) => TableRenderers.statusBadge(config.status, 'sm'),
    },
    {
      key: 'appliedTo',
      header: 'Applied To',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (config) => <span className="text-muted-foreground">{config.appliedTo?.length || 0}</span>,
    },
  ];

  // Table columns for Key Pairs
  const keyPairColumns: TableColumn<KeyPair>[] = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-[25%]',
      align: 'left' as const,
      render: (kp) => TableRenderers.withIcon(
        <Key className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
        kp.name
      ),
    },
    {
      key: 'fingerprint',
      header: 'Fingerprint',
      width: 'w-[30%]',
      align: 'center' as const,
      render: (kp) => TableRenderers.code(kp.fingerprint),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (kp) => TableRenderers.badge(kp.type),
    },
    {
      key: 'created',
      header: 'Created',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (kp) => <span className="text-muted-foreground">{kp.created}</span>,
    },
    {
      key: 'usedIn',
      header: 'Used In',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (kp) => (
        <div className="flex gap-1 justify-center">
          {kp.usedIn.map((proj, i) => (
            <ProjectColorDot key={i} color={proj.color} projectName={proj.name} size="sm" />
          ))}
        </div>
      ),
    },
  ];

  // Table columns for Firewall Rules
  const firewallRuleColumns: TableColumn<FirewallRule>[] = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-[25%]',
      align: 'left' as const,
      render: (sg) => TableRenderers.withIcon(
        <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
        sg.name
      ),
    },
    {
      key: 'description',
      header: 'Description',
      width: 'w-[30%]',
      align: 'left' as const,
      render: (sg) => TableRenderers.muted(sg.description),
    },
    {
      key: 'vpcId',
      header: 'VPC ID',
      width: 'w-[20%]',
      align: 'center' as const,
      render: (sg) => TableRenderers.code(sg.vpcId),
    },
    {
      key: 'ingressRules',
      header: 'Ingress',
      width: 'w-[12%]',
      align: 'center' as const,
      render: (sg) => <span className="text-muted-foreground">{sg.ingressRules}</span>,
    },
    {
      key: 'egressRules',
      header: 'Egress',
      width: 'w-[13%]',
      align: 'center' as const,
      render: (sg) => <span className="text-muted-foreground">{sg.egressRules}</span>,
    },
  ];

  // Table columns for IAM Roles
  const iamRoleColumns: TableColumn<IAMRole>[] = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-[25%]',
      align: 'left' as const,
      render: (role) => TableRenderers.withIcon(
        <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
        role.name
      ),
    },
    {
      key: 'description',
      header: 'Description',
      width: 'w-[35%]',
      align: 'left' as const,
      render: (role) => TableRenderers.muted(role.description),
    },
    {
      key: 'trustPolicy',
      header: 'Trust Policy',
      width: 'w-[20%]',
      align: 'center' as const,
      render: (role) => TableRenderers.badge(role.trustPolicy),
    },
    {
      key: 'policyCount',
      header: 'Policies',
      width: 'w-[20%]',
      align: 'center' as const,
      render: (role) => <span className="text-gray-400">{role.policyCount}</span>,
    },
  ];

  // Table columns for Certificates
  const certificateColumns: TableColumn<Certificate>[] = [
    {
      key: 'domain',
      header: 'Domain',
      width: 'w-[25%]',
      align: 'left' as const,
      render: (cert) => TableRenderers.withIcon(
        <Award className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
        cert.domain
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (cert) => TableRenderers.badge(cert.type),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (cert) => TableRenderers.statusBadge(cert.status.toLowerCase(), 'sm'),
    },
    {
      key: 'expiration',
      header: 'Expiration',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (cert) => <span className="text-gray-400">{cert.expiration}</span>,
    },
    {
      key: 'arn',
      header: 'ARN',
      width: 'w-[30%]',
      align: 'center' as const,
      render: (cert) => TableRenderers.code(cert.arn),
    },
  ];

  // Common actions for all tables
  const createActions = <T,>(): TableAction<T>[] => [
    {
      icon: Eye,
      label: 'View',
      onClick: (item) => detailsDialog.open(item),
      tooltip: 'View details',
    },
    {
      icon: Edit2,
      label: 'Edit',
      onClick: (item: any) => {
        toast.info(`Editing: ${item.name || item.domain}`);
      },
      tooltip: 'Edit item',
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: (item: any) => {
        toast.info(`Deleting: ${item.name || item.domain}`);
      },
      tooltip: 'Delete item',
    },
  ];

  const configFilterOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'network', label: 'Network' },
    { value: 'identity', label: 'Identity' },
    { value: 'encryption', label: 'Encryption' },
  ];

  const keyPairFilterOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'RSA', label: 'RSA' },
    { value: 'ED25519', label: 'ED25519' },
  ];

  const certificateFilterOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'Issued', label: 'Issued' },
    { value: 'Pending', label: 'Pending' },
  ];

  const firewallRuleFilterOptions = [
    { value: 'all', label: 'All VPCs' },
    { value: 'vpc-12345', label: 'vpc-12345' },
  ];

  const iamRoleFilterOptions = [
    { value: 'all', label: 'All Policies' },
    { value: 'EC2', label: 'EC2' },
    { value: 'Lambda', label: 'Lambda' },
  ];

  const renderWizardStep = () => {
    switch (configWizard.currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Configuration Name</Label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="prod-network-config"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={configDescription}
                onChange={(e) => setConfigDescription(e.target.value)}
                placeholder="Describe your security configuration..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Configuration Type</Label>
              <Select value={configType} onValueChange={setConfigType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="network">Network Security</SelectItem>
                  <SelectItem value="identity">Identity & Access</SelectItem>
                  <SelectItem value="encryption">Encryption</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Configure Security Rules</h3>
            <p className="text-sm text-gray-400">Add security rules and policies for this configuration.</p>
            {/* Additional configuration fields would go here */}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Review Configuration</h3>
            <Card className="bg-muted border-input p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span>{configName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Description:</span>
                  <span className="max-w-[200px] truncate">{configDescription || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span>{configType}</span>
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  const renderKeyPairWizardStep = () => {
    switch (keyPairWizard.currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Key Pair Name</Label>
              <Input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="my-ssh-key"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={keyDescription}
                onChange={(e) => setKeyDescription(e.target.value)}
                placeholder="Describe this key pair..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Key Type</Label>
              <Select value={keyType} onValueChange={setKeyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ed25519">ED25519 (Recommended)</SelectItem>
                  <SelectItem value="rsa">RSA (2048-bit)</SelectItem>
                  <SelectItem value="rsa4096">RSA (4096-bit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Generation Options</h3>
            <p className="text-sm text-gray-400">Configure additional options for key generation.</p>
            <div className="space-y-2">
              <Label>Passphrase (Optional)</Label>
              <Input
                type="password"
                value={keyPassphrase}
                onChange={(e) => setKeyPassphrase(e.target.value)}
                placeholder="Enter a passphrase for additional security"
              />
            </div>
            <div className="space-y-2">
              <Label>Save Location</Label>
              <Input
                value={keySaveLocation}
                onChange={(e) => setKeySaveLocation(e.target.value)}
                placeholder="~/.ssh/"
              />
              <p className="text-xs text-gray-400">Directory where the key files will be saved</p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Review & Generate</h3>
            <Card className="bg-muted border-input p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span>{keyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span>{keyType.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Passphrase:</span>
                  <span>{keyPassphrase ? 'Set' : 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Save Location:</span>
                  <span>{keySaveLocation}</span>
                </div>
              </div>
            </Card>
            {generatedKey && (
              <div className="space-y-2">
                <Label>Generated Key Details</Label>
                <div className="bg-black p-3 rounded font-mono text-sm text-green-400">
                  <div>Fingerprint: {generatedKey.fingerprint}</div>
                  <div>Public Key: {generatedKey.publicKey.substring(0, 50)}...</div>
                  <div>Private Key Path: {generatedKey.privateKeyPath}</div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  const renderIAMRoleWizardStep = () => {
    switch (iamRoleWizard.currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="my-iam-role"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Describe this IAM role..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Trusted Entity Type</Label>
              <Select value={trustPolicy} onValueChange={setTrustPolicy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ec2">EC2 Instance</SelectItem>
                  <SelectItem value="lambda">Lambda Function</SelectItem>
                  <SelectItem value="ecs">ECS Task</SelectItem>
                  <SelectItem value="custom">Custom Trust Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Attach Permissions</h3>
            <p className="text-sm text-gray-400">Select managed policies and configure inline policies for this role.</p>
            <div className="space-y-2">
              <Label>Managed Policies</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-input rounded p-2">
                {[
                  'AmazonEC2ReadOnlyAccess',
                  'AmazonS3FullAccess',
                  'CloudWatchLogsFullAccess',
                  'AmazonEC2ContainerRegistryReadOnly'
                ].map((policy) => (
                  <div key={policy} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={policy}
                      checked={selectedPolicies.includes(policy)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPolicies([...selectedPolicies, policy]);
                        } else {
                          setSelectedPolicies(selectedPolicies.filter(p => p !== policy));
                        }
                      }}
                    />
                    <label htmlFor={policy} className="text-sm">{policy}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Inline Policy (JSON)</Label>
              <Textarea
                value={inlinePolicy}
                onChange={(e) => setInlinePolicy(e.target.value)}
                placeholder='{"Version": "2012-10-17", "Statement": [...]}'
                rows={4}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Review & Create</h3>
            <Card className="bg-muted border-input p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Role Name:</span>
                  <span>{roleName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Description:</span>
                  <span className="max-w-[200px] truncate">{roleDescription || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trusted Entity:</span>
                  <span>{trustPolicy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Managed Policies:</span>
                  <span>{selectedPolicies.length > 0 ? selectedPolicies.join(', ') : 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Inline Policy:</span>
                  <span>{inlinePolicy ? 'Defined' : 'None'}</span>
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  const renderFirewallRuleWizardStep = () => {
    switch (firewallRuleWizard.currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Security Group Name</Label>
              <Input
                value={ruleSetName}
                onChange={(e) => setRuleSetName(e.target.value)}
                placeholder="my-security-group"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={ruleSetDescription}
                onChange={(e) => setRuleSetDescription(e.target.value)}
                placeholder="Describe this security group..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>VPC ID</Label>
              <Input
                value={vpcId}
                onChange={(e) => setVpcId(e.target.value)}
                placeholder="vpc-12345678"
              />
            </div>
            <div className="space-y-2">
              <Label>Rule Preset</Label>
              <Select value={rulePreset} onValueChange={setRulePreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Rules</SelectItem>
                  <SelectItem value="web">Web Server</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="ml-training">ML Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Configure Rules</h3>
            <p className="text-sm text-gray-400">Define inbound and outbound rules for this security group.</p>
            <div className="space-y-4">
              <div>
                <Label className="text-base">Inbound Rules</Label>
                <div className="space-y-2 mt-2">
                  {inboundRules.map((rule, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Protocol</Label>
                        <Select value={rule.protocol} onValueChange={(value) => {
                          const newRules = [...inboundRules];
                          newRules[index].protocol = value;
                          setInboundRules(newRules);
                        }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tcp">TCP</SelectItem>
                            <SelectItem value="udp">UDP</SelectItem>
                            <SelectItem value="icmp">ICMP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Port Range</Label>
                        <Input
                          value={rule.portRange}
                          onChange={(e) => {
                            const newRules = [...inboundRules];
                            newRules[index].portRange = e.target.value;
                            setInboundRules(newRules);
                          }}
                          placeholder="22 or 80-443"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Source</Label>
                        <Input
                          value={rule.source}
                          onChange={(e) => {
                            const newRules = [...inboundRules];
                            newRules[index].source = e.target.value;
                            setInboundRules(newRules);
                          }}
                          placeholder="0.0.0.0/0"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInboundRules(inboundRules.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setInboundRules([...inboundRules, { protocol: 'tcp', portRange: '', source: '', description: '' }])}
                  >
                    Add Inbound Rule
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-base">Outbound Rules</Label>
                <div className="space-y-2 mt-2">
                  {outboundRules.map((rule, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Protocol</Label>
                        <Select value={rule.protocol} onValueChange={(value) => {
                          const newRules = [...outboundRules];
                          newRules[index].protocol = value;
                          setOutboundRules(newRules);
                        }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tcp">TCP</SelectItem>
                            <SelectItem value="udp">UDP</SelectItem>
                            <SelectItem value="icmp">ICMP</SelectItem>
                            <SelectItem value="-1">All</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Port Range</Label>
                        <Input
                          value={rule.portRange}
                          onChange={(e) => {
                            const newRules = [...outboundRules];
                            newRules[index].portRange = e.target.value;
                            setOutboundRules(newRules);
                          }}
                          placeholder="All"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Destination</Label>
                        <Input
                          value={rule.destination}
                          onChange={(e) => {
                            const newRules = [...outboundRules];
                            newRules[index].destination = e.target.value;
                            setOutboundRules(newRules);
                          }}
                          placeholder="0.0.0.0/0"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOutboundRules(outboundRules.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setOutboundRules([...outboundRules, { protocol: 'tcp', portRange: '', destination: '', description: '' }])}
                  >
                    Add Outbound Rule
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Review & Create</h3>
            <Card className="bg-muted border-input p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span>{ruleSetName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Description:</span>
                  <span className="max-w-[200px] truncate">{ruleSetDescription || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">VPC ID:</span>
                  <span>{vpcId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Preset:</span>
                  <span>{rulePreset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Inbound Rules:</span>
                  <span>{inboundRules.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Outbound Rules:</span>
                  <span>{outboundRules.length}</span>
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  const renderCertificateWizardStep = () => {
    switch (certificateWizard.currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Primary Domain</Label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Domains (Optional)</Label>
              <div className="space-y-2">
                {additionalDomains.map((domain, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={domain}
                      onChange={(e) => {
                        const newDomains = [...additionalDomains];
                        newDomains[index] = e.target.value;
                        setAdditionalDomains(newDomains);
                      }}
                      placeholder="www.example.com"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdditionalDomains(additionalDomains.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setAdditionalDomains([...additionalDomains, ''])}
                >
                  Add Domain
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="wildcard"
                checked={isWildcard}
                onChange={(e) => setIsWildcard(e.target.checked)}
              />
              <Label htmlFor="wildcard">Include wildcard certificate (*.domain.com)</Label>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Validation Options</h3>
            <p className="text-sm text-gray-400">Choose how to validate domain ownership.</p>
            <div className="space-y-2">
              <Label>Validation Method</Label>
              <Select value={validationMethod} onValueChange={setValidationMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNS">DNS Validation</SelectItem>
                  <SelectItem value="EMAIL">Email Validation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>AWS Region</Label>
              <Select value={certRegion} onValueChange={setCertRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-medium">Review & Request</h3>
            <Card className="bg-muted border-input p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Primary Domain:</span>
                  <span>{domain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Additional Domains:</span>
                  <span>{additionalDomains.length > 0 ? additionalDomains.join(', ') : 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Wildcard:</span>
                  <span>{isWildcard ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Validation Method:</span>
                  <span>{validationMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Region:</span>
                  <span>{certRegion}</span>
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  // Get appropriate filter options based on active tab
  const getFilterOptions = () => {
    switch (activeTab) {
      case 'configs': return configFilterOptions;
      case 'keypairs': return keyPairFilterOptions;
      case 'certificates': return certificateFilterOptions;
      case 'firewall-rules': return firewallRuleFilterOptions;
      case 'iam': return iamRoleFilterOptions;
      default: return [];
    }
  };

  const showFilter = ['configs', 'keypairs', 'certificates', 'firewall-rules', 'iam'].includes(activeTab);

  return (
    <PageLayout>
      <PageHeader
        title="Security"
        icon={Shield}
        onRefresh={handleRefresh}
      />

      <div className="mb-6">
        <ActionBar
          onCreateClick={() => {
            switch (activeTab) {
              case 'configs': configWizard.open(); break;
              case 'keypairs': keyPairWizard.open(); break;
              case 'firewall-rules': firewallRuleWizard.open(); break;
              case 'iam': iamRoleWizard.open(); break;
              case 'certificates': certificateWizard.open(); break;
            }
          }}
          createLabel={`Create ${activeTab === 'configs' ? 'Configuration' : activeTab === 'keypairs' ? 'Key Pair' : activeTab === 'firewall-rules' ? 'Firewall Rule' : activeTab === 'iam' ? 'IAM Role' : 'Certificate'}`}
          searchValue={currentFilters.searchQuery}
          onSearchChange={currentFilters.setSearchQuery}
          searchPlaceholder="Search..."
          filterValue={currentFilters.filterValue}
          onFilterChange={currentFilters.setFilterValue}
          filterOptions={getFilterOptions()}
          showFilter={showFilter}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="configs">Configurations</TabsTrigger>
          <TabsTrigger value="keypairs">Key Pairs</TabsTrigger>
          <TabsTrigger value="firewall-rules">Firewall Rules</TabsTrigger>
          <TabsTrigger value="iam">IAM Roles</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="mt-0">
          <DataTable
            data={configsFilters.filteredData}
            columns={configColumns}
            actions={createActions<SecurityConfig>()}
            getRowId={(config) => config.id}
            emptyState={{
              icon: Shield,
              title: 'No Security Configurations',
              description: 'Create security configurations to manage access control and encryption settings for your infrastructure.',
              actionLabel: 'Create Configuration',
              onAction: configWizard.open,
            }}
          />
        </TabsContent>

        <TabsContent value="keypairs" className="mt-0">
          <DataTable
            data={keyPairsFilters.filteredData}
            columns={keyPairColumns}
            actions={createActions<KeyPair>()}
            getRowId={(kp) => kp.id}
            emptyState={{
              icon: Key,
              title: 'No SSH Key Pairs',
              description: 'Generate SSH key pairs to securely connect to your instances.',
              actionLabel: 'Generate Key Pair',
              onAction: keyPairWizard.open,
            }}
          />
        </TabsContent>

        <TabsContent value="firewall-rules" className="mt-0">
          <DataTable
            data={firewallRulesFilters.filteredData}
            columns={firewallRuleColumns}
            actions={createActions<FirewallRule>()}
            getRowId={(sg) => sg.id}
            emptyState={{
              icon: Lock,
              title: 'No Firewall Rules',
              description: 'Define firewall rules to control inbound and outbound traffic to your instances.',
              actionLabel: 'Create Firewall Rule',
              onAction: firewallRuleWizard.open,
            }}
          />
        </TabsContent>

        <TabsContent value="iam" className="mt-0">
          <DataTable
            data={iamRolesFilters.filteredData}
            columns={iamRoleColumns}
            actions={createActions<IAMRole>()}
            getRowId={(role) => role.id}
            emptyState={{
              icon: Users,
              title: 'No IAM Roles',
              description: 'Create IAM roles to grant specific permissions and access controls to your resources.',
              actionLabel: 'Create IAM Role',
              onAction: iamRoleWizard.open,
            }}
          />
        </TabsContent>

        <TabsContent value="certificates" className="mt-0">
          <DataTable
            data={certificatesFilters.filteredData}
            columns={certificateColumns}
            actions={createActions<Certificate>()}
            getRowId={(cert) => cert.id}
            emptyState={{
              icon: Award,
              title: 'No SSL/TLS Certificates',
              description: 'Manage SSL/TLS certificates to enable secure HTTPS connections for your applications.',
              actionLabel: 'Request Certificate',
              onAction: certificateWizard.open,
            }}
          />
        </TabsContent>
      </Tabs>

       {/* Create Configuration Wizard */}
       <CreationWizard
         open={configWizard.isOpen}
         onOpenChange={configWizard.setIsOpen}
         title="Create Security Configuration"
         description="Configure your security settings"
         icon={Shield}
         currentStep={configWizard.currentStep}
         totalSteps={3}
         onNext={configWizard.nextStep}
         onPrevious={!configWizard.isFirstStep ? configWizard.previousStep : undefined}
         onCancel={configWizard.cancel}
         nextLabel={configWizard.isLastStep ? 'Create Configuration' : 'Next'}
         nextDisabled={configWizard.currentStep === 1 && !configName}
         size="md"
       >
         {renderWizardStep()}
       </CreationWizard>

       {/* SSH Key Pair Wizard */}
       <CreationWizard
         open={keyPairWizard.isOpen}
         onOpenChange={keyPairWizard.setIsOpen}
         title="Create SSH Key Pair"
         description="Generate a new SSH key pair"
         icon={Key}
         currentStep={keyPairWizard.currentStep}
         totalSteps={3}
         onNext={keyPairWizard.nextStep}
         onPrevious={!keyPairWizard.isFirstStep ? keyPairWizard.previousStep : undefined}
         onCancel={keyPairWizard.cancel}
         nextLabel={keyPairWizard.isLastStep ? 'Generate Key Pair' : 'Next'}
         nextDisabled={keyPairWizard.currentStep === 1 && !keyName}
         size="md"
       >
         {renderKeyPairWizardStep()}
       </CreationWizard>

       {/* IAM Role Wizard */}
       <CreationWizard
         open={iamRoleWizard.isOpen}
         onOpenChange={iamRoleWizard.setIsOpen}
         title="Create IAM Role"
         description="Create a new IAM role with permissions"
         icon={Users}
         currentStep={iamRoleWizard.currentStep}
         totalSteps={3}
         onNext={iamRoleWizard.nextStep}
         onPrevious={!iamRoleWizard.isFirstStep ? iamRoleWizard.previousStep : undefined}
         onCancel={iamRoleWizard.cancel}
         nextLabel={iamRoleWizard.isLastStep ? 'Create Role' : 'Next'}
         nextDisabled={iamRoleWizard.currentStep === 1 && !roleName}
         size="md"
       >
         {renderIAMRoleWizardStep()}
       </CreationWizard>

       {/* Firewall Rule Wizard */}
       <CreationWizard
         open={firewallRuleWizard.isOpen}
         onOpenChange={firewallRuleWizard.setIsOpen}
         title="Create Firewall Rule"
         description="Create a new security group with rules"
         icon={Lock}
         currentStep={firewallRuleWizard.currentStep}
         totalSteps={3}
         onNext={firewallRuleWizard.nextStep}
         onPrevious={!firewallRuleWizard.isFirstStep ? firewallRuleWizard.previousStep : undefined}
         onCancel={firewallRuleWizard.cancel}
         nextLabel={firewallRuleWizard.isLastStep ? 'Create Security Group' : 'Next'}
         nextDisabled={firewallRuleWizard.currentStep === 1 && !ruleSetName}
         size="lg"
       >
         {renderFirewallRuleWizardStep()}
       </CreationWizard>

       {/* Certificate Wizard */}
       <CreationWizard
         open={certificateWizard.isOpen}
         onOpenChange={certificateWizard.setIsOpen}
         title="Request SSL Certificate"
         description="Request a new SSL/TLS certificate"
         icon={Award}
         currentStep={certificateWizard.currentStep}
         totalSteps={3}
         onNext={certificateWizard.nextStep}
         onPrevious={!certificateWizard.isFirstStep ? certificateWizard.previousStep : undefined}
         onCancel={certificateWizard.cancel}
         nextLabel={certificateWizard.isLastStep ? 'Request Certificate' : 'Next'}
         nextDisabled={certificateWizard.currentStep === 1 && !domain}
         size="md"
       >
         {renderCertificateWizardStep()}
       </CreationWizard>

      {/* Security Details Dialog */}
      <SecurityDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        securityConfig={detailsDialog.data}
      />
    </PageLayout>
  );
}