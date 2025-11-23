import { RefreshCw, Plus, TrendingUp, TrendingDown, Minus, Server, Database, HardDrive, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useBridge } from '../contexts/BridgeContext';
import { useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import type { Page } from '../App';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { bridge, isReady } = useBridge();
  const [projects, setProjects] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    if (isReady && bridge) {
      loadData();
    }
  }, [isReady, bridge]);

  const loadData = async () => {
    if (!bridge) return;
    
    try {
      setLoading(true);
      const [projectsData, snapshotsData] = await Promise.all([
        bridge.listProjects(),
        bridge.listSnapshots(),
      ]);

      if (Array.isArray(projectsData)) {
        setProjects(projectsData);
        
        // Calculate total cost
        const costPromises = projectsData.map((p: any) => 
          bridge.getCostInfo(p.name).catch(() => null)
        );
        const costs = await Promise.all(costPromises);
        const total = costs.reduce((sum: number, c: any) => {
          return sum + (c?.estimated_cost || 0);
        }, 0);
        setTotalCost(total);
      }

      if (Array.isArray(snapshotsData)) {
        setSnapshots(snapshotsData);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  // Calculate resource stats
  const runningCount = projects.filter((p: any) => p.status === 'running').length;
  const stoppedCount = projects.filter((p: any) => p.status === 'stopped').length;
  
  const resourceData = [
    { name: 'Running', count: runningCount },
    { name: 'Stopped', count: stoppedCount },
    { name: 'Snapshots', count: snapshots.length },
  ];

  // Mock cost data (would need historical data from backend)
  const costData = [
    { day: 'Day 1', cost: totalCost * 0.4 },
    { day: 'Day 5', cost: totalCost * 0.6 },
    { day: 'Day 10', cost: totalCost * 0.5 },
    { day: 'Day 15', cost: totalCost * 0.7 },
    { day: 'Day 20', cost: totalCost * 0.9 },
    { day: 'Day 25', cost: totalCost * 0.8 },
    { day: 'Day 30', cost: totalCost },
  ];

  const recentProjects = projects.slice(0, 5).map((p: any) => ({
    name: p.name,
    status: p.status,
    created: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Unknown',
  }));
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Welcome back, Architect</h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-400">Here's an overview of your AWS environments</p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="border-gray-700 hover:bg-[#2A2A2A]"
                onClick={handleRefresh}
                disabled={loading || !isReady}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button 
                className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
                onClick={() => onNavigate('projects')}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="bg-[#1E1E1E] border-gray-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-[#8B5CF6]/10 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-[#8B5CF6]" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-gray-400 mb-1">Active Projects</div>
          <div className="text-3xl">{loading ? '...' : projects.length}</div>
        </Card>

        <Card className="bg-[#1E1E1E] border-gray-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-green-500" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-gray-400 mb-1">Total Cost</div>
          <div className="text-3xl">${loading ? '...' : totalCost.toFixed(2)}</div>
        </Card>

        <Card className="bg-[#1E1E1E] border-gray-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-blue-500" />
            </div>
            <Minus className="w-5 h-5 text-gray-500" />
          </div>
          <div className="text-gray-400 mb-1">Snapshots</div>
          <div className="text-3xl">{loading ? '...' : snapshots.length}</div>
        </Card>

        <Card className="bg-[#1E1E1E] border-gray-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </div>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-gray-400 mb-1">Cost Alerts</div>
          <div className="text-3xl">0</div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="col-span-2 bg-[#1E1E1E] border-gray-800 p-6">
          <h3 className="text-lg mb-4">Cost Trends (30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={costData}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="day" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333' }}
                labelStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="cost" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="bg-[#1E1E1E] border-gray-800 p-6">
          <h3 className="text-lg mb-4">Resource Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resourceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card className="bg-[#1E1E1E] border-gray-800 p-6">
        <h3 className="text-lg mb-4">Recent Projects</h3>
        {loading ? (
          <div className="text-gray-400 text-center py-8">Loading...</div>
        ) : recentProjects.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No projects yet</div>
        ) : (
          <div className="space-y-3">
            {recentProjects.map((project, index) => (
              <div 
                key={index} 
                onClick={() => onNavigate('projects')}
                className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-lg hover:bg-[#2A2A2A] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${project.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{project.name}</span>
                      <Badge variant={project.status === 'running' ? 'default' : 'secondary'} className={project.status === 'running' ? 'bg-green-500/20 text-green-500 hover:bg-green-500/20' : 'bg-gray-700 text-gray-300'}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400">Created {project.created}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
