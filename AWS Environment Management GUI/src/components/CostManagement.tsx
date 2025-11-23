import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner@2.0.3';
import { useBridge } from '../contexts/BridgeContext';

const CHART_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

export function CostManagement() {
  const { bridge, isReady } = useBridge();
  const [projects, setProjects] = useState<any[]>([]);
  const [projectLimits, setProjectLimits] = useState<any[]>([]);
  const [costDistribution, setCostDistribution] = useState<any[]>([]);
  const [projectCosts, setProjectCosts] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [globalLimit, setGlobalLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [globalLimitDialogOpen, setGlobalLimitDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [limitAction, setLimitAction] = useState('warn_only');
  const [warningThreshold, setWarningThreshold] = useState('0.75');

  useEffect(() => {
    if (isReady && bridge) {
      loadData();
    }
  }, [isReady, bridge]);

  const loadData = async () => {
    if (!bridge) return;
    
    try {
      setLoading(true);
      const [projectsData, globalLimitData] = await Promise.all([
        bridge.listProjects(),
        bridge.getGlobalCostLimit(),
      ]);

      if (Array.isArray(projectsData)) {
        setProjects(projectsData);
        
        // Load cost info for each project
        const costInfos = await Promise.all(
          projectsData.map(async (p: any) => {
            const costInfo = await bridge.getCostInfo(p.name).catch(() => null);
            return {
              project: p.name,
              estimated: costInfo?.estimated_cost || 0,
              limit: costInfo?.limit || null,
              usage: costInfo?.limit && costInfo.estimated_cost ? (costInfo.estimated_cost / costInfo.limit) : 0,
              action: costInfo?.action || 'warn_only',
            };
          })
        );
        
        // Filter projects with limits for the table
        setProjectLimits(costInfos.filter((l: any) => l.limit !== null));
        
        // Calculate total cost
        const total = costInfos.reduce((sum: number, c: any) => sum + (c.estimated || 0), 0);
        setTotalCost(total);
        
        // Build cost distribution for pie chart (only projects with costs > 0)
        const distribution = costInfos
          .filter((c: any) => c.estimated > 0)
          .map((c: any, index: number) => ({
            name: c.project,
            value: c.estimated,
            color: CHART_COLORS[index % CHART_COLORS.length],
          }));
        setCostDistribution(distribution);
        
        // Build project costs for bar chart (only projects with costs > 0)
        const costs = costInfos
          .filter((c: any) => c.estimated > 0)
          .map((c: any) => ({
            name: c.project,
            cost: c.estimated,
          }));
        setProjectCosts(costs);
      }

      if (globalLimitData && globalLimitData.limit !== null && globalLimitData.limit !== undefined) {
        setGlobalLimit(globalLimitData.limit);
      } else {
        setGlobalLimit(null);
      }
    } catch (error: any) {
      console.error('Failed to load cost data:', error);
      toast.error('Failed to load cost data');
    } finally {
      setLoading(false);
    }
  };

  const getCostColor = (usage: number, estimated: number) => {
    if (usage >= 1.0 || estimated >= 100) return 'text-red-500';
    if (usage >= 0.75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressColor = (usage: number) => {
    if (usage >= 1.0) return 'bg-red-500';
    if (usage >= 0.75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleSetLimit = async () => {
    if (!bridge || !selectedProject || !limitAmount) return;

    try {
      const result = await bridge.setCostLimit(
        selectedProject,
        parseFloat(limitAmount),
        limitAction,
        parseFloat(warningThreshold)
      );
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || 'Cost limit updated successfully!');
        setLimitDialogOpen(false);
        setSelectedProject('');
        setLimitAmount('');
        setLimitAction('warn_only');
        setWarningThreshold('0.75');
        loadData();
      }
    } catch (error: any) {
      toast.error(`Failed to set cost limit: ${error.message}`);
    }
  };

  const handleSetGlobalLimit = async () => {
    if (!bridge || !globalLimit) return;

    try {
      const result = await bridge.setGlobalCostLimit(parseFloat(globalLimit.toString()));
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || 'Global cost limit set successfully!');
        setGlobalLimitDialogOpen(false);
        loadData();
      }
    } catch (error: any) {
      toast.error(`Failed to set global limit: ${error.message}`);
    }
  };

  const handleRemoveGlobalLimit = async () => {
    if (!bridge) return;

    try {
      const result = await bridge.setGlobalCostLimit(0);
      if (result.error) {
        toast.error(result.error);
      } else {
        setGlobalLimit(null);
        toast.success('Global cost limit removed');
        loadData();
      }
    } catch (error: any) {
      toast.error(`Failed to remove global limit: ${error.message}`);
    }
  };

  const handleCheckCosts = () => {
    toast.info('Checking current costs across all projects...');
  };

  return (
    <div className="p-8">
      {/* Charts Section */}
      {costDistribution.length > 0 || projectCosts.length > 0 ? (
        <div className="grid grid-cols-2 gap-6 mb-8">
          {costDistribution.length > 0 && (
            <Card className="bg-[#1E1E1E] border-gray-800 p-6">
              <h3 className="text-lg mb-4">Cost Distribution by Project</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name.split('-')[0]}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333' }}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
          {projectCosts.length > 0 && (
            <Card className="bg-[#1E1E1E] border-gray-800 p-6">
              <h3 className="text-lg mb-4">Project Costs Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectCosts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333' }}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <Bar dataKey="cost" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      ) : (
        !loading && (
          <Card className="bg-[#1E1E1E] border-gray-800 p-6 mb-8">
            <div className="text-center text-gray-400 py-8">
              No cost data available. Deploy projects to see cost information.
            </div>
          </Card>
        )
      )}

      {/* Project Cost Limits Section */}
      <Card className="bg-[#1E1E1E] border-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg">Project Cost Limits</h3>
          <div className="flex gap-3">
            <Button onClick={() => setLimitDialogOpen(true)} className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
              <Plus className="w-4 h-4 mr-2" />
              Set Cost Limit
            </Button>
            <Button onClick={handleCheckCosts} variant="outline" className="border-gray-700 hover:bg-[#2A2A2A]">
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Costs
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="text-left p-4 text-gray-400">Project</th>
                <th className="text-left p-4 text-gray-400">Estimated Cost</th>
                <th className="text-left p-4 text-gray-400">Limit</th>
                <th className="text-left p-4 text-gray-400">Usage %</th>
                <th className="text-left p-4 text-gray-400">Progress</th>
                <th className="text-left p-4 text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {projectLimits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No projects with cost limits set. Use "Set Cost Limit" to configure limits for your projects.
                  </td>
                </tr>
              ) : (
                projectLimits.map((project, index) => (
                  <tr key={`${project.project}-${index}`} className="border-b border-gray-800 hover:bg-[#2A2A2A] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {project.project}
                      {project.usage >= 0.75 && (
                        <Badge variant="destructive" className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Warning
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className={`p-4 ${getCostColor(project.usage, project.estimated)}`}>
                    ${project.estimated.toFixed(2)}
                  </td>
                  <td className="p-4 text-gray-400">${project.limit.toFixed(2)}</td>
                  <td className={`p-4 ${getCostColor(project.usage, project.estimated)}`}>
                    {(project.usage * 100).toFixed(1)}%
                  </td>
                  <td className="p-4">
                    <div className="w-full max-w-[200px]">
                      <Progress 
                        value={project.usage * 100} 
                        className="h-2"
                        indicatorClassName={getProgressColor(project.usage)}
                      />
                    </div>
                  </td>
                  <td className="p-4 text-gray-400 capitalize">{project.action.replace('_', ' ')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Global Cost Limit Section */}
      <Card className="bg-[#1E1E1E] border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg mb-2">Global Cost Limit</h3>
            {globalLimit !== null ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Current limit:</span>
                <span className="text-[#8B5CF6] text-xl">${globalLimit.toFixed(2)}</span>
                <Badge variant="default" className="bg-green-500/20 text-green-500 hover:bg-green-500/20">
                  Active
                </Badge>
              </div>
            ) : (
              <div className="text-gray-400">No global limit set</div>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setGlobalLimitDialogOpen(true)} variant="outline" className="border-gray-700 hover:bg-[#2A2A2A]">
              {globalLimit !== null ? 'Update Limit' : 'Set Global Limit'}
            </Button>
            {globalLimit !== null && (
              <Button onClick={handleRemoveGlobalLimit} variant="destructive" className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/50">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Limit
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Set Cost Limit Dialog */}
      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800">
          <DialogHeader>
            <DialogTitle>Set Project Cost Limit</DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure cost limits and actions for a specific project
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="bg-[#0F0F0F] border-gray-700">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cost Limit ($)</Label>
              <Input
                type="number"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                placeholder="100.00"
                className="bg-[#0F0F0F] border-gray-700"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label>Action on Limit Reached</Label>
              <Select value={limitAction} onValueChange={setLimitAction}>
                <SelectTrigger className="bg-[#0F0F0F] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn_only">Warn Only</SelectItem>
                  <SelectItem value="stop">Stop Resources</SelectItem>
                  <SelectItem value="teardown">Teardown Project</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Warning Threshold (0.0 - 1.0)</Label>
              <Input
                type="number"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(e.target.value)}
                placeholder="0.75"
                className="bg-[#0F0F0F] border-gray-700"
                step="0.01"
                min="0"
                max="1"
              />
              <p className="text-sm text-gray-400">Default: 0.75 (75% of limit)</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitDialogOpen(false)} className="border-gray-700">
              Cancel
            </Button>
            <Button
              onClick={handleSetLimit}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
              disabled={!selectedProject || !limitAmount}
            >
              Set Limit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global Limit Dialog */}
      <Dialog open={globalLimitDialogOpen} onOpenChange={setGlobalLimitDialogOpen}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800">
          <DialogHeader>
            <DialogTitle>{globalLimit !== null ? 'Update' : 'Set'} Global Cost Limit</DialogTitle>
            <DialogDescription className="text-gray-400">
              Set a maximum spending limit across all projects
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Global Cost Limit ($)</Label>
              <Input
                type="number"
                value={globalLimit !== null ? globalLimit.toString() : ''}
                onChange={(e) => setGlobalLimit(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="500.00"
                className="bg-[#0F0F0F] border-gray-700"
                step="0.01"
              />
            </div>

            <Card className="bg-[#8B5CF6]/10 border-[#8B5CF6]/30 p-4">
              <div className="text-sm">
                <div className="text-gray-300 mb-2">Current total estimated cost:</div>
                <div className="text-2xl text-[#8B5CF6]">${totalCost.toFixed(2)}</div>
              </div>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGlobalLimitDialogOpen(false)} className="border-gray-700">
              Cancel
            </Button>
            <Button
              onClick={handleSetGlobalLimit}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
              disabled={globalLimit === null || !isReady}
            >
              {globalLimit !== null ? 'Update' : 'Set'} Global Limit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
