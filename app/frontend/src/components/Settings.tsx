import { useState, useEffect } from 'react';
import { Check, Settings as SettingsIcon, Download, Upload, Bell, Shield, Zap, Database, ChevronDown, ChevronRight, Palette, Monitor, Cloud, Layout, Lock, Code, Trash2 } from 'lucide-react';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import { useNeon } from '../contexts/NeonContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeCreatorWizard } from './ThemeCreatorWizard';
import { getAllThemes } from '../config/themes';
import { loadConfig, configSetters, exportConfig, importConfig, resetConfig } from '../services';

export function Settings() {
  const { currentTheme, setTheme, refreshThemes } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(currentTheme.name);
  const { neonIntensity, setNeonIntensity } = useNeon();
  const [themeCreatorOpen, setThemeCreatorOpen] = useState(false);
  const [themes, setThemes] = useState(getAllThemes());
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Appearance
  const [fontFamily, setFontFamily] = useState('system');
  const [textSize, setTextSize] = useState([100]);

  // Dashboard
  const [autoRefresh, setAutoRefresh] = useState('30');
  const [resourceViewMode, setResourceViewMode] = useState<'cards' | 'table' | 'list'>('cards');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showProjectStats, setShowProjectStats] = useState(true);

  // Notifications
  const [healthCheckAlerts, setHealthCheckAlerts] = useState(true);
  const [accountReconnectAlerts, setAccountReconnectAlerts] = useState(true);
  const [costWarningsEnabled, setCostWarningsEnabled] = useState(true);
  const [quotaWarningsEnabled, setQuotaWarningsEnabled] = useState(true);
  const [toastDuration, setToastDuration] = useState(10);
  const [desktopNotifications, setDesktopNotifications] = useState(true);

  // Cloud Providers
  const [awsProfile, setAwsProfile] = useState('default');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsCredentialCache, setAwsCredentialCache] = useState(60);
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [gcpRegion, setGcpRegion] = useState('us-central1');
  const [azureSubscriptionId, setAzureSubscriptionId] = useState('');
  const [azureRegion, setAzureRegion] = useState('eastus');

  // Projects
  const [defaultInstanceType, setDefaultInstanceType] = useState('t3.micro');
  const [defaultSnapshotRetention, setDefaultSnapshotRetention] = useState(30);
  const [autoTagNewResources, setAutoTagNewResources] = useState(true);
  const [confirmDestructiveActions, setConfirmDestructiveActions] = useState(true);

  // Performance
  const [cacheDuration, setCacheDuration] = useState(5);
  const [concurrentApiCalls, setConcurrentApiCalls] = useState(5);
  const [enableRequestBatching, setEnableRequestBatching] = useState(true);

  // Security
  const [autoLockAfterInactivity, setAutoLockAfterInactivity] = useState(0);
  const [requireConfirmationForDelete, setRequireConfirmationForDelete] = useState(true);
  const [enableAuditLogging, setEnableAuditLogging] = useState(false);

  // Advanced
  const [debugMode, setDebugMode] = useState(false);
  const [loggingLevel, setLoggingLevel] = useState<'error' | 'warn' | 'info' | 'debug'>('info');
  const [showRawApiResponses, setShowRawApiResponses] = useState(false);
  const [enableDevTools, setEnableDevTools] = useState(false);

  // UI
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    appearance: true,
    cloudProviders: false,
    dashboard: false,
    notifications: false,
    projects: false,
    performance: false,
    security: false,
    advanced: false,
    data: false,
    about: false,
  });

  // Load settings from config on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const config = await loadConfig();

        // Appearance
        setFontFamily(config.appearance?.fontFamily || 'system');
        setTextSize([config.appearance?.textSize || 100]);
        setSelectedTheme(config.appearance?.theme || currentTheme.name);

        // Dashboard
        setAutoRefresh(config.dashboard.autoRefreshInterval.toString());
        setResourceViewMode(config.dashboard.resourceViewMode);
        setItemsPerPage(config.dashboard.itemsPerPage);
        setShowProjectStats(config.dashboard.showProjectStats);

        // Notifications
        setHealthCheckAlerts(config.notifications?.healthChecks ?? true);
        setAccountReconnectAlerts(config.notifications?.accountReconnect ?? true);
        setCostWarningsEnabled(config.notifications?.costWarnings?.enabled ?? true);
        setQuotaWarningsEnabled(config.notifications?.quotaWarnings?.enabled ?? true);
        setToastDuration(config.notifications?.toastDuration ?? 10);
        setDesktopNotifications(config.notifications?.desktopNotifications ?? false);

        // Cloud Providers
        setAwsProfile(config.cloudProviders.aws.profile);
        setAwsRegion(config.cloudProviders.aws.defaultRegion);
        setAwsCredentialCache(config.cloudProviders.aws.credentialCacheDuration);
        setGcpProjectId(config.cloudProviders.gcp.projectId);
        setGcpRegion(config.cloudProviders.gcp.defaultRegion);
        setAzureSubscriptionId(config.cloudProviders.azure.subscriptionId);
        setAzureRegion(config.cloudProviders.azure.defaultRegion);

        // Projects
        setDefaultInstanceType(config.projects.defaultInstanceType);
        setDefaultSnapshotRetention(config.projects.defaultSnapshotRetention);
        setAutoTagNewResources(config.projects.autoTagNewResources);
        setConfirmDestructiveActions(config.projects.confirmDestructiveActions);

        // Performance
        setCacheDuration(config.performance.cacheDuration);
        setConcurrentApiCalls(config.performance.concurrentApiCalls);
        setEnableRequestBatching(config.performance.enableRequestBatching);

        // Security
        setAutoLockAfterInactivity(config.security.autoLockAfterInactivity);
        setRequireConfirmationForDelete(config.security.requireConfirmationForDelete);
        setEnableAuditLogging(config.security.enableAuditLogging);

        // Advanced
        setDebugMode(config.advanced.debugMode);
        setLoggingLevel(config.advanced.loggingLevel);
        setShowRawApiResponses(config.advanced.showRawApiResponses);
        setEnableDevTools(config.advanced.enableDevTools);

        // UI
        setSidebarCollapsed(config.ui.sidebarCollapsed);

        setSettingsLoaded(true);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    setSelectedTheme(currentTheme.name);
  }, [currentTheme]);

  const handleThemeCreated = () => {
    refreshThemes();
    setThemes(getAllThemes());
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const fonts = [
    { value: 'system', label: 'System Default (SF Pro)' },
    { value: 'inter', label: 'Inter' },
    { value: 'roboto', label: 'Roboto' },
    { value: 'ubuntu', label: 'Ubuntu' },
    { value: 'jetbrains', label: 'JetBrains Mono' },
    { value: 'fira', label: 'Fira Code' },
    { value: 'source', label: 'Source Code Pro' },
  ];

  const awsRegions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'EU West (Ireland)' },
    { value: 'eu-central-1', label: 'EU Central (Frankfurt)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  ];

  const instanceTypes = [
    { value: 't3.micro', label: 't3.micro (2 vCPU, 1 GiB)' },
    { value: 't3.small', label: 't3.small (2 vCPU, 2 GiB)' },
    { value: 't3.medium', label: 't3.medium (2 vCPU, 4 GiB)' },
    { value: 't3.large', label: 't3.large (2 vCPU, 8 GiB)' },
    { value: 'm5.large', label: 'm5.large (2 vCPU, 8 GiB)' },
    { value: 'm5.xlarge', label: 'm5.xlarge (4 vCPU, 16 GiB)' },
    { value: 'c5.large', label: 'c5.large (2 vCPU, 4 GiB)' },
    { value: 'c5.xlarge', label: 'c5.xlarge (4 vCPU, 8 GiB)' },
  ];

  const handleExportConfig = async () => {
    try {
      const configJson = await exportConfig();
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pocket-architect-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Configuration exported successfully');
    } catch (error) {
      toast.error('Failed to export configuration');
    }
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await importConfig(text);
        toast.success('Configuration imported! Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        toast.error('Failed to import configuration. Invalid file format.');
      }
    };
    input.click();
  };

  const handleResetConfig = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }
    try {
      await resetConfig();
      toast.success('Settings reset to defaults! Reloading...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Failed to reset configuration');
    }
  };

  if (!settingsLoaded) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-muted">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="size-8 text-primary" />
          <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* Appearance */}
        <Card className="bg-background-elevated border-border">
          <button
            onClick={() => toggleSection('appearance')}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-text-primary">Appearance</h3>
              <span className="text-sm text-text-muted">Theme, fonts, and visual preferences</span>
            </div>
            {expandedSections.appearance ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.appearance && (
            <div className="px-6 pb-6 space-y-6">
              {/* Theme Selection */}
              <div>
                <Label className="mb-3 block">Theme</Label>
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => {
                        setTheme(theme.name);
                        setSelectedTheme(theme.name);
                        toast.success(`Theme changed to ${theme.label}`);
                      }}
                      className={`p-4 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                        selectedTheme === theme.name
                          ? 'border-primary bg-primary/10'
                          : 'border-input hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex gap-1">
                          <div
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: theme.colors.background }}
                          />
                          <div
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: theme.colors.card }}
                          />
                          <div
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: theme.colors.primary }}
                          />
                        </div>
                        {selectedTheme === theme.name && (
                          <Check className="w-4 h-4 text-primary ml-auto" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-sm">{theme.label}</div>
                        {theme.isCustom && (
                          <div className="text-xs text-muted-foreground mt-1">Custom</div>
                        )}
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setThemeCreatorOpen(true)}
                    className="p-4 rounded-lg border-2 transition-all hover:scale-[1.02] border-primary border-dashed hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Palette className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm text-primary">Create New Theme</div>
                      <div className="text-xs text-muted-foreground mt-1">Wizard or raw config</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Font Family */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Font Family</Label>
                  <div className="text-sm text-text-muted mt-1">Choose your preferred font</div>
                </div>
                <Select
                  value={fontFamily}
                  onValueChange={async (value) => {
                    setFontFamily(value);
                    await configSetters.setFontFamily(value);
                    toast.success(`Font changed to ${fonts.find(f => f.value === value)?.label}`);
                  }}
                >
                      <SelectTrigger className="w-64 bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fonts.map(font => (
                      <SelectItem value={font.value} key={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Text Size */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label>Text Size</Label>
                    <div className="text-sm text-text-muted mt-1">Adjust interface text size</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-muted w-12 text-right">{textSize[0]}%</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setTextSize([100]);
                        await configSetters.setTextSize(100);
                        toast.info('Text size reset to 100%');
                      }}
                      className="border-input hover:bg-background-elevated"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                <Slider
                  value={textSize}
                  onValueChange={(value) => setTextSize(value)}
                  onValueCommit={async (value) => {
                    await configSetters.setTextSize(value[0]);
                    toast.success(`Text size set to ${value[0]}%`);
                  }}
                  min={75}
                  max={150}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-text-tertiary">
                  <span>75%</span>
                  <span>100%</span>
                  <span>150%</span>
                </div>
              </div>

              {/* Neon Intensity */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label>Neon Glow Intensity</Label>
                    <div className="text-sm text-text-muted mt-1">Control the glow effect on status indicators</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-muted w-12 text-right">{(neonIntensity * 100).toFixed(0)}%</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNeonIntensity(1.0);
                        toast.info('Neon intensity reset to 100%');
                      }}
                      className="border-input hover:bg-background-elevated"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[neonIntensity * 100]}
                  onValueChange={(value) => setNeonIntensity(value[0] / 100)}
                  onValueCommit={(value) => toast.success(`Neon intensity set to ${value[0]}%`)}
                  min={0}
                  max={200}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-text-tertiary">
                  <span>0% (Off)</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>

              {/* Sidebar State */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sidebar Collapsed by Default</Label>
                  <div className="text-sm text-text-muted mt-1">Start with sidebar collapsed on app launch</div>
                </div>
                <Switch
                  checked={sidebarCollapsed}
                  onCheckedChange={async (checked) => {
                    setSidebarCollapsed(checked);
                    await configSetters.setSidebarCollapsed(checked);
                    toast.success(`Sidebar will ${checked ? 'start collapsed' : 'start expanded'}`);
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Cloud Providers */}
        <Card className="bg-background-elevated border-border">
          <button
            onClick={() => toggleSection('cloudProviders')}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-text-primary">Cloud Providers</h3>
              <span className="text-sm text-text-muted">AWS, GCP, and Azure configuration</span>
            </div>
            {expandedSections.cloudProviders ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.cloudProviders && (
            <div className="px-6 pb-6">
              <Tabs defaultValue="aws" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="aws">AWS</TabsTrigger>
                  <TabsTrigger value="gcp">GCP</TabsTrigger>
                  <TabsTrigger value="azure">Azure</TabsTrigger>
                </TabsList>

                <TabsContent value="aws" className="space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AWS Profile</Label>
                      <div className="text-sm text-text-muted mt-1">Select AWS credentials profile</div>
                    </div>
                    <Input
                      value={awsProfile}
                      onChange={(e) => setAwsProfile(e.target.value)}
                      onBlur={async () => {
                        await configSetters.setAwsProfile(awsProfile);
                        toast.success(`AWS profile set to ${awsProfile}`);
                      }}
                      className="w-64 bg-background border-input"
                      placeholder="default"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Default Region</Label>
                      <div className="text-sm text-text-muted mt-1">Primary AWS region for new resources</div>
                    </div>
                    <Select
                      value={awsRegion}
                      onValueChange={async (value) => {
                        setAwsRegion(value);
                        await configSetters.setAwsDefaultRegion(value);
                        toast.success(`AWS region changed to ${awsRegions.find(r => r.value === value)?.label}`);
                      }}
                    >
                  <SelectTrigger className="w-64 bg-background border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {awsRegions.map(region => (
                          <SelectItem value={region.value} key={region.value}>
                            {region.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Credential Cache Duration</Label>
                      <div className="text-sm text-text-muted mt-1">How long to cache AWS credentials (minutes)</div>
                    </div>
                    <Input
                      type="number"
                      value={awsCredentialCache}
                      onChange={(e) => setAwsCredentialCache(parseInt(e.target.value) || 0)}
                      onBlur={async () => {
                        await configSetters.setAwsCredentialCacheDuration(awsCredentialCache);
                        toast.success(`Credential cache set to ${awsCredentialCache} minutes`);
                      }}
                      min="0"
                      max="1440"
                      className="w-32 bg-background border-input"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="gcp" className="space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>GCP Project ID</Label>
                      <div className="text-sm text-text-muted mt-1">Default Google Cloud project</div>
                    </div>
                    <Input
                      value={gcpProjectId}
                      onChange={(e) => setGcpProjectId(e.target.value)}
                      onBlur={async () => {
                        await configSetters.setGcpProjectId(gcpProjectId);
                        toast.success('GCP project ID updated');
                      }}
                      className="w-64 bg-background border-input"
                      placeholder="my-project-123456"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Default Region</Label>
                      <div className="text-sm text-text-muted mt-1">Primary GCP region for new resources</div>
                    </div>
                    <Input
                      value={gcpRegion}
                      onChange={(e) => setGcpRegion(e.target.value)}
                      onBlur={async () => {
                        await configSetters.setGcpDefaultRegion(gcpRegion);
                        toast.success(`GCP region changed to ${gcpRegion}`);
                      }}
                      className="w-64 bg-background border-input"
                      placeholder="us-central1"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="azure" className="space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Azure Subscription ID</Label>
                      <div className="text-sm text-text-muted mt-1">Default Azure subscription</div>
                    </div>
                    <Input
                      value={azureSubscriptionId}
                      onChange={(e) => setAzureSubscriptionId(e.target.value)}
                      onBlur={async () => {
                        await configSetters.setAzureSubscriptionId(azureSubscriptionId);
                        toast.success('Azure subscription ID updated');
                      }}
                      className="w-64 bg-background border-input"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Default Region</Label>
                      <div className="text-sm text-text-muted mt-1">Primary Azure region for new resources</div>
                    </div>
                    <Input
                      value={azureRegion}
                      onChange={(e) => setAzureRegion(e.target.value)}
                      onBlur={async () => {
                        await configSetters.setAzureDefaultRegion(azureRegion);
                        toast.success(`Azure region changed to ${azureRegion}`);
                      }}
                      className="w-64 bg-background border-input"
                      placeholder="eastus"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </Card>

        {/* Dashboard & Display */}
        <Card className="bg-background-elevated border-border">
          <button
            onClick={() => toggleSection('dashboard')}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Layout className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-text-primary">Dashboard & Display</h3>
              <span className="text-sm text-text-muted">View preferences and refresh settings</span>
            </div>
            {expandedSections.dashboard ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.dashboard && (
            <div className="px-6 pb-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Refresh Interval</Label>
                  <div className="text-sm text-text-muted mt-1">Seconds between automatic refreshes (0 to disable)</div>
                </div>
                <Input
                  type="number"
                  value={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.value)}
                  onBlur={async () => {
                    await configSetters.setAutoRefreshInterval(parseInt(autoRefresh) || 0);
                    if (autoRefresh === '0') {
                      toast.info('Auto-refresh disabled');
                    } else {
                      toast.success(`Auto-refresh set to ${autoRefresh} seconds`);
                    }
                  }}
                  min="0"
                  max="3600"
                  step="10"
                  className="w-32 bg-background border-input"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Resource View Mode</Label>
                  <div className="text-sm text-text-muted mt-1">Default view for resource lists</div>
                </div>
                <Select
                  value={resourceViewMode}
                  onValueChange={async (value: 'cards' | 'table' | 'list') => {
                    setResourceViewMode(value);
                    await configSetters.setResourceViewMode(value);
                    toast.success(`View mode changed to ${value}`);
                  }}
                >
                      <SelectTrigger className="w-64 bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cards">Cards</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Items Per Page</Label>
                  <div className="text-sm text-text-muted mt-1">Number of items to display per page</div>
                </div>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={async (value) => {
                    const num = parseInt(value);
                    setItemsPerPage(num);
                    await configSetters.setItemsPerPage(num);
                    toast.success(`Items per page set to ${num}`);
                  }}
                >
                      <SelectTrigger className="w-32 bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Project Statistics</Label>
                  <div className="text-sm text-text-muted mt-1">Display project stats on dashboard</div>
                </div>
                <Switch
                  checked={showProjectStats}
                  onCheckedChange={async (checked) => {
                    setShowProjectStats(checked);
                    await configSetters.setShowProjectStats(checked);
                    toast.success(`Project statistics ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card className="bg-background-elevated border-border">
          <button
            onClick={() => toggleSection('notifications')}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-text-primary">Notifications & Alerts</h3>
              <span className="text-sm text-text-muted">Configure alert preferences</span>
            </div>
            {expandedSections.notifications ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.notifications && (
            <div className="px-6 pb-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Health Check Alerts</Label>
                  <div className="text-sm text-text-muted mt-1">Get notified when health checks fail</div>
                </div>
                <Switch
                  checked={healthCheckAlerts}
                  onCheckedChange={async (checked) => {
                    setHealthCheckAlerts(checked);
                    await configSetters.setHealthCheckAlerts(checked);
                    toast.success(`Health check alerts ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Account Reconnect Alerts</Label>
                  <div className="text-sm text-text-muted mt-1">Get notified when account reconnection fails</div>
                </div>
                <Switch
                  checked={accountReconnectAlerts}
                  onCheckedChange={async (checked) => {
                    setAccountReconnectAlerts(checked);
                    await configSetters.setAccountReconnectAlerts(checked);
                    toast.success(`Account reconnect alerts ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cost Limit Warnings</Label>
                    <div className="text-sm text-text-muted mt-1">Alert when costs reach thresholds</div>
                  </div>
                  <Switch
                    checked={costWarningsEnabled}
                    onCheckedChange={async (checked) => {
                      setCostWarningsEnabled(checked);
                      await configSetters.setCostWarnings(checked);
                      toast.success(`Cost warnings ${checked ? 'enabled' : 'disabled'}`);
                    }}
                  />
                </div>
                {costWarningsEnabled && (
                  <div className="ml-6 text-sm text-text-muted">
                    Thresholds: 50%, 80%, 90%, 95%, 100%
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Quota Limit Warnings</Label>
                    <div className="text-sm text-text-muted mt-1">Alert when quotas reach thresholds</div>
                  </div>
                  <Switch
                    checked={quotaWarningsEnabled}
                    onCheckedChange={async (checked) => {
                      setQuotaWarningsEnabled(checked);
                      await configSetters.setQuotaWarnings(checked);
                      toast.success(`Quota warnings ${checked ? 'enabled' : 'disabled'}`);
                    }}
                  />
                </div>
                {quotaWarningsEnabled && (
                  <div className="ml-6 text-sm text-text-muted">
                    Thresholds: 50%, 80%, 90%, 95%, 100%
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Toast Duration</Label>
                  <div className="text-sm text-text-muted mt-1">How long notifications stay visible</div>
                </div>
                <Select
                  value={toastDuration.toString()}
                  onValueChange={async (value) => {
                    const num = parseInt(value);
                    setToastDuration(num);
                    await configSetters.setToastDuration(num);
                    toast.success(`Toast duration set to ${num} seconds`);
                  }}
                >
                      <SelectTrigger className="w-32 bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 sec</SelectItem>
                    <SelectItem value="10">10 sec</SelectItem>
                    <SelectItem value="15">15 sec</SelectItem>
                    <SelectItem value="30">30 sec</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Desktop Notifications</Label>
                  <div className="text-sm text-text-muted mt-1">Show system notifications for important events</div>
                </div>
                <Switch
                  checked={desktopNotifications}
                  onCheckedChange={async (checked) => {
                    setDesktopNotifications(checked);
                    await configSetters.setDesktopNotifications(checked);
                    toast.success(`Desktop notifications ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Projects */}
        <Card className="bg-background-elevated border-border">
          <button
            onClick={() => toggleSection('projects')}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-text-primary">Projects</h3>
              <span className="text-sm text-text-muted">Default project settings</span>
            </div>
            {expandedSections.projects ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.projects && (
            <div className="px-6 pb-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Default Instance Type</Label>
                  <div className="text-sm text-text-muted mt-1">Default EC2 instance type for new instances</div>
                </div>
                <Select
                  value={defaultInstanceType}
                  onValueChange={async (value) => {
                    setDefaultInstanceType(value);
                    await configSetters.setDefaultInstanceType(value);
                    toast.success(`Default instance type set to ${value}`);
                  }}
                >
                      <SelectTrigger className="w-64 bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {instanceTypes.map(type => (
                      <SelectItem value={type.value} key={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Default Snapshot Retention</Label>
                  <div className="text-sm text-text-muted mt-1">How long to keep snapshots (days)</div>
                </div>
                <Input
                  type="number"
                  value={defaultSnapshotRetention}
                  onChange={(e) => setDefaultSnapshotRetention(parseInt(e.target.value) || 0)}
                  onBlur={async () => {
                    await configSetters.setDefaultSnapshotRetention(defaultSnapshotRetention);
                    toast.success(`Snapshot retention set to ${defaultSnapshotRetention} days`);
                  }}
                  min="1"
                  max="365"
                  className="w-32 bg-background border-input"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Tag New Resources</Label>
                  <div className="text-sm text-text-muted mt-1">Automatically tag resources with project info</div>
                </div>
                <Switch
                  checked={autoTagNewResources}
                  onCheckedChange={async (checked) => {
                    setAutoTagNewResources(checked);
                    await configSetters.setAutoTagNewResources(checked);
                    toast.success(`Auto-tagging ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Confirm Destructive Actions</Label>
                  <div className="text-sm text-text-muted mt-1">Require confirmation before deleting or destroying</div>
                </div>
                <Switch
                  checked={confirmDestructiveActions}
                  onCheckedChange={async (checked) => {
                    setConfirmDestructiveActions(checked);
                    await configSetters.setConfirmDestructiveActions(checked);
                    toast.success(`Destructive action confirmations ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Performance */}
        <Card className="bg-background-elevated border-border">
          <button
            onClick={() => toggleSection('performance')}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-text-primary">Performance</h3>
              <span className="text-sm text-text-muted">Caching and API optimization</span>
            </div>
            {expandedSections.performance ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.performance && (
            <div className="px-6 pb-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cache Duration</Label>
                  <div className="text-sm text-text-muted mt-1">How long to cache API responses (minutes)</div>
                </div>
                <Input
                  type="number"
                  value={cacheDuration}
                  onChange={(e) => setCacheDuration(parseInt(e.target.value) || 0)}
                  onBlur={async () => {
                    await configSetters.setCacheDuration(cacheDuration);
                    toast.success(`Cache duration set to ${cacheDuration} minutes`);
                  }}
                  min="0"
                  max="60"
                  className="w-32 bg-background border-input"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Concurrent API Calls</Label>
                  <div className="text-sm text-text-muted mt-1">Maximum parallel API requests</div>
                </div>
                <Input
                  type="number"
                  value={concurrentApiCalls}
                  onChange={(e) => setConcurrentApiCalls(parseInt(e.target.value) || 1)}
                  onBlur={async () => {
                    await configSetters.setConcurrentApiCalls(concurrentApiCalls);
                    toast.success(`Concurrent API calls set to ${concurrentApiCalls}`);
                  }}
                  min="1"
                  max="20"
                  className="w-32 bg-background border-input"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Request Batching</Label>
                  <div className="text-sm text-text-muted mt-1">Batch multiple API requests together</div>
                </div>
                <Switch
                  checked={enableRequestBatching}
                  onCheckedChange={async (checked) => {
                    setEnableRequestBatching(checked);
                    await configSetters.setEnableRequestBatching(checked);
                    toast.success(`Request batching ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Security */}
        <Card className="bg-background-elevated border-border">
          <button
            onClick={() => toggleSection('security')}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-text-primary">Security</h3>
              <span className="text-sm text-text-muted">Security and audit settings</span>
            </div>
            {expandedSections.security ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.security && (
            <div className="px-6 pb-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Lock After Inactivity</Label>
                  <div className="text-sm text-text-muted mt-1">Lock app after idle time (minutes, 0 to disable)</div>
                </div>
                <Input
                  type="number"
                  value={autoLockAfterInactivity}
                  onChange={(e) => setAutoLockAfterInactivity(parseInt(e.target.value) || 0)}
                  onBlur={async () => {
                    await configSetters.setAutoLockAfterInactivity(autoLockAfterInactivity);
                    if (autoLockAfterInactivity === 0) {
                      toast.info('Auto-lock disabled');
                    } else {
                      toast.success(`Auto-lock set to ${autoLockAfterInactivity} minutes`);
                    }
                  }}
                  min="0"
                  max="120"
                  className="w-32 bg-background border-input"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Confirmation for Delete</Label>
                  <div className="text-sm text-text-muted mt-1">Show confirmation dialog before deleting resources</div>
                </div>
                <Switch
                  checked={requireConfirmationForDelete}
                  onCheckedChange={async (checked) => {
                    setRequireConfirmationForDelete(checked);
                    await configSetters.setRequireConfirmationForDelete(checked);
                    toast.success(`Delete confirmations ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Audit Logging</Label>
                  <div className="text-sm text-text-muted mt-1">Log all user actions for audit trail</div>
                </div>
                <Switch
                  checked={enableAuditLogging}
                  onCheckedChange={async (checked) => {
                    setEnableAuditLogging(checked);
                    await configSetters.setEnableAuditLogging(checked);
                    toast.success(`Audit logging ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Advanced */}
        <Card className="bg-background-elevated border-border">
          <button
            onClick={() => toggleSection('advanced')}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-text-primary">Advanced</h3>
              <span className="text-sm text-text-muted">Developer and debugging options</span>
            </div>
            {expandedSections.advanced ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.advanced && (
            <div className="px-6 pb-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Debug Mode</Label>
                  <div className="text-sm text-text-muted mt-1">Enable verbose logging and debug features</div>
                </div>
                <Switch
                  checked={debugMode}
                  onCheckedChange={async (checked) => {
                    setDebugMode(checked);
                    await configSetters.setDebugMode(checked);
                    toast.success(`Debug mode ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Logging Level</Label>
                  <div className="text-sm text-text-muted mt-1">Minimum severity for log messages</div>
                </div>
                <Select
                  value={loggingLevel}
                  onValueChange={async (value: 'error' | 'warn' | 'info' | 'debug') => {
                    setLoggingLevel(value);
                    await configSetters.setLoggingLevel(value);
                    toast.success(`Logging level set to ${value}`);
                  }}
                >
                      <SelectTrigger className="w-32 bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Raw API Responses</Label>
                  <div className="text-sm text-text-muted mt-1">Display raw API responses in console</div>
                </div>
                <Switch
                  checked={showRawApiResponses}
                  onCheckedChange={async (checked) => {
                    setShowRawApiResponses(checked);
                    await configSetters.setShowRawApiResponses(checked);
                    toast.success(`Raw API responses ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Developer Tools</Label>
                  <div className="text-sm text-text-muted mt-1">Allow access to browser DevTools (F12)</div>
                </div>
                <Switch
                  checked={enableDevTools}
                  onCheckedChange={async (checked) => {
                    setEnableDevTools(checked);
                    await configSetters.setEnableDevTools(checked);
                    toast.success(`Developer tools ${checked ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Data Management */}
        <Card className="bg-background-elevated border-border">
          <button
            onClick={() => toggleSection('data')}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-text-primary">Data Management</h3>
              <span className="text-sm text-text-muted">Backup, restore, and reset</span>
            </div>
            {expandedSections.data ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.data && (
            <div className="px-6 pb-6 space-y-6">
              <div>
                <Label className="mb-2 block">Configuration Backup</Label>
                <p className="text-sm text-text-muted mb-3">
                  Export your settings to a file or import a previously saved configuration.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleExportConfig}
                    className="border-input hover:bg-background-elevated"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Config
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleImportConfig}
                    className="border-input hover:bg-background-elevated"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Config
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <Label className="mb-2 block text-destructive">Danger Zone</Label>
                <p className="text-sm text-text-muted mb-3">
                  Reset all settings to their default values. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleResetConfig}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset to Defaults
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* About */}
        <Card className="bg-background-elevated border-border">
          <button
            onClick={() => toggleSection('about')}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-text-primary">About</h3>
              <span className="text-sm text-text-muted">Application information</span>
            </div>
            {expandedSections.about ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.about && (
            <div className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label>Version</Label>
                <span className="text-text-muted">1.0.0</span>
              </div>
              <div className="border-t border-border pt-4">
                <Label className="mb-2 block">Description</Label>
                <p className="text-sm text-text-muted leading-relaxed">
                  Pocket Architect is a multi-cloud infrastructure management tool with both CLI and GUI interfaces.
                  Manage your AWS, GCP, and Azure resources with a modern, intuitive interface designed for
                  developers and operations teams.
                </p>
              </div>
              <div className="border-t border-border pt-4">
                <Label className="mb-2 block">Key Features</Label>
                <ul className="text-sm text-text-muted space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Multi-cloud support (AWS, GCP, Azure)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Project-based resource isolation and management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Blueprint system for repeatable deployments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Snapshot and backup management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Cost management with alerts and limits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Integrated security and firewall management</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>

      <ThemeCreatorWizard
        open={themeCreatorOpen}
        onOpenChange={setThemeCreatorOpen}
        onThemeCreated={handleThemeCreated}
      />
    </div>
  );
}
