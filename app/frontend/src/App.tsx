import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects_refactored';
import { Blueprints } from './components/Blueprints_refactored';
import { Security } from './components/Security_refactored';
import { Images } from './components/Images_refactored';
import { Instances } from './components/Instances_refactored';
import { Accounts } from './components/Accounts';
import { CostManagement } from './components/CostManagement';
import { Settings } from './components/Settings';
import { Learning } from './components/Learning';
import { Toaster } from './components/ui/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Box } from 'lucide-react';
import { NeonProvider, useNeon } from './contexts/NeonContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { getRegionsForPlatform, getDefaultRegion } from './data/regions';
import type { Platform } from './types/models';
import { loadConfig, configSetters } from './services';
import { bridgeApi } from './bridge/api';

export type Page = 'dashboard' | 'projects' | 'blueprints' | 'security' | 'images' | 'instances' | 'accounts' | 'cost' | 'settings' | 'learning';

function AppContent() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('aws');
  const [selectedRegion, setSelectedRegion] = useState(getDefaultRegion('aws'));
  const [configLoaded, setConfigLoaded] = useState(false);
  const { getNeonGlow } = useNeon();

  // Load config on mount
  useEffect(() => {
    const loadAppConfig = async () => {
      try {
        const config = await loadConfig();
        setActivePage(config.ui.lastActivePage as Page || 'dashboard');
        setSelectedPlatform(config.platform.selected as Platform || 'aws');
        setSelectedRegion(
          config.platform.defaultRegion[config.platform.selected as Platform] ||
          getDefaultRegion(config.platform.selected as Platform)
        );
        setConfigLoaded(true);
      } catch (error) {
        console.error('Failed to load app config:', error);
        setConfigLoaded(true); // Continue with defaults
      }
    };
    loadAppConfig();
  }, []);

  // Connection status for each provider
  const [awsConnected, setAwsConnected] = useState(false);
  const [gcpConnected, setGcpConnected] = useState(false);
  const [azureConnected, setAzureConnected] = useState(false);

  // Fetch account connection status
  useEffect(() => {
    const fetchAccountStatus = async () => {
      try {
        const accounts = await bridgeApi.listAccounts();

        // Check each platform
        const awsAccount = accounts.find(acc => acc.platform === 'aws');
        const gcpAccount = accounts.find(acc => acc.platform === 'gcp');
        const azureAccount = accounts.find(acc => acc.platform === 'azure');

        setAwsConnected(awsAccount?.status === 'connected');
        setGcpConnected(gcpAccount?.status === 'connected');
        setAzureConnected(azureAccount?.status === 'connected');
      } catch (error) {
        console.error('Failed to fetch account status:', error);
        // Default to disconnected on error
        setAwsConnected(false);
        setGcpConnected(false);
        setAzureConnected(false);
      }
    };

    fetchAccountStatus();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAccountStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Save active page to config when it changes
  useEffect(() => {
    configSetters.setLastActivePage(activePage);
  }, [activePage]);

  // Save platform to config when it changes
  useEffect(() => {
    configSetters.setSelectedPlatform(selectedPlatform);
  }, [selectedPlatform]);

  // Save region to config when it changes
  useEffect(() => {
    if (configLoaded) {
      configSetters.setDefaultRegion(selectedPlatform, selectedRegion);
    }
  }, [selectedPlatform, selectedRegion, configLoaded]);

  // Handle platform change and reset region to first available
  const handlePlatformChange = async (platform: Platform) => {
    setSelectedPlatform(platform);
    try {
      const config = await loadConfig();
      const newRegion = config.platform.defaultRegion[platform] || getDefaultRegion(platform);
      setSelectedRegion(newRegion);
    } catch (error) {
      console.error('Failed to load config for platform change:', error);
      setSelectedRegion(getDefaultRegion(platform));
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard selectedPlatform={selectedPlatform} />;
      case 'projects':
        return <Projects />;
      case 'blueprints':
        return <Blueprints />;
      case 'security':
        return <Security />;
      case 'images':
        return <Images />;
      case 'instances':
        return <Instances />;
      case 'accounts':
        return <Accounts />;
      case 'cost':
        return <CostManagement />;
      case 'settings':
        return <Settings />;
      case 'learning':
        return <Learning />;
      default:
        return <Dashboard />;
    }
  };

  // Show loading state while config is being loaded
  if (!configLoaded) {
    return (
      <div className="flex h-screen bg-background text-foreground items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading Pocket Architect...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden flex-col">
      {/* Top Menu Bar - Full Width */}
      <div className="h-[52px] bg-card border-b border-border flex items-center px-4 gap-6 flex-shrink-0 justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-br from-primary to-[#6D28D9] rounded flex items-center justify-center flex-shrink-0">
            <Box className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] leading-tight text-muted-foreground">Pocket</span>
            <span className="text-[11px] leading-tight">Architect</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-border">|</span>
          {/* Platform Selector */}
          <Select onValueChange={(value) => handlePlatformChange(value as Platform)} value={selectedPlatform}>
            <SelectTrigger className="w-auto h-7 border-none bg-transparent hover:bg-accent focus:ring-0 text-muted-foreground text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aws">☁️ AWS</SelectItem>
              <SelectItem value="gcp">🌐 GCP</SelectItem>
              <SelectItem value="azure">⛅ Azure</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-border">|</span>
          {/* Region Selector */}
          <Select onValueChange={setSelectedRegion} value={selectedRegion}>
            <SelectTrigger className="w-auto h-7 border-none bg-transparent hover:bg-accent focus:ring-0 text-muted-foreground text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {getRegionsForPlatform(selectedPlatform).map(region => (
                <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-border">|</span>
          {/* Connection Status Indicator - 3 Lights for AWS, GCP, Azure */}
          <button
            onClick={() => setActivePage('accounts')}
            className="flex flex-col gap-0.5 px-2 py-1.5 rounded hover:bg-accent transition-colors group"
            title={`Cloud Accounts\n\nAWS: ${awsConnected ? '✓ Connected' : '✗ Disconnected'}\nGCP: ${gcpConnected ? '✓ Connected' : '✗ Disconnected'}\nAzure: ${azureConnected ? '✓ Connected' : '✗ Disconnected'}\n\nClick to manage accounts`}
          >
            {/* AWS */}
            <div 
              className={`w-1 h-1 rounded-full ${awsConnected ? 'bg-green-500' : 'bg-red-500'}`} 
              style={{ filter: getNeonGlow(awsConnected ? '#22C55E' : '#EF4444') }}
            ></div>
            {/* GCP */}
            <div 
              className={`w-1 h-1 rounded-full ${gcpConnected ? 'bg-green-500' : 'bg-red-500'}`} 
              style={{ filter: getNeonGlow(gcpConnected ? '#22C55E' : '#EF4444') }}
            ></div>
            {/* Azure */}
            <div 
              className={`w-1 h-1 rounded-full ${azureConnected ? 'bg-green-500' : 'bg-red-500'}`} 
              style={{ filter: getNeonGlow(azureConnected ? '#22C55E' : '#EF4444') }}
            ></div>
          </button>
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 min-h-0">
        <Sidebar activePage={activePage} onPageChange={setActivePage} />
        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {renderPage()}
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NeonProvider>
        <AppContent />
      </NeonProvider>
    </ThemeProvider>
  );
}