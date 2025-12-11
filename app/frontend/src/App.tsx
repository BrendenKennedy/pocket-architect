import { useState } from 'react';
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
import { getRegionsForPlatform, getDefaultRegion } from './data/regions';
import type { Platform } from './types/models';

export type Page = 'dashboard' | 'projects' | 'blueprints' | 'security' | 'images' | 'instances' | 'accounts' | 'cost' | 'settings' | 'learning';

function AppContent() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('aws');
  const [selectedRegion, setSelectedRegion] = useState(getDefaultRegion(selectedPlatform));
  const { getNeonGlow } = useNeon();

  // Connection status for each provider
  const [awsConnected, setAwsConnected] = useState(true);
  const [gcpConnected, setGcpConnected] = useState(true);
  const [azureConnected, setAzureConnected] = useState(true);

  // Handle platform change and reset region to first available
  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform);
    setSelectedRegion(getDefaultRegion(platform));
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

  return (
    <div className="flex h-screen bg-background text-foreground dark overflow-hidden flex-col">
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
          {/* Connection Status Indicator - 3 Lights for AWS, GCP, Azure - MOVED TO FARTHEST RIGHT */}
          <button
            onClick={() => setActivePage('accounts')}
            className="flex flex-col gap-0.5 px-2 py-1.5 rounded hover:bg-accent transition-colors group"
            title={`AWS: ${awsConnected ? 'Connected' : 'Disconnected'}\nGCP: ${gcpConnected ? 'Connected' : 'Disconnected'}\nAzure: ${azureConnected ? 'Connected' : 'Disconnected'}`}
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
    <NeonProvider>
      <AppContent />
    </NeonProvider>
  );
}