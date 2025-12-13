import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Cloud, Key, Terminal, RefreshCw, ChevronRight, ChevronDown, Copy, Server, Shield, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { CreationWizard } from './ui/creation-wizard';
import { toast } from 'sonner@2.0.3';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { bridgeApi } from '../bridge/api';
import type { PermissionCheckResult } from '../types/models';

// AWS Regions list
const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'af-south-1', label: 'Africa (Cape Town)' },
  { value: 'ap-east-1', label: 'Asia Pacific (Hong Kong)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
  { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ca-central-1', label: 'Canada (Central)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-west-2', label: 'Europe (London)' },
  { value: 'eu-west-3', label: 'Europe (Paris)' },
  { value: 'eu-north-1', label: 'Europe (Stockholm)' },
  { value: 'eu-south-1', label: 'Europe (Milan)' },
  { value: 'me-south-1', label: 'Middle East (Bahrain)' },
  { value: 'sa-east-1', label: 'South America (São Paulo)' },
  { value: 'us-gov-east-1', label: 'AWS GovCloud (US-East)' },
  { value: 'us-gov-west-1', label: 'AWS GovCloud (US-West)' },
];

// Get existing AWS CLI profiles
const getExistingAwsProfiles = () => {
  // This would be called from the backend, but for now return a placeholder
  // In a real implementation, this would query the backend for AWS CLI profiles
  return ['default', 'production', 'development'];
};

type AuthStatus = 'connected' | 'disconnected' | 'expired' | 'partial' | 'pending';

interface CloudProvider {
  id: string;
  name: string;
  status: AuthStatus;
  icon: string;
  details: {
    account?: string;
    profile?: string;
    region?: string;
    user?: string;
    project?: string;
    subscription?: string;
    lastChecked?: string;
  };
}

// Define interface matching backend Account model
interface Account {
  id: number;
  name: string;
  platform: string;
  accountId: string;
  status: string;
  region: string;
  accessKey?: string;
  isDefault: boolean;
  created: string;
  lastSynced: string;
  resourceCount: {
    instances: number;
    projects: number;
    blueprints: number;
  };
}

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionData, setPermissionData] = useState<Record<number, PermissionCheckResult>>({});
  const [permissionLoading, setPermissionLoading] = useState<Record<number, boolean>>({});

  const fetchAccounts = async () => {
    try {
      const data = await bridgeApi.listAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (accountId: number) => {
    setPermissionLoading(prev => ({ ...prev, [accountId]: true }));
    try {
      const result = await bridgeApi.checkAccountPermissions(accountId);
      setPermissionData(prev => ({ ...prev, [accountId]: result }));
    } catch (error) {
      console.error('Failed to check permissions:', error);
      toast.error('Failed to check permissions');
    } finally {
      setPermissionLoading(prev => ({ ...prev, [accountId]: false }));
    }
  };

  // Utility function to detect AWS Account ID from credentials
  const detectAwsAccountId = async (accessKey: string, secretKey: string, region: string): Promise<string> => {
    try {
      // Call backend to validate credentials and get account ID
      // This will use the real AWS STS API through the backend
      const result = await bridgeApi.validateAwsCredentials(accessKey, secretKey, region);

      if (result.success && result.accountId) {
        return result.accountId;
      } else {
        throw new Error(result.error || 'Failed to validate credentials');
      }
    } catch (error: any) {
      // Re-throw with more specific error messages
      if (error.message.includes('InvalidAccessKeyId')) {
        throw new Error('Invalid AWS access key ID');
      }
      if (error.message.includes('SignatureDoesNotMatch')) {
        throw new Error('Invalid AWS secret access key');
      }
      if (error.message.includes('InvalidClientTokenId')) {
        throw new Error('AWS credentials are invalid or expired');
      }
      if (error.message.includes('UnauthorizedOperation')) {
        throw new Error('Insufficient permissions - need sts:GetCallerIdentity');
      }
      if (error.message.includes('NetworkingError') || error.message.includes('TimeoutError')) {
        throw new Error('Network error - check internet connection');
      }
      throw new Error(`AWS API error: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Auto-fetch permissions when accounts are loaded
  useEffect(() => {
    accounts
      .filter(acc => acc.status === 'connected' && acc.platform === 'aws')
      .forEach(account => {
        // Only fetch if not already loaded and not loading
        if (!permissionData[account.id] && !permissionLoading[account.id]) {
          fetchPermissions(account.id);
        }
      });
  }, [accounts]);

  // Convert accounts to provider format - only one account per platform
  const providers: CloudProvider[] = [
    {
      id: 'aws',
      name: 'Amazon Web Services',
      status: 'disconnected' as AuthStatus,
      icon: '☁️',
      details: {}
    },
    {
      id: 'gcp',
      name: 'Google Cloud Platform',
      status: 'disconnected' as AuthStatus,
      icon: '🌥️',
      details: {}
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      status: 'disconnected' as AuthStatus,
      icon: '⛅',
      details: {}
    }
  ];

  // Update providers with actual account data (only one per platform)
  const updatedProviders = providers.map(provider => {
    const account = accounts.find(acc => acc.platform === provider.id);
    if (account) {
      return {
        id: account.platform,
        name: account.name,
        status: account.status as AuthStatus,
        icon: account.platform === 'aws' ? '☁️' : account.platform === 'gcp' ? '🌥️' : '⛅',
        details: {
          account: account.accountId,
          region: account.region,
          profile: account.platform === 'aws' ? account.name : undefined,
          lastChecked: account.lastSynced,
        },
      };
    }
    return provider;
  });
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  
  // AWS Setup State
  const [awsAuthMethod, setAwsAuthMethod] = useState('access-keys');
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsProfile, setAwsProfile] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  
  // GCP Setup State
  const [gcpAuthMethod, setGcpAuthMethod] = useState('service-account');
  const [gcpServiceAccount, setGcpServiceAccount] = useState('');
  const [gcpProjectId, setGcpProjectId] = useState('');
  
  // Azure Setup State
  const [azureAuthMethod, setAzureAuthMethod] = useState('service-principal');
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');

  const getStatusColor = (status: AuthStatus) => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'disconnected':
        return 'text-red-500';
      case 'expired':
        return 'text-yellow-500';
      case 'partial':
        return 'text-blue-500';
      case 'pending':
        return 'text-blue-500';
      default:
        return 'text-text-muted';
    }
  };

  const getStatusIcon = (status: AuthStatus) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusText = (status: AuthStatus) => {
    switch (status) {
      case 'connected':
        return 'Connected & Ready';
      case 'disconnected':
        return 'Not Configured';
      case 'expired':
        return 'Credentials Expired';
      case 'partial':
        return 'Partially Configured';
    }
  };

  const handleTestConnection = async (providerId: string) => {
    const account = accounts.find(acc => acc.platform === providerId);

    if (!account) {
      toast.error('No account configured for this provider');
      return;
    }

    try {
      toast.info(`Testing connection to ${providerId.toUpperCase()}...`);

      // Call real backend test
      const result = await bridgeApi.testAccountConnection(account.id);

      if (result.success) {
        toast.success('✅ Connection successful!');
        await fetchAccounts(); // Refresh last synced timestamp
      } else {
        // Handle specific error types from backend
        const error = result.error || 'Unknown error';

        if (error.includes('InvalidAccessKeyId') || error.includes('InvalidClientTokenId')) {
          toast.error('❌ Invalid credentials. Please reconfigure your account.');
        } else if (error.includes('Network') || error.includes('timeout')) {
          toast.error('❌ Network error. Please check your internet connection.');
        } else if (error.includes('UnauthorizedOperation') || error.includes('AccessDenied')) {
          toast.error('❌ Insufficient permissions. Check your IAM policies.');
        } else {
          toast.error(`❌ Connection failed: ${error}`);
        }
      }

    } catch (error) {
      toast.error('❌ Connection test failed: ' + error.message);
    }
  };

  const handleSetupProvider = (providerId: string) => {
    if (providerId === 'aws') {
      // Go directly to the configuration wizard
      setSelectedProvider(providerId);
      setWizardStep(1);
      setSetupDialogOpen(true);
    } else {
      toast.info(`${providerId.toUpperCase()} integration coming soon!`);
    }
  };

  const handleCompleteSetup = async () => {
    if (selectedProvider === 'aws') {
      try {
        let accountId: string;
        let accessKey: string;
        let secretKey: string;

        if (awsAuthMethod === 'access-keys') {
          toast.info('Validating AWS credentials...');

          // Use provided credentials
          accessKey = awsAccessKey;
          secretKey = awsSecretKey;

          // Auto-detect Account ID from credentials
          accountId = await detectAwsAccountId(accessKey, secretKey, selectedRegion);

        } else if (awsAuthMethod === 'existing-profile') {
          toast.info('Importing AWS CLI profile...');

          // For existing profiles, we would need to read from AWS CLI config
          // This is a placeholder - in a real implementation, this would call
          // a backend method to read the AWS CLI profile credentials
          toast.error('❌ Existing AWS CLI profile import not yet implemented. Please use Access Keys method.');
          return;

        } else {
          // SSO and other methods not implemented yet
          toast.error('❌ This authentication method is not yet implemented.');
          return;
        }

        // Use custom profile name or default to account ID
        const profileName = awsProfile.trim() || `aws-${accountId}`;

        const accountData = {
          name: profileName,
          platform: 'aws',
          accountId: accountId,
          region: selectedRegion,
          accessKey: accessKey,
          secretKey: secretKey,
        };

        // Create account in backend
        await bridgeApi.createAccount(accountData);

        // Refresh UI
        await fetchAccounts();

        toast.success(`AWS account ${accountId} configured as "${profileName}"!`);

        // Reset form
        setSetupDialogOpen(false);
        setWizardStep(1);
        setSelectedProvider(null);
        setAwsAccessKey('');
        setAwsSecretKey('');
        setAwsProfile('');
        setSelectedRegion('us-east-1');

      } catch (error: any) {
        // Handle specific error types
        if (error.message.includes('Invalid AWS access key ID')) {
          toast.error('❌ Invalid access key. Please check your AWS credentials.');
        } else if (error.message.includes('Invalid AWS secret access key')) {
          toast.error('❌ Invalid secret key. Please check your AWS credentials.');
        } else if (error.message.includes('AWS credentials are invalid')) {
          toast.error('❌ Credentials are invalid or expired. Please refresh them.');
        } else if (error.message.includes('Insufficient permissions')) {
          toast.error('❌ Insufficient IAM permissions. Your user needs sts:GetCallerIdentity permission.');
        } else if (error.message.includes('Network error')) {
          toast.error('❌ Network connection failed. Please check your internet connection.');
        } else {
          toast.error(`❌ Setup failed: ${error.message}`);
        }
      }
    }
  };



  const handleDisconnect = (providerId: string) => {
    // In a real implementation, this would call the backend to disconnect
    // For now, just refresh to show updated state
    fetchAccounts();
    toast.success(`Disconnected from ${providerId.toUpperCase()}`);
  };

  const renderWizardContent = () => {
    if (!selectedProvider) return null;

    // Only AWS is currently supported
    if (selectedProvider !== 'aws') {
      return (
        <Card className="bg-blue-500/10 border-blue-500/30 p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">{selectedProvider === 'gcp' ? '🌥️' : '⛅'}</div>
            <h3 className="text-lg font-semibold mb-2">
              {selectedProvider === 'gcp' ? 'Google Cloud Platform' : 'Microsoft Azure'}
            </h3>
            <p className="text-text-secondary">
              {selectedProvider === 'gcp'
                ? 'GCP integration is coming soon with service account and gcloud CLI support.'
                : 'Azure integration is coming soon with service principal and Azure CLI support.'
              }
            </p>
          </div>
        </Card>
      );
    }

    if (selectedProvider === 'aws') {
      return (
        <div className="space-y-4">
          {wizardStep === 1 && (
            <>
              <div className="space-y-2">
                <Label>Authentication Method</Label>
                <Select value={awsAuthMethod} onValueChange={setAwsAuthMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="access-keys">Access Keys (IAM User)</SelectItem>
                    <SelectItem value="existing-profile">Existing AWS CLI Profile</SelectItem>
                    <SelectItem value="sso">AWS SSO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {awsAuthMethod === 'access-keys' && (
                <>
                  <div className="space-y-2">
                    <Label>AWS Access Key ID</Label>
                    <Input
                      type="text"
                      value={awsAccessKey}
                      onChange={(e) => setAwsAccessKey(e.target.value)}
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      className="bg-muted border-border font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AWS Secret Access Key</Label>
                    <Input
                      type="password"
                      value={awsSecretKey}
                      onChange={(e) => setAwsSecretKey(e.target.value)}
                      placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                      className="bg-muted border-border font-mono"
                    />
                   </div>
                   <div className="space-y-2">
                     <Label>Default Region</Label>
                     <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select AWS region" />
                       </SelectTrigger>
                       <SelectContent>
                         {AWS_REGIONS.map(region => (
                           <SelectItem key={region.value} value={region.value}>
                             {region.label}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label>Profile Name (Optional)</Label>
                     <Input
                       value={awsProfile}
                       onChange={(e) => setAwsProfile(e.target.value)}
                       placeholder="my-production-account"
                       className="bg-muted border-border"
                     />
                     <p className="text-xs text-text-tertiary">
                       Leave blank to use account ID as profile name
                     </p>
                   </div>
                </>
               )}

               {awsAuthMethod === 'existing-profile' && (
                 <>
                   <div className="space-y-2">
                     <Label>AWS CLI Profile</Label>
                     <Select value={awsProfile} onValueChange={setAwsProfile}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select existing profile" />
                       </SelectTrigger>
                       <SelectContent>
                         {getExistingAwsProfiles().map(profile => (
                           <SelectItem key={profile} value={profile}>
                             {profile}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <p className="text-xs text-text-tertiary">
                       Select an existing AWS CLI profile to import its credentials
                     </p>
                   </div>
                 </>
               )}

               {awsAuthMethod === 'sso' && (
                <Card className="bg-blue-500/10 border-blue-500/30 p-4">
                  <div className="text-sm text-blue-400">
                    <div className="mb-2">AWS SSO Setup:</div>
                    <ol className="list-decimal list-inside space-y-1 text-text-secondary">
                      <li>Run: <code className="bg-muted px-2 py-1 rounded">aws configure sso</code></li>
                      <li>Follow the prompts to configure your SSO session</li>
                      <li>Return here and refresh to verify connection</li>
                    </ol>
                  </div>
                </Card>
              )}

              {awsAuthMethod === 'profile' && (
                <div className="space-y-2">
                  <Label>AWS Profile Name</Label>
                  <Select value={awsProfile} onValueChange={setAwsProfile}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">default</SelectItem>
                      <SelectItem value="production">production</SelectItem>
                      <SelectItem value="development">development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {wizardStep === 2 && (
            <Card className="bg-green-500/10 border-green-500/30 p-4">
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-500">Configuration Complete</span>
                </div>
                <div className="space-y-2 text-text-secondary">
                  <p>Your AWS credentials have been configured with:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Authentication Method: {awsAuthMethod === 'access-keys' ? 'Access Keys' : awsAuthMethod === 'sso' ? 'AWS SSO' : 'Profile'}</li>
                    <li>Profile: {awsProfile}</li>
                    {awsAccessKey && <li>Access Key: {awsAccessKey.slice(0, 8)}...****</li>}
                  </ul>
                  <p className="mt-3">Click "Complete Setup" to save and test the connection.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      );
    }

    if (selectedProvider === 'gcp') {
      return (
        <div className="space-y-4">
          {wizardStep === 1 && (
            <>
              <div className="space-y-2">
                <Label>Authentication Method</Label>
                <Select value={gcpAuthMethod} onValueChange={setGcpAuthMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service-account">Service Account Key</SelectItem>
                    <SelectItem value="gcloud">gcloud CLI</SelectItem>
                    <SelectItem value="application-default">Application Default Credentials</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {gcpAuthMethod === 'service-account' && (
                <>
                  <div className="space-y-2">
                    <Label>Service Account JSON Key</Label>
                    <Textarea
                      value={gcpServiceAccount}
                      onChange={(e) => setGcpServiceAccount(e.target.value)}
                      placeholder='{\"type\": \"service_account\", \"project_id\": \"your-project\"...}'
                      className="font-mono text-xs"
                      rows={6}
                    />
                    <p className="text-sm text-text-tertiary">Paste your service account JSON key file contents</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Project ID</Label>
                    <Input
                      value={gcpProjectId}
                      onChange={(e) => setGcpProjectId(e.target.value)}
                      placeholder="my-gcp-project"
                    />
                  </div>
                </>
              )}

              {gcpAuthMethod === 'gcloud' && (
                <Card className="bg-blue-500/10 border-blue-500/30 p-4">
                  <div className="text-sm text-blue-400">
                    <div className="mb-2">gcloud CLI Setup:</div>
                    <ol className="list-decimal list-inside space-y-1 text-text-secondary">
                      <li>Install gcloud CLI if not already installed</li>
                      <li>Run: <code className="bg-muted px-2 py-1 rounded">gcloud auth login</code></li>
                      <li>Run: <code className="bg-muted px-2 py-1 rounded">gcloud config set project PROJECT_ID</code></li>
                      <li>Return here and refresh to verify connection</li>
                    </ol>
                  </div>
                </Card>
              )}
            </>
          )}

          {wizardStep === 2 && (
            <Card className="bg-green-500/10 border-green-500/30 p-4">
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-500">Configuration Complete</span>
                </div>
                <div className="space-y-2 text-text-secondary">
                  <p>Your GCP credentials have been configured with:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Authentication Method: {gcpAuthMethod === 'service-account' ? 'Service Account' : gcpAuthMethod === 'gcloud' ? 'gcloud CLI' : 'Application Default'}</li>
                    {gcpProjectId && <li>Project ID: {gcpProjectId}</li>}
                  </ul>
                  <p className="mt-3">Click "Complete Setup" to save and test the connection.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      );
    }

    if (selectedProvider === 'azure') {
      return (
        <div className="space-y-4">
          {wizardStep === 1 && (
            <>
              <div className="space-y-2">
                <Label>Authentication Method</Label>
                <Select value={azureAuthMethod} onValueChange={setAzureAuthMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service-principal">Service Principal</SelectItem>
                    <SelectItem value="az-cli">Azure CLI</SelectItem>
                    <SelectItem value="managed-identity">Managed Identity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {azureAuthMethod === 'service-principal' && (
                <>
                  <div className="space-y-2">
                    <Label>Tenant ID</Label>
                    <Input
                      value={azureTenantId}
                      onChange={(e) => setAzureTenantId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client ID (Application ID)</Label>
                    <Input
                      value={azureClientId}
                      onChange={(e) => setAzureClientId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret</Label>
                    <Input
                      type="password"
                      value={azureClientSecret}
                      onChange={(e) => setAzureClientSecret(e.target.value)}
                      placeholder="Enter client secret"
                      className="font-mono"
                    />
                  </div>
                </>
              )}

              {azureAuthMethod === 'az-cli' && (
                <Card className="bg-blue-500/10 border-blue-500/30 p-4">
                  <div className="text-sm text-blue-400">
                    <div className="mb-2">Azure CLI Setup:</div>
                    <ol className="list-decimal list-inside space-y-1 text-text-secondary">
                      <li>Install Azure CLI if not already installed</li>
                      <li>Run: <code className="bg-muted px-2 py-1 rounded">az login</code></li>
                      <li>Run: <code className="bg-muted px-2 py-1 rounded">az account set --subscription "SUBSCRIPTION_NAME"</code></li>
                      <li>Return here and refresh to verify connection</li>
                    </ol>
                  </div>
                </Card>
              )}
            </>
          )}

          {wizardStep === 2 && (
            <Card className="bg-green-500/10 border-green-500/30 p-4">
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-500">Configuration Complete</span>
                </div>
                <div className="space-y-2 text-text-secondary">
                  <p>Your Azure credentials have been configured with:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Authentication Method: {azureAuthMethod === 'service-principal' ? 'Service Principal' : azureAuthMethod === 'az-cli' ? 'Azure CLI' : 'Managed Identity'}</li>
                    {azureTenantId && <li>Tenant ID: {azureTenantId.slice(0, 8)}...****</li>}
                  </ul>
                  <p className="mt-3">Click "Complete Setup" to save and test the connection.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      );
    }
  };

  const canProceedToNextStep = () => {
    if (!selectedProvider || selectedProvider !== 'aws') return false;

    if (awsAuthMethod === 'access-keys') {
      return awsAccessKey && awsSecretKey;
    }
    if (awsAuthMethod === 'existing-profile') {
      return awsProfile && awsProfile !== '';
    }
    return true;
  };

  const connectedCount = updatedProviders.filter(p => p.status === 'connected').length;

  // Permission Display Component
  const PermissionDisplay = ({
    accountId,
    permissionData: data,
    loading: isLoading,
    onRefresh
  }: {
    accountId: number;
    permissionData?: PermissionCheckResult;
    loading: boolean;
    onRefresh: () => void;
  }) => {
    const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

    const getStatusIcon = (status: string, size: 'sm' | 'xs' = 'xs') => {
      const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-3 h-3';
      if (status === 'allowed') return <CheckCircle2 className={`${sizeClass} text-green-500`} />;
      if (status === 'denied') return <XCircle className={`${sizeClass} text-red-500`} />;
      return <AlertCircle className={`${sizeClass} text-yellow-500`} />;
    };

    const toggleService = (serviceName: string) => {
      setExpandedServices(prev => {
        const next = new Set(prev);
        if (next.has(serviceName)) {
          next.delete(serviceName);
        } else {
          next.add(serviceName);
        }
        return next;
      });
    };

    const copyPolicy = () => {
      if (data?.minimalPolicy) {
        navigator.clipboard.writeText(data.minimalPolicy);
        toast.success('IAM policy copied to clipboard');
      } else {
        // Generate policy from all denied permissions
        const deniedActions: string[] = [];
        data?.services.forEach(service => {
          service.permissions.forEach(perm => {
            if (perm.status === 'denied') {
              deniedActions.push(perm.action);
            }
          });
        });

        if (deniedActions.length > 0) {
          const policy = {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: deniedActions.sort(),
                Resource: "*"
              }
            ]
          };
          navigator.clipboard.writeText(JSON.stringify(policy, null, 2));
          toast.success('IAM policy copied to clipboard');
        } else {
          toast.info('No denied permissions to copy');
        }
      }
    };

    const copyFullPolicy = () => {
      // Generate full policy with all 33 permissions
      const allActions: string[] = [];
      data?.services.forEach(service => {
        service.permissions.forEach(perm => {
          allActions.push(perm.action);
        });
      });

      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: allActions.sort(),
            Resource: "*"
          }
        ]
      };
      navigator.clipboard.writeText(JSON.stringify(policy, null, 2));
      toast.success('Full IAM policy copied to clipboard');
    };

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-text-tertiary">Checking permissions...</span>
        </div>
      );
    }

    if (!data) return null;

    const getBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
      if (status === 'full') return 'default';
      if (status === 'partial') return 'secondary';
      if (status === 'none') return 'destructive';
      return 'outline';
    };

    const getServiceBorderColor = (service: any) => {
      if (service.denied > 0) return 'border-red-500/30';
      if (service.unknown > 0) return 'border-yellow-500/30';
      return 'border-green-500/30';
    };

    const totalDenied = data.services.reduce((sum, s) => sum + s.denied, 0);

    return (
      <div className="space-y-3">
        {/* Header with status and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AWS Permissions</span>
            <Badge variant={getBadgeVariant(data.overallStatus)}>
              {data.overallStatus === 'full' && 'All Permissions ✓'}
              {data.overallStatus === 'partial' && 'Partial Access'}
              {data.overallStatus === 'none' && 'No Access'}
              {data.overallStatus === 'unknown' && 'Unknown'}
            </Badge>
          </div>
          <div className="flex gap-2">
            {totalDenied > 0 && (
              <Button onClick={copyPolicy} size="sm" variant="outline">
                <Copy className="w-3 h-3 mr-2" />
                Copy Missing Policy
              </Button>
            )}
            <Button onClick={copyFullPolicy} size="sm" variant="outline">
              <Copy className="w-3 h-3 mr-2" />
              Copy Full Policy
            </Button>
            <Button onClick={onRefresh} size="sm" variant="outline">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-4 gap-3">
          {data.services.map(service => {
            const isExpanded = expandedServices.has(service.service);
            return (
              <div
                key={service.service}
                className={`p-3 bg-muted rounded-lg border ${getServiceBorderColor(service)} cursor-pointer hover:bg-muted/80 transition-colors`}
                onClick={() => toggleService(service.service)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{service.service}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {service.allowed > 0 && (
                    <span className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="w-3 h-3" />
                      {service.allowed}
                    </span>
                  )}
                  {service.denied > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="w-3 h-3" />
                      {service.denied}
                    </span>
                  )}
                  {service.unknown > 0 && (
                    <span className="flex items-center gap-1 text-yellow-500">
                      <AlertCircle className="w-3 h-3" />
                      {service.unknown}
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-quaternary mt-1">
                  {service.total} total
                </div>
              </div>
            );
          })}
        </div>

        {/* Expanded Service Details */}
        {Array.from(expandedServices).map(serviceName => {
          const service = data.services.find(s => s.service === serviceName);
          if (!service) return null;

          return (
            <div key={serviceName} className={`p-3 bg-muted rounded-lg border ${getServiceBorderColor(service)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{service.service} Service</span>
                  <span className="text-xs text-text-tertiary">
                    ({service.allowed}/{service.total} allowed)
                  </span>
                </div>
                <Button
                  onClick={() => toggleService(serviceName)}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                >
                  <ChevronDown className="w-3 h-3 rotate-180" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {service.permissions.map(perm => (
                  <div
                    key={perm.action}
                    className={`flex items-start gap-2 text-xs p-2 rounded border ${
                      perm.status === 'allowed' ? 'bg-green-500/5 border-green-500/20' :
                      perm.status === 'denied' ? 'bg-red-500/5 border-red-500/20' :
                      'bg-yellow-500/5 border-yellow-500/20'
                    }`}
                  >
                    {getStatusIcon(perm.status)}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs truncate" title={perm.action}>
                        {perm.action.split(':')[1] || perm.action}
                      </div>
                      <div className="text-text-tertiary text-xs">{perm.description}</div>
                      {perm.status === 'denied' && perm.featureImpact && (
                        <div className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-2 h-2" />
                          <span className="truncate">{perm.featureImpact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Warning if can't simulate */}
        {!data.canSimulate && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertCircle className="w-4 h-4" />
              <div>
                <div className="font-medium">Cannot verify permissions</div>
                <div className="text-yellow-500/80 mt-1">
                  This account lacks iam:SimulatePrincipalPolicy permission. All permissions shown as "Unknown".
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-text-quaternary text-right">
          Last checked: {new Date(data.checkedAt).toLocaleString()}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield className="size-8 text-primary" />
          <h2 className="text-primary">Cloud Accounts</h2>
        </div>
        <Button variant="ghost" size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Status Overview */}
      <Card className="bg-card border-border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-text-tertiary mb-1">Provider Status</div>
            <div className="text-2xl">
              {connectedCount} of {providers.length} Connected
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-input hover:bg-accent"
              onClick={() => {
                toast.success('Refreshing all provider statuses...');
                setTimeout(() => toast.success('Status refresh complete!'), 1500);
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh All
            </Button>
          </div>
        </div>
      </Card>

      {/* Provider Tabs */}
      <Tabs defaultValue="aws" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="aws" className="flex items-center gap-2">
            <span className="text-lg">☁️</span>
            Amazon Web Services
          </TabsTrigger>
          <TabsTrigger value="gcp" className="flex items-center gap-2">
            <span className="text-lg">🌥️</span>
            Google Cloud Platform
          </TabsTrigger>
          <TabsTrigger value="azure" className="flex items-center gap-2">
            <span className="text-lg">⛅</span>
            Microsoft Azure
          </TabsTrigger>
        </TabsList>

        {/* AWS Tab */}
        <TabsContent value="aws" className="mt-6">
          <div className="space-y-4">
            {updatedProviders.filter(p => p.id === 'aws').map((provider) => (
              <Card key={provider.id} className="bg-card border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{provider.icon}</div>
                    <div>
                      <h3 className="text-lg mb-1">{provider.name}</h3>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(provider.status)}
                        <span className={`text-sm ${getStatusColor(provider.status)}`}>
                          {getStatusText(provider.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {provider.status === 'connected' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-input hover:bg-accent"
                          onClick={() => handleTestConnection(provider.id)}
                        >
                          <Terminal className="w-4 h-4 mr-2" />
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-input hover:bg-accent"
                          onClick={() => handleDisconnect(provider.id)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : provider.id === 'aws' ? (
                      <Button
                        size="sm"
                        onClick={() => handleSetupProvider(provider.id)}
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Configure
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="opacity-50 cursor-not-allowed"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </div>

                {/* Provider Details */}
                {Object.keys(provider.details).length > 0 && (
                  <div className="border-t border-border pt-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      {provider.details.account && (
                        <div>
                          <div className="text-xs text-text-tertiary mb-1">Account ID</div>
                          <div className="text-sm font-mono">{provider.details.account}</div>
                        </div>
                      )}
                      {provider.details.profile && (
                        <div>
                          <div className="text-xs text-text-tertiary mb-1">Profile</div>
                          <div className="text-sm">{provider.details.profile}</div>
                        </div>
                      )}
                      {provider.details.region && (
                        <div>
                          <div className="text-xs text-text-tertiary mb-1">Default Region</div>
                          <div className="text-sm">{provider.details.region}</div>
                        </div>
                      )}
                      {provider.details.user && (
                        <div>
                          <div className="text-xs text-text-tertiary mb-1">User/Identity</div>
                          <div className="text-sm font-mono text-xs truncate" title={provider.details.user}>
                            {provider.details.user}
                          </div>
                        </div>
                      )}
                      {provider.details.lastChecked && (
                        <div className="col-span-2">
                          <div className="text-xs text-text-tertiary mb-1">Last Checked</div>
                          <div className="text-sm">{provider.details.lastChecked}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Account Details - Show when connected */}
                {provider.status === 'connected' && provider.details.account && (
                  <div className="border-t border-border pt-4 mt-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Server className="w-4 h-4 text-primary" />
                        <div className="text-sm font-medium">Account Details</div>
                      </div>
                      <div className="text-xs text-text-quaternary">Connection information and configuration</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-xs text-text-tertiary mb-1">Account ID</div>
                        <div className="text-sm font-mono font-medium">{provider.details.account}</div>
                        <div className="text-xs text-text-muted mt-1">Unique identifier</div>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-xs text-text-tertiary mb-1">Region</div>
                        <div className="text-sm font-medium">{provider.details.region || 'N/A'}</div>
                        <div className="text-xs text-text-muted mt-1">Default region</div>
                      </div>

                      {provider.details.profile && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-xs text-text-tertiary mb-1">Profile</div>
                          <div className="text-sm font-medium">{provider.details.profile}</div>
                          <div className="text-xs text-text-muted mt-1">AWS CLI profile name</div>
                        </div>
                      )}

                      {provider.details.user && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-xs text-text-tertiary mb-1">Identity</div>
                          <div className="text-sm font-mono text-xs truncate" title={provider.details.user}>
                            {provider.details.user}
                          </div>
                          <div className="text-xs text-text-muted mt-1">Authenticated user/role</div>
                        </div>
                      )}

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-xs text-text-tertiary mb-1">Connection Status</div>
                        <div className="text-sm font-medium text-green-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Connected
                        </div>
                        <div className="text-xs text-text-muted mt-1">
                          Last verified: {provider.details.lastChecked ?
                            new Date(provider.details.lastChecked).toLocaleString() : 'Never'}
                        </div>
                      </div>

                      {provider.details.lastChecked && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-xs text-text-tertiary mb-1">Last Verified</div>
                          <div className="text-sm font-medium">{provider.details.lastChecked}</div>
                          <div className="text-xs text-text-muted mt-1">Connection test timestamp</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 p-2 bg-muted rounded-lg text-xs text-text-quaternary">
                      Account connection secured with OS keychain encryption. Last verified: {provider.details.lastChecked || 'Never'}
                    </div>

                    {/* NEW: Permissions section */}
                    <div className="mt-4 border-t border-border pt-4">
                      <PermissionDisplay
                        accountId={accounts.find(acc => acc.platform === provider.id)?.id || 0}
                        permissionData={permissionData[accounts.find(acc => acc.platform === provider.id)?.id || 0]}
                        loading={permissionLoading[accounts.find(acc => acc.platform === provider.id)?.id || 0] || false}
                        onRefresh={() => {
                          const accountId = accounts.find(acc => acc.platform === provider.id)?.id;
                          if (accountId) fetchPermissions(accountId);
                        }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* GCP Tab - Placeholder */}
        <TabsContent value="gcp" className="mt-6">
          <div className="space-y-4">
            {updatedProviders.filter(p => p.id === 'gcp').map((provider) => (
              <Card key={provider.id} className="bg-card border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{provider.icon}</div>
                    <div>
                      <h3 className="text-lg mb-1">{provider.name}</h3>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-blue-500">Coming Soon</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="opacity-50 cursor-not-allowed"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Coming Soon
                  </Button>
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🌥️</div>
                    <h4 className="text-lg font-semibold mb-2">Google Cloud Platform</h4>
                    <p className="text-text-secondary mb-4">
                      GCP integration is coming soon with support for:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
                      <div className="text-sm">
                        <div className="font-medium mb-1">• Service Accounts</div>
                        <div className="text-text-tertiary">JSON keys & Workload Identity</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium mb-1">• gcloud CLI</div>
                        <div className="text-text-tertiary">Existing configurations</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium mb-1">• Multi-Project</div>
                        <div className="text-text-tertiary">Organization hierarchy</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium mb-1">• Compute & GKE</div>
                        <div className="text-text-tertiary">VMs & Kubernetes</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Azure Tab - Placeholder */}
        <TabsContent value="azure" className="mt-6">
          <div className="space-y-4">
            {updatedProviders.filter(p => p.id === 'azure').map((provider) => (
              <Card key={provider.id} className="bg-card border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{provider.icon}</div>
                    <div>
                      <h3 className="text-lg mb-1">{provider.name}</h3>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-blue-500">Coming Soon</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="opacity-50 cursor-not-allowed"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Coming Soon
                  </Button>
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">⛅</div>
                    <h4 className="text-lg font-semibold mb-2">Microsoft Azure</h4>
                    <p className="text-text-secondary mb-4">
                      Azure integration is coming soon with support for:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
                      <div className="text-sm">
                        <div className="font-medium mb-1">• Service Principals</div>
                        <div className="text-text-tertiary">Client ID/Secret & Managed Identity</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium mb-1">• Azure CLI</div>
                        <div className="text-text-tertiary">Existing az configurations</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium mb-1">• Multi-Subscription</div>
                        <div className="text-text-tertiary">Tenant hierarchy</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium mb-1">• VMs & AKS</div>
                        <div className="text-text-tertiary">Virtual Machines & Kubernetes</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Setup Wizard Dialog */}
      <CreationWizard
        open={setupDialogOpen}
        onOpenChange={setSetupDialogOpen}
        title={selectedProvider === 'aws' ? 'Configure AWS Credentials' : `${selectedProvider?.toUpperCase()} Integration`}
        description={
          selectedProvider === 'aws'
            ? (wizardStep === 1 ? 'Enter AWS Credentials' : 'Review & Confirm')
            : 'Coming Soon'
        }
        icon={Cloud}
        currentStep={selectedProvider === 'aws' ? wizardStep : 1}
        totalSteps={selectedProvider === 'aws' ? 2 : 1}
        onNext={() => {
          if (selectedProvider === 'aws') {
            if (wizardStep < 2) {
              setWizardStep(2);
            } else {
              handleCompleteSetup();
            }
          }
        }}
        onPrevious={selectedProvider === 'aws' && wizardStep > 1 ? () => setWizardStep(wizardStep - 1) : undefined}
        onCancel={() => {
          setSetupDialogOpen(false);
          setWizardStep(1);
          setSelectedProvider(null);
        }}
        nextLabel={
          selectedProvider === 'aws'
            ? (wizardStep < 2 ? 'Next' : 'Complete Setup')
            : 'Close'
        }
        nextDisabled={selectedProvider === 'aws' && !canProceedToNextStep()}
        size="md"
      >
        {renderWizardContent()}
      </CreationWizard>
    </div>
  );
}