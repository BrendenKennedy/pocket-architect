import { useState, useEffect } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { useBridge } from '../contexts/BridgeContext';

export function Settings() {
  const { bridge, isReady } = useBridge();
  const [theme, setTheme] = useState('dark');
  const [region, setRegion] = useState('us-east-1');
  const [autoRefresh, setAutoRefresh] = useState('30');
  const [credentialsConnected, setCredentialsConnected] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(true);

  useEffect(() => {
    if (isReady && bridge) {
      checkCredentials();
    }
  }, [isReady, bridge]);

  const checkCredentials = async () => {
    if (!bridge) return;
    
    try {
      setCredentialsLoading(true);
      const result = await bridge.checkAwsCredentials();
      setCredentialsConnected(result.valid || false);
    } catch (error) {
      console.error('Failed to check credentials:', error);
      setCredentialsConnected(false);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const handleRefreshCredentials = async () => {
    await checkCredentials();
    if (credentialsConnected) {
      toast.success('AWS credentials refreshed successfully!');
    } else {
      toast.error('AWS credentials not found or invalid');
    }
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    toast.success(`Theme changed to ${value}`);
  };

  const handleRegionChange = (value: string) => {
    setRegion(value);
    toast.success(`Region changed to ${value}`);
  };

  const handleAutoRefreshChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAutoRefresh(value);
    if (value === '0') {
      toast.info('Auto-refresh disabled');
    } else {
      toast.success(`Auto-refresh set to ${value} seconds`);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Appearance */}
        <Card className="bg-[#1E1E1E] border-gray-800 p-6">
          <h3 className="text-lg mb-4">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <div className="text-sm text-gray-400 mt-1">Choose your preferred color scheme</div>
              </div>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-48 bg-[#0F0F0F] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* AWS Configuration */}
        <Card className="bg-[#1E1E1E] border-gray-800 p-6">
          <h3 className="text-lg mb-4">AWS Configuration</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Default Region</Label>
                <div className="text-sm text-gray-400 mt-1">Select your primary AWS region</div>
              </div>
              <Select value={region} onValueChange={handleRegionChange}>
                <SelectTrigger className="w-64 bg-[#0F0F0F] border-gray-700">
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

            <div className="border-t border-gray-800 pt-6">
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
                    <div className="mt-2 text-sm text-gray-400">
                      Please configure your AWS credentials in ~/.aws/credentials
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleRefreshCredentials}
                  className="border-gray-700 hover:bg-[#2A2A2A]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Auto-Refresh */}
        <Card className="bg-[#1E1E1E] border-gray-800 p-6">
          <h3 className="text-lg mb-4">Auto-Refresh</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Refresh Interval (seconds)</Label>
                <div className="text-sm text-gray-400 mt-1">
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
                className="w-32 bg-[#0F0F0F] border-gray-700"
              />
            </div>
            {autoRefresh === '0' ? (
              <div className="text-sm text-gray-400 bg-[#0F0F0F] rounded-lg p-3">
                Auto-refresh is currently disabled
              </div>
            ) : (
              <div className="text-sm text-gray-400 bg-[#0F0F0F] rounded-lg p-3">
                Dashboard and project data will refresh every {autoRefresh} seconds
              </div>
            )}
          </div>
        </Card>

        {/* About */}
        <Card className="bg-[#1E1E1E] border-gray-800 p-6">
          <h3 className="text-lg mb-4">About</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Version</Label>
              <span className="text-gray-400">1.0.0</span>
            </div>
            <div className="border-t border-gray-800 pt-4">
              <Label className="mb-2 block">Description</Label>
              <p className="text-sm text-gray-400 leading-relaxed">
                Pocket Architect is a modern desktop application for managing isolated AWS environments. 
                It provides a streamlined interface for deploying, monitoring, and managing cloud resources 
                with built-in cost management and snapshot capabilities.
              </p>
            </div>
            <div className="border-t border-gray-800 pt-4">
              <Label className="mb-2 block">Features</Label>
              <ul className="text-sm text-gray-400 space-y-2">
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
    </div>
  );
}
