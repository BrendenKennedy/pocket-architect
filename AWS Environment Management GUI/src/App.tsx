import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { Blueprints } from './components/Blueprints';
import { Snapshots } from './components/Snapshots';
import { CostManagement } from './components/CostManagement';
import { Settings } from './components/Settings';
import { Toaster } from './components/ui/sonner';
import { BridgeProvider } from './contexts/BridgeContext';

export type Page = 'dashboard' | 'projects' | 'blueprints' | 'snapshots' | 'cost' | 'settings';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={setActivePage} />;
      case 'projects':
        return <Projects />;
      case 'blueprints':
        return <Blueprints />;
      case 'snapshots':
        return <Snapshots />;
      case 'cost':
        return <CostManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <BridgeProvider>
      <div className="flex h-screen bg-[#0F0F0F] text-white dark">
        <Sidebar activePage={activePage} onPageChange={setActivePage} />
        <div className="flex-1 flex flex-col">
          {/* Menu Bar */}
          <div className="h-8 bg-[#1E1E1E] border-b border-gray-800 flex items-center px-4 gap-6">
            <div className="flex gap-4">
              <button className="hover:text-[#8B5CF6] transition-colors">File</button>
              <button className="hover:text-[#8B5CF6] transition-colors">View</button>
              <button className="hover:text-[#8B5CF6] transition-colors">Help</button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            {renderPage()}
          </div>

          {/* Status Bar */}
          <div className="h-6 bg-[#1E1E1E] border-t border-gray-800 flex items-center justify-between px-4">
            <span className="text-gray-400">Ready</span>
            <span className="text-gray-400">AWS: us-east-1</span>
          </div>
        </div>
        <Toaster />
      </div>
    </BridgeProvider>
  );
}