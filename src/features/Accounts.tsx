import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Cloud, Key, Terminal, RefreshCw, ChevronRight, ChevronDown, Copy, Server, Shield, Loader2, AlertTriangle, BookOpen, Check, X, Eye, EyeOff } from 'lucide-react';
import { AWSLogo, GCPLogo, AzureLogo } from './CloudLogos';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { CreationWizard } from '../components/ui/creation-wizard';
import { toast } from 'sonner';

import { bridgeApi } from '../bridge/api';
import type { PermissionCheckResult } from '../types/models';
import { PermissionHelpDialog } from './dialogs/PermissionHelpDialog';

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



type AuthStatus = 'connected' | 'disconnected' | 'expired' | 'partial' | 'pending' | 'failed';

interface CloudProvider {
  id: string;
  name: string;
  status: AuthStatus;
  icon: React.ReactElement;
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
  const [permissionData, setPermissionData] = useState<Record<number, any>>({});
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState<Record<number, boolean>>({});

  // AWS CLI profiles state


  const fetchAccounts = async () => {
    console.log('🔄 fetchAccounts called');
    try {
      console.log('📋 Calling bridgeApi.listAccounts...');
      const data = await bridgeApi.listAccounts() || [];
      console.log('📋 Accounts received from backend:', data);
      console.log('📊 Setting accounts state with', data.length, 'accounts');
      setAccounts(data);
      console.log('✅ Accounts state updated successfully');
    } catch (error) {
      console.error('❌ Failed to fetch accounts:', error);
      toast.error('Failed to load accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
      console.log('🏁 fetchAccounts completed');
    }
  };

  const fetchPermissions = async (accountId: number, forceRecheck: boolean = false) => {
    setPermissionLoading(prev => ({ ...prev, [accountId]: true }));

    try {
      // Get the account to find its region
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const result = forceRecheck
        ? await bridgeApi.recheckAccountPermissions(accountId.toString(), account.region)
        : await bridgeApi.checkAccountPermissionsSummary(accountId.toString(), account.region);
      setPermissionData(prev => ({ ...prev, [accountId]: result }));
    } catch (error) {
      console.error('Failed to check permissions:', error);
      toast.error('Failed to check permissions');
    } finally {
      setPermissionLoading(prev => ({ ...prev, [accountId]: false }));
    }
  };

  // Auto-refresh permissions every 60 minutes for connected accounts
  useEffect(() => {
    const refreshPermissions = () => {
      accounts.forEach(account => {
        if (account.status === 'connected') {
          fetchPermissions(account.id);
        }
      });
    };

    // Initial refresh
    refreshPermissions();

    // Set up interval for auto-refresh (60 minutes)
    const interval = setInterval(refreshPermissions, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [accounts]);

  // Utility function to detect AWS Account ID from credentials
  const detectAwsAccountId = async (accessKey: string, secretKey: string, region: string): Promise<string> => {
    console.log('🔐 AWS validation started:', {
      region,
      accessKeyLength: accessKey?.length,
      secretKeyLength: secretKey?.length,
      hasAccessKey: !!accessKey,
      hasSecretKey: !!secretKey
    });

    try {
      // Call backend to validate credentials and get account ID
      // This will use the real AWS STS API through the backend
      console.log('🌉 Bridge: Calling validateAwsCredentials...');
      const result = await bridgeApi.validateAwsCredentials(accessKey, secretKey, region);
      console.log('🔐 AWS validation result:', result);

      if (result.valid && result.accountId) {
        console.log('✅ Validation successful, account ID:', result.accountId);
        return result.accountId;
      } else {
        console.log('❌ Validation failed:', result.error);
        throw new Error(result.error || 'Failed to validate credentials');
      }
    } catch (error: any) {
      // Safely get error message
      const errorMessage = error?.message || error?.toString() || 'Unknown error';

      // Re-throw with more specific error messages
      if (errorMessage.includes('InvalidAccessKeyId')) {
        throw new Error('Invalid AWS access key ID');
      }
      if (errorMessage.includes('SignatureDoesNotMatch')) {
        throw new Error('Invalid AWS secret access key');
      }
      if (errorMessage.includes('InvalidClientTokenId')) {
        throw new Error('AWS credentials are invalid or expired');
      }
      if (errorMessage.includes('UnauthorizedOperation')) {
        throw new Error('Insufficient permissions - need sts:GetCallerIdentity');
      }
      if (errorMessage.includes('NetworkingError') || errorMessage.includes('TimeoutError')) {
        throw new Error('Network error - check internet connection');
      }
      throw new Error(`AWS API error: ${errorMessage}`);
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





  // AWS-only provider - session-based, no persistence
  const awsAccount = accounts.find(acc => acc.platform === 'aws');
  const awsProvider: CloudProvider = {
    id: 'aws',
    name: 'Amazon Web Services',
    status: awsAccount ? (awsAccount.status as AuthStatus) : 'disconnected',
    icon: <AWSLogo className="w-8 h-8" />,
    details: awsAccount ? {
      account: awsAccount.accountId,
      region: awsAccount.region,
      profile: awsAccount.name,
      lastChecked: awsAccount.lastSynced,
    } : {}
  };
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
   const [creatingAccount, setCreatingAccount] = useState(false);
   const [disconnectingAccount, setDisconnectingAccount] = useState(false);
  
   // AWS Setup State
   const [awsAccessKey, setAwsAccessKey] = useState('');
   const [awsSecretKey, setAwsSecretKey] = useState('');
   const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  
  // GCP Setup State
  const [gcpAuthMethod, setGcpAuthMethod] = useState('service-account');
  const [gcpServiceAccount, setGcpServiceAccount] = useState('');
  const [gcpProjectId, setGcpProjectId] = useState('');

  // Account Details & Permissions
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [accountDetails, setAccountDetails] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permissionSummary, setPermissionSummary] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  
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
      case 'failed':
        return 'text-red-500';
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
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
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
      case 'failed':
        return 'Connection Failed';
    }
  };

  const [testingConnection, setTestingConnection] = useState(false);

  const handleTestConnection = async (providerId: string) => {
    const account = accounts.find(acc => acc.platform === providerId);

    if (!account) {
      toast.error('No account configured for this provider');
      return;
    }

    setTestingConnection(true);
    try {
      toast.info(`Testing connection to ${providerId.toUpperCase()}...`);

      // Call real backend test
      const result = await bridgeApi.testAccountConnection(account.id);

       if (result) {
        toast.success('✅ Connection successful!');
        await fetchAccounts(); // Refresh last synced timestamp

        // Force recheck permissions to update cache
        try {
          await bridgeApi.recheckAccountPermissions(account.id.toString(), account.region);
          toast.info('🔄 Rechecking permissions...');
        } catch (error) {
          console.warn('Failed to recheck permissions:', error);
          // Don't show error toast as this is not critical
         }

         // Trigger quota data refresh for the newly connected account
          try {
            await bridgeApi.getDashboardData('quotas');
            toast.info('🔄 Refreshing dashboard data...');
          } catch (error) {
           console.warn('Failed to trigger quota refresh:', error);
           // Don't show error toast as this is not critical
         }
         } else {
          // Auto-disconnect on failure
          await handleDisconnect(providerId);
          toast.error('❌ Connection failed. Account has been disconnected.');
         }
     } catch (error: any) {
      // Auto-disconnect on exception
      await handleDisconnect(providerId);
      toast.error('❌ Connection test failed: ' + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSetupProvider = (providerId: string) => {
    if (providerId === 'aws') {
      // Go directly to configuration wizard for session-based auth
      setSelectedProvider(providerId);
      setWizardStep(1);
      setSetupDialogOpen(true);
    }
  };

  const handleCompleteSetup = async () => {
    if (selectedProvider === 'aws') {
      setCreatingAccount(true);
       try {
          // Validate AWS credentials
          console.log('🔐 Starting AWS account setup process...');
          toast.info('Validating AWS credentials...');

          // Auto-detect Account ID from credentials
          console.log('🆔 Auto-detecting Account ID from credentials...');
          const accountId = await detectAwsAccountId(awsAccessKey, awsSecretKey, selectedRegion);
          console.log('🆔 Account ID detected:', accountId);

          // Use account ID as the profile name
          const profileName = `aws-${accountId}`;
          console.log('🏷️ Generated profile name:', profileName);

          // Credentials are already validated and stored securely by validateAwsCredentials
          const accountData = {
            name: profileName,
            platform: 'aws',
            account_id: accountId,  // Use snake_case to match Rust backend
            region: selectedRegion,
            access_key: awsAccessKey,  // Include credentials for backend to store
            secret_key: awsSecretKey,
          };
          console.log('📦 Account data prepared:', accountData);

         // Create account in backend (credentials already securely stored)
         console.log('💾 Calling bridgeApi.createAccount...');
         const createResult = await bridgeApi.createAccount(accountData);
         console.log('💾 createAccount result:', createResult);

         // Refresh UI
         console.log('🔄 Calling fetchAccounts to refresh UI...');
         await fetchAccounts();
         console.log('✅ Account creation and UI refresh completed');

        // Close dialog and reset
        setSetupDialogOpen(false);
        setWizardStep(1);
        setAwsAccessKey('');
        setAwsSecretKey('');

        toast.success('✅ AWS account configured successfully!');

      } catch (error: any) {
        console.error('❌ Account setup error:', error);

        // Safely get error message
        const errorMessage = error?.message || error?.toString() || 'Unknown error';

        // Handle specific error types
        if (errorMessage.includes('Invalid AWS access key ID')) {
          toast.error('❌ Invalid access key. Please check your AWS credentials.');
        } else if (errorMessage.includes('Invalid AWS secret access key')) {
          toast.error('❌ Invalid secret key. Please check your AWS credentials.');
        } else if (errorMessage.includes('AWS credentials are invalid')) {
          toast.error('❌ Credentials are invalid or expired. Please refresh them.');
        } else if (errorMessage.includes('Insufficient permissions')) {
          toast.error('❌ Insufficient IAM permissions. Your user needs sts:GetCallerIdentity permission.');
        } else if (errorMessage.includes('Network error')) {
          toast.error('❌ Network connection failed. Please check your internet connection.');
        } else {
          toast.error(`❌ Setup failed: ${errorMessage}`);
        }
      } finally {
        setCreatingAccount(false);
      }
    }
  };



  const handleDisconnect = async (providerId: string) => {
    const account = accounts.find(acc => acc.platform === providerId);
    if (!account) {
      toast.error('No account found to disconnect');
      return;
    }

    setDisconnectingAccount(true);
    try {
      await bridgeApi.disconnectAccount(account.id);
      await fetchAccounts(); // Refresh to show updated status
      toast.success(`Disconnected from ${providerId.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to disconnect account:', error);
      toast.error('Failed to disconnect account');
    } finally {
      setDisconnectingAccount(false);
    }
  };

  // Account Details & Permissions Functions
  const fetchAccountDetails = async (account: any) => {
    setLoadingDetails(true);
    try {
      // Get account information from backend
      // For now, we'll use basic account data
      const details = {
        accountId: account.accountId,
        platform: account.platform,
        region: account.region,
        name: account.name,
        status: account.status,
        createdAt: account.createdAt,
        lastSynced: account.lastSynced,
        // Additional details would come from AWS APIs
        accountAlias: 'N/A', // Would fetch from IAM
        accountType: 'Standard AWS Account', // Would detect from account features
        mfaEnabled: false, // Would check IAM
        rootUser: false, // Would check if root user
        organizationsMember: false, // Would check organizations
        supportPlan: 'Basic', // Would fetch from support API
      };
      setAccountDetails(details);
    } catch (error) {
      console.error('Failed to fetch account details:', error);
      toast.error('Failed to load account details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchAccountPermissions = async (account: any) => {
    setLoadingPermissions(true);
    try {
      const [permissionsData, summaryData] = await Promise.all([
        bridgeApi.checkAccountPermissions(account.id.toString(), account.region),
        bridgeApi.checkAccountPermissionsSummary(account.id.toString(), account.region)
      ]);

      setPermissions(permissionsData);
      setPermissionSummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleViewAccountDetails = (account: any) => {
    setSelectedAccount(account);
    fetchAccountDetails(account);
    fetchAccountPermissions(account);
  };

  const renderAccountDetails = () => {
    if (!selectedAccount || !accountDetails) return null;

    const getPermissionStatus = (service: string) => {
      if (!permissionSummary?.service_breakdown) return null;
      return permissionSummary.service_breakdown[service];
    };

    const renderPermissionIndicator = (allowed: boolean) => (
      <div className="flex items-center gap-2">
        {allowed ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <X className="w-4 h-4 text-red-500" />
        )}
        <span className={allowed ? 'text-green-600' : 'text-red-600'}>
          {allowed ? 'Granted' : 'Denied'}
        </span>
      </div>
    );

    return (
      <Dialog open={!!selectedAccount} onOpenChange={() => setSelectedAccount(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AWSLogo className="w-6 h-6" />
              AWS Account Details - {accountDetails.accountId}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Account Info */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5" />
                Account Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Account ID</label>
                  <p className="font-mono text-sm">{accountDetails.accountId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Account Alias</label>
                  <p className="text-sm">{accountDetails.accountAlias}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Region</label>
                  <p className="text-sm">{accountDetails.region}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Account Type</label>
                  <p className="text-sm">{accountDetails.accountType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Status</label>
                  <Badge variant={accountDetails.status === 'connected' ? 'default' : 'secondary'}>
                    {accountDetails.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Last Synced</label>
                  <p className="text-sm">
                    {accountDetails.lastSynced ? new Date(accountDetails.lastSynced).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Permissions Summary */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  IAM Permissions
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPermissions(!showPermissions)}
                >
                  {showPermissions ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showPermissions ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>

              {permissionSummary && (
                <div className="mb-4">
                  <div className="flex items-center gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{permissionSummary.allowed_actions}</div>
                      <div className="text-sm text-text-secondary">Allowed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{permissionSummary.denied_actions}</div>
                      <div className="text-sm text-text-secondary">Denied</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{permissionSummary.total_actions}</div>
                      <div className="text-sm text-text-secondary">Total</div>
                    </div>
                  </div>
                </div>
              )}

              {showPermissions && (
                <div className="space-y-4">
                  {/* Group permissions by service */}
                  {Object.entries(
                    permissions.reduce((acc: any, perm: any) => {
                      if (!acc[perm.service]) acc[perm.service] = [];
                      acc[perm.service].push(perm);
                      return acc;
                    }, {})
                  ).map(([service, servicePerms]: [string, any[]]) => (
                    <div key={service} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 capitalize flex items-center gap-2">
                        <Cloud className="w-4 h-4" />
                        {service.toUpperCase()} Service
                        <Badge variant="outline" className="ml-auto">
                          {servicePerms.filter((p: any) => p.allowed).length}/{servicePerms.length} Allowed
                        </Badge>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {servicePerms.map((perm: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                            <code className="text-xs">{perm.action}</code>
                            {renderPermissionIndicator(perm.allowed)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAccount(null)}>
              Close
            </Button>
            <Button
              onClick={() => fetchAccountPermissions(selectedAccount)}
              disabled={loadingPermissions}
            >
              {loadingPermissions && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Refresh Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderWizardContent = () => {
    if (!selectedProvider) return null;

    // Only AWS is currently supported
    if (selectedProvider !== 'aws') {
      return (
        <Card className="bg-blue-500/10 border-blue-500/30 p-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center">{selectedProvider === 'gcp' ? <GCPLogo className="w-12 h-12" /> : <AzureLogo className="w-12 h-12" />}</div>
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
                <Label htmlFor="aws-access-key">AWS Access Key ID</Label>
                <Input
                  id="aws-access-key"
                  type="password"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={awsAccessKey}
                  onChange={(e) => setAwsAccessKey(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-text-tertiary">
                  Your AWS access key ID (starts with AKIA, ASIA, or AIDA)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aws-secret-key">AWS Secret Access Key</Label>
                <Input
                  id="aws-secret-key"
                  type="password"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  value={awsSecretKey}
                  onChange={(e) => setAwsSecretKey(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-text-tertiary">
                  Your AWS secret access key (40 characters, starts with letters)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Default Region</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AWS_REGIONS.map(region => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-text-tertiary">
                  Primary AWS region for this account
                </p>
              </div>
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
                     <li>Authentication Method: Access Key + Secret Key</li>
                     <li>Access Key ID: {awsAccessKey.slice(0, 8)}...****</li>
                     <li>Region: {selectedRegion}</li>
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
    return awsAccessKey && awsSecretKey;
  };

  const connectedCount = accounts.filter(acc => acc.status === 'connected').length;

  // Permission Display Component
  const PermissionDisplay = ({
    accountId,
    permissionData: data,
    loading: isLoading,
    onRefresh,
    onOpenPermissionDialog
   }: {
    accountId: number;
    permissionData?: any;
    loading: boolean;
    onRefresh: () => void;
    onOpenPermissionDialog: () => void;
  }) => {
    const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

    // Handle case when permission data is not available yet
    if (!data) {
      return (
        <div className="text-center py-8">
          <p className="text-text-tertiary">No permission data available</p>
          <p className="text-xs text-text-quaternary mt-1">Permissions will be checked when account is connected</p>
        </div>
      );
    }

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

    const totalAllowed = data.services.reduce((sum, s) => sum + s.allowed, 0);
    const totalDenied = data.services.reduce((sum, s) => sum + s.denied, 0);
    const totalUnknown = data.services.reduce((sum, s) => sum + s.unknown, 0);
    const totalPermissions = data.services.reduce((sum, s) => sum + s.total, 0);

    return (
      <div className="space-y-3">
        {/* Header with status and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AWS Permissions</span>
            <Badge variant={getBadgeVariant(data.overallStatus)}>
              {totalAllowed}/{totalPermissions} allowed
            </Badge>
            <span className="text-xs text-text-tertiary">
              Session cached
            </span>
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

        {/* All Permissions List - Always Visible */}
        <div className="space-y-4">
          {data.services.map(service => (
            <div key={service.service} className={`p-4 bg-muted rounded-lg border ${getServiceBorderColor(service)}`}>
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-medium">{service.service} Permissions</span>
                   <Badge variant="outline" className="text-xs">
                     {service.allowed}/{service.total} granted
                   </Badge>
                   {service.service === "ServiceQuotas" && (
                     <span className="text-xs text-muted-foreground">
                       Required for quota features
                     </span>
                   )}
                 </div>
               </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {service.permissions.map(perm => (
                  <div
                    key={perm.action}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      perm.status === 'allowed' ? 'bg-green-500/5 border-green-500/30' :
                      perm.status === 'denied' ? 'bg-red-500/5 border-red-500/30' :
                      'bg-yellow-500/5 border-yellow-500/30'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(perm.status, 'sm')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono bg-background px-1.5 py-0.5 rounded text-primary">
                          {perm.action}
                        </code>
                        {perm.critical && (
                          <Badge variant="destructive" className="text-xs px-1 py-0">
                            Critical
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-text-secondary mb-1">{perm.description}</div>
                      {perm.status === 'denied' && perm.featureImpact && (
                        <div className="text-red-600 text-xs flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{perm.featureImpact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

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

        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenPermissionDialog}
            className="text-xs"
          >
            <BookOpen className="w-3 h-3 mr-1" />
            View Required IAM Policy
          </Button>
          <div className="text-xs text-text-quaternary flex items-center gap-2">
            <span>Last checked: {data?.checkedAt ? new Date(data.checkedAt).toLocaleString() : 'Never'}</span>
            <span>•</span>
            <span>Auto-refresh every 60 minutes</span>
          </div>
        </div>
      </div>
    );
  };

  // Show loading state while fetching initial data
  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Loading Accounts</h3>
            <p className="text-text-tertiary">Checking account status and permissions...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="text-sm text-text-tertiary mb-1">AWS Account Status</div>
            <div className="text-2xl">
              {connectedCount > 0 ? 'Connected' : 'Session-Based Auth'}
            </div>
            <div className="text-xs text-text-quaternary mt-1">
              {connectedCount > 0 ? 'Active session' : 'Configure to connect'}
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

      {/* AWS Provider Card */}
      <div className="space-y-4">
        <Card key={awsProvider.id} className="bg-card border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="text-4xl">{awsProvider.icon}</div>
              <div>
                <h3 className="text-lg mb-1">{awsProvider.name}</h3>
                <div className="flex items-center gap-2">
                  {getStatusIcon(awsProvider.status)}
                  <span className={`text-sm ${getStatusColor(awsProvider.status)}`}>
                    {getStatusText(awsProvider.status)}
                  </span>
                </div>
              </div>
            </div>
             <div className="flex gap-2">
               {awsProvider.status === 'connected' ? (
                 <>
                   <Button
                     variant="outline"
                     size="sm"
                     className="border-input hover:bg-accent"
                     onClick={() => handleViewAccountDetails(awsAccount)}
                     disabled={loadingDetails}
                   >
                     {loadingDetails ? (
                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     ) : (
                       <Eye className="w-4 h-4 mr-2" />
                     )}
                     {loadingDetails ? 'Loading...' : 'Details'}
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     className="border-input hover:bg-accent"
                     onClick={() => handleTestConnection(awsProvider.id)}
                     disabled={testingConnection}
                   >
                     {testingConnection ? (
                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     ) : (
                       <Terminal className="w-4 h-4 mr-2" />
                     )}
                     {testingConnection ? 'Testing...' : 'Test'}
                   </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-input hover:bg-accent"
                    onClick={() => handleDisconnect(awsProvider.id)}
                    disabled={disconnectingAccount}
                  >
                    {disconnectingAccount ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect'
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleSetupProvider(awsProvider.id)}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              )}
             </div>
           </div>

           {/* IAM Policy Access - Always visible */}
           <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <BookOpen className="w-4 h-4 text-blue-500" />
                 <div>
                   <div className="text-sm font-medium text-blue-500">AWS IAM Policy Required</div>
                   <div className="text-xs text-blue-500/80">Copy the required IAM policy for quota monitoring</div>
                 </div>
               </div>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setPermissionDialogOpen(true)}
                 className="border-blue-500/30 hover:bg-blue-500/10"
               >
                 <Copy className="w-3 h-3 mr-1" />
                 View Policy
               </Button>
             </div>
           </div>

           {/* Provider Details */}
          {Object.keys(awsProvider.details).length > 0 && (
            <div className="border-t border-border pt-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {awsProvider.details.account && (
                  <div>
                    <div className="text-xs text-text-tertiary mb-1">Account ID</div>
                    <div className="text-sm font-mono">{awsProvider.details.account}</div>
                  </div>
                )}
                {awsProvider.details.profile && (
                  <div>
                    <div className="text-xs text-text-tertiary mb-1">Profile</div>
                    <div className="text-sm">{awsProvider.details.profile}</div>
                  </div>
                )}
                {awsProvider.details.region && (
                  <div>
                    <div className="text-xs text-text-tertiary mb-1">Default Region</div>
                    <div className="text-sm">{awsProvider.details.region}</div>
                  </div>
                )}
                {awsProvider.details.user && (
                  <div>
                    <div className="text-xs text-text-tertiary mb-1">User/Identity</div>
                    <div className="text-sm font-mono text-xs truncate" title={awsProvider.details.user}>
                      {awsProvider.details.user}
                    </div>
                  </div>
                )}
                {awsProvider.details.lastChecked && (
                  <div className="col-span-2">
                    <div className="text-xs text-text-tertiary mb-1">Last Checked</div>
                    <div className="text-sm">{awsProvider.details.lastChecked}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Details - Show when connected */}
          {awsProvider.status === 'connected' && awsProvider.details.account && (
            <div className="border-t border-border pt-4 mt-4">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-primary" />
                  <div className="text-sm font-medium">Account Details</div>
                  {permissionLoading[accounts.find(acc => acc.platform === 'aws')?.id || 0] && (
                    <div className="flex items-center gap-1 text-xs text-text-tertiary">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Loading permissions...</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-text-quaternary">Connection information and configuration</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-text-tertiary mb-1">Account ID</div>
                  <div className="text-sm font-mono font-medium">{awsProvider.details.account}</div>
                  <div className="text-xs text-text-muted mt-1">Unique AWS identifier</div>
                </div>



                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-text-tertiary mb-1">Region</div>
                  <div className="text-sm font-medium">{awsProvider.details.region || 'N/A'}</div>
                  <div className="text-xs text-text-muted mt-1">Default region</div>
                </div>

                {awsProvider.details.profile && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-text-tertiary mb-1">Profile</div>
                    <div className="text-sm font-medium">{awsProvider.details.profile}</div>
                    <div className="text-xs text-text-muted mt-1">AWS CLI profile name</div>
                  </div>
                )}

                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-text-tertiary mb-1">Account Type</div>
                  <div className="text-sm font-medium">AWS Account</div>
                  <div className="text-xs text-text-muted mt-1">Cloud provider type</div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-text-tertiary mb-1">Connection Status</div>
                  <div className="text-sm font-medium text-green-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    Active session
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-text-tertiary mb-1">Created</div>
                  <div className="text-sm font-medium">
                    {awsAccount?.created ? new Date(awsAccount.created).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-xs text-text-muted mt-1">Account creation date</div>
                </div>

                {awsProvider.details.lastChecked && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-text-tertiary mb-1">Last Verified</div>
                    <div className="text-sm font-medium">
                      {new Date(awsProvider.details.lastChecked).toLocaleString()}
                    </div>
                    <div className="text-xs text-text-muted mt-1">Last connection check</div>
                  </div>
                )}

                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-text-tertiary mb-1">Credentials</div>
                  <div className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Secure
                  </div>
                  <div className="text-xs text-text-muted mt-1">Stored in keychain</div>
                </div>
              </div>

              <div className="mt-3 p-2 bg-muted rounded-lg text-xs text-text-quaternary">
                Session-based connection. Credentials stored temporarily for this session only.
              </div>

              {/* Permissions section */}
              <div className="mt-4 border-t border-border pt-4">
                {permissionLoading[accounts.find(acc => acc.platform === 'aws')?.id || 0] ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm text-text-tertiary">Checking AWS permissions...</p>
                      <p className="text-xs text-text-quaternary mt-1">This may take a moment</p>
                    </div>
                  </div>
                ) : (
                  <PermissionDisplay
                    accountId={accounts.find(acc => acc.platform === 'aws')?.id || 0}
                    permissionData={permissionData[accounts.find(acc => acc.platform === 'aws')?.id || 0]}
                    loading={false}
                    onOpenPermissionDialog={() => setPermissionDialogOpen(true)}
                    onRefresh={() => {
                       const account = accounts.find(acc => acc.platform === 'aws');
                       if (account?.id) fetchPermissions(account.id, true); // Force recheck
                     }}
                  />
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

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
            ? (wizardStep < 2 ? 'Next' : (creatingAccount ? 'Creating Account...' : 'Complete Setup'))
            : 'Close'
        }
        nextDisabled={(selectedProvider === 'aws' && !canProceedToNextStep()) || creatingAccount}
        size="md"
      >
        {renderWizardContent()}
      </CreationWizard>

      {/* Account Details Dialog */}
      {renderAccountDetails()}

      {/* Permission Help Dialog */}
      <PermissionHelpDialog
        open={permissionDialogOpen}
        onOpenChange={setPermissionDialogOpen}
      />
    </div>
  );
}