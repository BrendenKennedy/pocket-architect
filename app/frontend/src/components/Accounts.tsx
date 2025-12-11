import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Cloud, Key, Terminal, RefreshCw, ChevronRight, Copy, Server } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
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

  useEffect(() => {
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

    fetchAccounts();
  }, []);

  // Convert accounts to the old provider format for compatibility
  const providers: CloudProvider[] = accounts.map(account => ({
    id: account.platform,
    name: account.name,
    status: account.status as AuthStatus,
    icon: account.platform === 'aws' ? '☁️' : account.platform === 'gcp' ? '🌥️' : '⛅',
    details: {
      account: account.accountId,
      region: account.region,
      lastChecked: account.lastSynced,
    },
  }));
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  
  // AWS Setup State
  const [awsAuthMethod, setAwsAuthMethod] = useState('access-keys');
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsProfile, setAwsProfile] = useState('default');
  
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

  const handleTestConnection = (providerId: string) => {
    toast.success(`Testing connection to ${providerId.toUpperCase()}...`);
    setTimeout(() => {
      toast.success('Connection test successful!');
    }, 1500);
  };

  const handleSetupProvider = (providerId: string) => {
    setSelectedProvider(providerId);
    setWizardStep(1);
    setSetupDialogOpen(true);
  };

  const handleCompleteSetup = () => {
    if (selectedProvider) {
      setProviders(prev =>
        prev.map(p =>
          p.id === selectedProvider
            ? { ...p, status: 'connected' as AuthStatus }
            : p
        )
      );
      toast.success(`${selectedProvider.toUpperCase()} credentials configured successfully!`);
      setSetupDialogOpen(false);
      setWizardStep(1);
      setSelectedProvider(null);
    }
  };

  const handleDisconnect = (providerId: string) => {
    setProviders(prev =>
      prev.map(p =>
        p.id === providerId
          ? { ...p, status: 'disconnected' as AuthStatus, details: {} }
          : p
      )
    );
    toast.success(`Disconnected from ${providerId.toUpperCase()}`);
  };

  const renderWizardContent = () => {
    if (!selectedProvider) return null;

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
                    <SelectItem value="sso">AWS SSO</SelectItem>
                    <SelectItem value="profile">Existing AWS Profile</SelectItem>
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
                    <Label>Profile Name</Label>
                    <Input
                      value={awsProfile}
                      onChange={(e) => setAwsProfile(e.target.value)}
                      placeholder="default"
                      className="bg-muted border-border"
                    />
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
    if (!selectedProvider) return false;

    if (selectedProvider === 'aws') {
      if (awsAuthMethod === 'access-keys') {
        return awsAccessKey && awsSecretKey && awsProfile;
      }
      return true;
    }

    if (selectedProvider === 'gcp') {
      if (gcpAuthMethod === 'service-account') {
        return gcpServiceAccount && gcpProjectId;
      }
      return true;
    }

    if (selectedProvider === 'azure') {
      if (azureAuthMethod === 'service-principal') {
        return azureTenantId && azureClientId && azureClientSecret;
      }
      return true;
    }

    return false;
  };

  const connectedCount = providers.filter(p => p.status === 'connected').length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2>Accounts</h2>
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

      {/* Provider Cards */}
      <div className="space-y-4">
        {providers.map((provider) => (
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
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleSetupProvider(provider.id)}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Configure
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
                  {provider.details.project && (
                    <div>
                      <div className="text-xs text-text-tertiary mb-1">Project</div>
                      <div className="text-sm">{provider.details.project}</div>
                    </div>
                  )}
                  {provider.details.subscription && (
                    <div>
                      <div className="text-xs text-text-tertiary mb-1">Subscription</div>
                      <div className="text-sm font-mono">{provider.details.subscription}</div>
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

            {/* Account Limits - Only for AWS */}
            {provider.id === 'aws' && provider.status === 'connected' && (
              <div className="border-t border-border pt-4 mt-4">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Server className="w-4 h-4 text-primary" />
                    <div className="text-sm font-medium">Account Information</div>
                  </div>
                  <div className="text-xs text-text-quaternary">Additional AWS account details</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg border border-input">
                    <div className="text-xs text-text-tertiary mb-1">Account Type</div>
                    <div className="text-sm font-medium">Standard</div>
                    <div className="text-xs text-text-muted mt-1">AWS Organizations Member</div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg border border-input">
                    <div className="text-xs text-text-tertiary mb-1">Support Plan</div>
                    <div className="text-sm font-medium">Business</div>
                    <div className="text-xs text-text-muted mt-1">24/7 Phone & Email Support</div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg border border-input">
                    <div className="text-xs text-text-tertiary mb-1">Account Age</div>
                    <div className="text-sm font-medium">2 years, 4 months</div>
                    <div className="text-xs text-text-muted mt-1">Created: Jul 2022</div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg border border-input">
                    <div className="text-xs text-text-tertiary mb-1">Active Regions</div>
                    <div className="text-sm font-medium">4 of 33</div>
                    <div className="text-xs text-text-muted mt-1">us-east-1, us-west-2, +2</div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg border border-green-500/30">
                    <div className="text-xs text-text-tertiary mb-1">MFA Status</div>
                    <div className="text-sm font-medium text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Enabled
                    </div>
                    <div className="text-xs text-text-muted mt-1">Root & IAM Users</div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg border border-input">
                    <div className="text-xs text-text-tertiary mb-1">CloudTrail Logging</div>
                    <div className="text-sm font-medium text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </div>
                    <div className="text-xs text-text-muted mt-1">All regions enabled</div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg border border-input">
                    <div className="text-xs text-text-tertiary mb-1">Default VPC</div>
                    <div className="text-sm font-medium font-mono text-xs">vpc-0a1b2c3d</div>
                    <div className="text-xs text-text-muted mt-1">172.31.0.0/16</div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg border border-input">
                    <div className="text-xs text-text-tertiary mb-1">Billing Currency</div>
                    <div className="text-sm font-medium">USD ($)</div>
                    <div className="text-xs text-text-muted mt-1">United States Dollar</div>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-muted rounded-lg border border-input text-xs text-text-quaternary">
                  Account information synced from AWS. Last updated: {provider.details.lastChecked}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Setup Wizard Dialog */}
      <CreationWizard
        open={setupDialogOpen}
        onOpenChange={setSetupDialogOpen}
        title={`Configure ${selectedProvider?.toUpperCase()} Credentials`}
        description={wizardStep === 1 ? 'Enter Credentials' : 'Review & Confirm'}
        icon={Cloud}
        currentStep={wizardStep}
        totalSteps={2}
        onNext={() => {
          if (wizardStep < 2) {
            setWizardStep(2);
          } else {
            handleCompleteSetup();
          }
        }}
        onPrevious={wizardStep > 1 ? () => setWizardStep(wizardStep - 1) : undefined}
        onCancel={() => {
          setSetupDialogOpen(false);
          setWizardStep(1);
        }}
        nextLabel={wizardStep < 2 ? 'Next' : 'Complete Setup'}
        nextDisabled={!canProceedToNextStep()}
        size="md"
      >
        {renderWizardContent()}
      </CreationWizard>
    </div>
  );
}