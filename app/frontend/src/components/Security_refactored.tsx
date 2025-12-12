import { useState, useEffect } from 'react';
import { Shield, Key, Lock, Users, Award, Eye, Trash2, Edit2, Copy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
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

interface SecurityGroup {
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
  const [securityGroups, setSecurityGroups] = useState([]);
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
        setSecurityGroups([]);
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

  const securityGroupsFilters = useDataFilters({
    data: securityGroups,
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
    totalSteps: 2,
    onComplete: () => {
      toast.success('Key pair created!');
    },
  });

  const detailsDialog = useDialog<any>();

  // Form state
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [configType, setConfigType] = useState('network');

  const resetConfigForm = () => {
    setConfigName('');
    setConfigDescription('');
    setConfigType('network');
  };

  const handleRefresh = () => {
    toast.success('Security resources refreshed');
  };

  // Get current filters based on active tab
  const getCurrentFilters = () => {
    switch (activeTab) {
      case 'configs': return configsFilters;
      case 'keypairs': return keyPairsFilters;
      case 'security-groups': return securityGroupsFilters;
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

  // Table columns for Security Groups
  const securityGroupColumns: TableColumn<SecurityGroup>[] = [
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

  const securityGroupFilterOptions = [
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

  // Get appropriate filter options based on active tab
  const getFilterOptions = () => {
    switch (activeTab) {
      case 'configs': return configFilterOptions;
      case 'keypairs': return keyPairFilterOptions;
      case 'certificates': return certificateFilterOptions;
      case 'security-groups': return securityGroupFilterOptions;
      case 'iam': return iamRoleFilterOptions;
      default: return [];
    }
  };

  const showFilter = ['configs', 'keypairs', 'certificates', 'security-groups', 'iam'].includes(activeTab);

  return (
    <PageLayout>
      <PageHeader
        title="Security"
        icon={Shield}
        onRefresh={handleRefresh}
      />

      <div className="mb-6">
        <ActionBar
          onCreateClick={configWizard.open}
          createLabel={`Create ${activeTab === 'configs' ? 'Configuration' : activeTab === 'keypairs' ? 'Key Pair' : activeTab === 'security-groups' ? 'Security Group' : activeTab === 'iam' ? 'IAM Role' : 'Certificate'}`}
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
          <TabsTrigger value="security-groups">Security Groups</TabsTrigger>
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
              actionLabel: 'Add Key Pair',
              onAction: keyPairWizard.open,
            }}
          />
        </TabsContent>

        <TabsContent value="security-groups" className="mt-0">
          <DataTable
            data={securityGroupsFilters.filteredData}
            columns={securityGroupColumns}
            actions={createActions<SecurityGroup>()}
            getRowId={(sg) => sg.id}
            emptyState={{
              icon: Lock,
              title: 'No Security Groups',
              description: 'Define security groups to control inbound and outbound traffic to your instances.',
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

      {/* Security Details Dialog */}
      <SecurityDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        securityConfig={detailsDialog.data}
      />
    </PageLayout>
  );
}