import { useState, useEffect } from 'react';
import { Check, X, RefreshCw, Palette, Settings as SettingsIcon, Download, Upload } from 'lucide-react';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { toast } from 'sonner@2.0.3';
import { useNeon } from '../contexts/NeonContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeCreatorWizard } from './ThemeCreatorWizard';
import { getAllThemes } from '../config/themes';
import { loadConfig, configSetters, exportConfig, importConfig } from '../services';

export function Settings() {
  const { currentTheme, setTheme, refreshThemes } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(currentTheme.name);

  // Config state
  const [config, setConfig] = useState<any>(null);
  const [fontFamily, setFontFamily] = useState('system');
  const [textSize, setTextSize] = useState([100]);
  const [region, setRegion] = useState('us-east-1');
  const [autoRefresh, setAutoRefresh] = useState('30');
  const [credentialsConnected, setCredentialsConnected] = useState(true);
  const { neonIntensity, setNeonIntensity } = useNeon();
  const [themeCreatorOpen, setThemeCreatorOpen] = useState(false);
  const [themes, setThemes] = useState(getAllThemes());

  // Load settings from config on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedConfig = await loadConfig();
        setConfig(loadedConfig);
        setFontFamily(loadedConfig.appearance.fontFamily);
        setTextSize([loadedConfig.appearance.textSize]);
        setRegion(loadedConfig.aws.defaultRegion);
        setAutoRefresh(loadedConfig.dashboard.autoRefreshInterval.toString());
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Sync selected theme with current theme from context
  useEffect(() => {
    setSelectedTheme(currentTheme.name);
  }, [currentTheme]);

  // Reload themes when theme creator closes
  const handleThemeCreated = () => {
    refreshThemes();
    setThemes(getAllThemes());
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

  const handleRefreshCredentials = () => {
    toast.success('AWS credentials refreshed successfully!');
  };

  const handleThemeChange = (value: string) => {
    setSelectedTheme(value);
    toast.success(`Theme changed to ${value}`);
  };

  const handleRegionChange = async (value: string) => {
    setRegion(value);
    await configSetters.setDefaultRegion('aws', value);
    toast.success(`Region changed to ${value}`);
  };

  const handleAutoRefreshChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAutoRefresh(value);
    await configSetters.setAutoRefreshInterval(parseInt(value) || 0);
    if (value === '0') {
      toast.info('Auto-refresh disabled');
    } else {
      toast.success(`Auto-refresh set to ${value} seconds`);
    }
  };

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
      toast.success('Configuration exported successfully!');
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
        const imported = await importConfig(text);
        // Reload the page to apply all settings
        toast.success('Configuration imported! Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        toast.error('Failed to import configuration. Invalid file format.');
      }
    };
    input.click();
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SettingsIcon className="size-8 text-primary" />
          <h2 className="text-primary">Settings</h2>
        </div>
        <Button variant="ghost" size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <Card className="bg-background-elevated border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="text-lg text-text-primary">Appearance & Customization</h3>
          </div>
          
          <div className="space-y-6">
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
                        : 'border-border-muted hover:border-border'
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
            <div className="border-t border-border pt-6">
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
                  <SelectTrigger className="w-64 bg-background border-border-muted">
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
            </div>

            {/* Text Size */}
            <div className="border-t border-border pt-6">
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
                      onClick={() => {
                        setTextSize([100]);
                        toast.info('Text size reset to 100%');
                      }}
                      className="border-border-muted hover:bg-background-elevated"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                <Slider
                  value={textSize}
                  onValueChange={(value) => {
                    setTextSize(value);
                  }}
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
            </div>

            {/* Neon Intensity */}
            <div className="border-t border-border pt-6">
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
                      className="border-border-muted hover:bg-background-elevated"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[neonIntensity * 100]}
                  onValueChange={(value) => {
                    setNeonIntensity(value[0] / 100);
                  }}
                  onValueCommit={(value) => {
                    toast.success(`Neon intensity set to ${value[0]}%`);
                  }}
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
                {/* Preview dots */}
                <div className="flex items-center gap-4 mt-4 bg-background rounded-lg p-4 border border-border-muted">
                  <span className="text-sm text-text-muted">Preview:</span>
                  <div 
                    className="w-3 h-3 rounded-full bg-green-500" 
                    style={{ filter: neonIntensity > 0 ? `drop-shadow(0 0 ${3 * neonIntensity}px rgba(34, 197, 94, 0.5)) drop-shadow(0 0 ${6 * neonIntensity}px rgba(34, 197, 94, 0.3))` : 'none' }}
                  />
                  <div 
                    className="w-3 h-3 rounded-full bg-yellow-500" 
                    style={{ filter: neonIntensity > 0 ? `drop-shadow(0 0 ${3 * neonIntensity}px rgba(234, 179, 8, 0.5)) drop-shadow(0 0 ${6 * neonIntensity}px rgba(234, 179, 8, 0.3))` : 'none' }}
                  />
                  <div 
                    className="w-3 h-3 rounded-full bg-red-500" 
                    style={{ filter: neonIntensity > 0 ? `drop-shadow(0 0 ${3 * neonIntensity}px rgba(239, 68, 68, 0.5)) drop-shadow(0 0 ${6 * neonIntensity}px rgba(239, 68, 68, 0.3))` : 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border-t border-border pt-6">
              <Label className="mb-3 block">Preview</Label>
              <div className="bg-background rounded-lg p-6 border border-border-muted">
                <div className="space-y-3">
                  <h4 style={{ fontSize: `${textSize[0]}%` }}>Sample Heading</h4>
                  <p className="text-text-muted" style={{ fontSize: `${textSize[0] * 0.875}%` }}>
                    This is how your text will appear with the current settings. Adjust the text size slider above to see changes in real-time.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      style={{ fontSize: `${textSize[0] * 0.875}%` }}
                    >
                      Sample Button
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* AWS Configuration */}
        <Card className="bg-background-elevated border-border p-6">
          <h3 className="text-lg mb-4 text-text-primary">AWS Configuration</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Default Region</Label>
                <div className="text-sm text-text-muted mt-1">Select your primary AWS region</div>
              </div>
              <Select value={region} onValueChange={handleRegionChange}>
                <SelectTrigger className="w-64 bg-background border-border-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-east-2">US East (Ohio)</SelectItem>
                  <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
                  <SelectItem value="eu-central-1">EU Central (Frankfurt)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                  <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>AWS Credentials</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {credentialsConnected ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm text-green-500">Connected</span>
                        <Check className="w-4 h-4 text-green-500" />
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-sm text-red-500">Not Connected</span>
                        <X className="w-4 h-4 text-red-500" />
                      </>
                    )}
                  </div>
                  {!credentialsConnected && (
                    <div className="mt-2 text-sm text-text-muted">
                      Please configure your AWS credentials in ~/.aws/credentials
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleRefreshCredentials}
                  className="border-border-muted hover:bg-background-elevated"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Auto-Refresh */}
        <Card className="bg-background-elevated border-border p-6">
          <h3 className="text-lg mb-4 text-text-primary">Auto-Refresh</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Refresh Interval (seconds)</Label>
                <div className="text-sm text-text-muted mt-1">
                  Set to 0 to disable automatic refreshing
                </div>
              </div>
              <Input
                type="number"
                value={autoRefresh}
                onChange={handleAutoRefreshChange}
                min="0"
                max="3600"
                step="10"
                className="w-32 bg-background border-border-muted"
              />
            </div>
            {autoRefresh === '0' ? (
              <div className="text-sm text-text-muted bg-background-elevated rounded-lg p-3">
                Auto-refresh is currently disabled
              </div>
            ) : (
              <div className="text-sm text-text-muted bg-background-elevated rounded-lg p-3">
                Dashboard and project data will refresh every {autoRefresh} seconds
              </div>
            )}
          </div>
        </Card>

        {/* Configuration Management */}
        <Card className="bg-background-elevated border-border p-6">
          <h3 className="text-lg mb-4 text-text-primary">Configuration Management</h3>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Backup & Restore</Label>
              <p className="text-sm text-text-muted mb-3">
                Export your settings to a file or import a previously saved configuration.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportConfig}
                  className="border-border-muted hover:bg-background-elevated"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Config
                </Button>
                <Button
                  variant="outline"
                  onClick={handleImportConfig}
                  className="border-border-muted hover:bg-background-elevated"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Config
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card className="bg-background-elevated border-border p-6">
          <h3 className="text-lg mb-4 text-text-primary">About</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Version</Label>
              <span className="text-text-muted">1.0.0</span>
            </div>
            <div className="border-t border-border pt-4">
              <Label className="mb-2 block">Description</Label>
              <p className="text-sm text-text-muted leading-relaxed">
                Pocket Architect is a modern desktop application for managing isolated AWS environments. 
                It provides a streamlined interface for deploying, monitoring, and managing cloud resources 
                with built-in cost management and snapshot capabilities.
              </p>
            </div>
            <div className="border-t border-border pt-4">
              <Label className="mb-2 block">Features</Label>
              <ul className="text-sm text-text-muted space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Deploy and manage AWS projects from blueprints</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Create and restore snapshots for backup and deployment</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Advanced cost management with limits and alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Real-time monitoring and resource status tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Custom blueprint creation with step-by-step wizards</span>
                </li>
              </ul>
            </div>
          </div>
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