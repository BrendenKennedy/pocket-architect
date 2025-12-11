import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Plus, RefreshCw, Trash2, DollarSign as DollarIcon, Clock, Eye, Server, TrendingDown, Zap, Edit2, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { CreationWizard } from './ui/creation-wizard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { toast } from 'sonner@2.0.3';
import { BudgetBar } from './BudgetBar';
import { CircularProgress } from './ui/circular-progress';
import { ProjectColorDot, StatusNeonDot } from './ui/neon-dot';
import { DataTable, TableColumn, TableAction } from './ui/data-table';
import { useNeon } from '../contexts/NeonContext';

// Project cost tracking with actual costs and rates
interface ProjectCostData {
  id: number;
  project: string;
  projectColor?: string;
  instances: number;
  actualCost: number; // Cost at last check
  hourlyRate: number; // Cost per hour
  lastChecked: Date;
  limit: number;
  action: string;
}

const initialProjectCosts: ProjectCostData[] = [
  { 
    id: 1, 
    project: 'production-web-app',
    projectColor: '#A855F7',
    instances: 2,
    actualCost: 118.45, 
    hourlyRate: 0.156, // t3.medium * 2 instances
    lastChecked: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    limit: 150.00, 
    action: 'warn_only' 
  },
  { 
    id: 2, 
    project: 'dev-environment',
    projectColor: '#3B82F6',
    instances: 1,
    actualCost: 41.20, 
    hourlyRate: 0.042, // t3.small
    lastChecked: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    limit: 50.00, 
    action: 'stop' 
  },
  { 
    id: 3, 
    project: 'staging-cluster',
    projectColor: '#10B981',
    instances: 3,
    actualCost: 85.30, 
    hourlyRate: 0.208, // t3.large * 3 nodes
    lastChecked: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    limit: 200.00, 
    action: 'warn_only' 
  },
  { 
    id: 4, 
    project: 'ml-pipeline',
    projectColor: '#F59E0B',
    instances: 1,
    actualCost: 48.50, 
    hourlyRate: 12.24, // p3.8xlarge (expensive!)
    lastChecked: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    limit: 100.00, 
    action: 'teardown' 
  },
];

export function CostManagement() {
  const { neonIntensity } = useNeon();
  const [projectCosts, setProjectCosts] = useState<ProjectCostData[]>(initialProjectCosts);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [globalLimitDialogOpen, setGlobalLimitDialogOpen] = useState(false);
  const [hasGlobalLimit, setHasGlobalLimit] = useState(true);
  const [globalLimit, setGlobalLimit] = useState('500.00');
  const [selectedProject, setSelectedProject] = useState('');
  const [limitAmount, setLimitAmount] = useState('')
  const [limitAction, setLimitAction] = useState('warn_only');
  const [warningThreshold, setWarningThreshold] = useState('0.75');

  // Detail wizard state
  const [detailWizardOpen, setDetailWizardOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<ProjectCostData | null>(null);
  const [editLimitAmount, setEditLimitAmount] = useState('');
  const [editLimitAction, setEditLimitAction] = useState('warn_only');
  const [editWarningThreshold, setEditWarningThreshold] = useState('0.75');

  // Helper function to get color based on resource usage
  const getResourceColor = (usage: number, threshold: number = 100) => {
    const ratio = usage / threshold;
    if (ratio >= 1.0) return '#EF4444'; // Red - over threshold
    if (ratio >= 0.85) return '#F59E0B'; // Orange - very close
    if (ratio >= 0.7) return '#EAB308'; // Yellow - approaching
    return '#22C55E'; // Green - safe
  };

  // Update current time every minute to reflect cost increases
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate current estimated cost based on time since last check
  const calculateCurrentCost = (project: ProjectCostData) => {
    const hoursSinceCheck = (currentTime.getTime() - project.lastChecked.getTime()) / (1000 * 60 * 60);
    const accruedCost = hoursSinceCheck * project.hourlyRate;
    return project.actualCost + accruedCost;
  };

  // Get time since last check formatted
  const getTimeSinceCheck = (lastChecked: Date) => {
    const minutes = Math.floor((currentTime.getTime() - lastChecked.getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h ago`;
  };

  // Generate time series data for cost consumption rate chart
  const getTimeSeriesData = () => {
    const now = Date.now();
    const hoursToShow = 12; // Show last 12 hours
    const dataPoints: any[] = [];
    
    // Generate data points for each hour going backwards from now
    for (let i = hoursToShow; i >= 0; i--) {
      const timePoint = new Date(now - i * 60 * 60 * 1000);
      const hour = timePoint.getHours();
      const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
      
      const dataPoint: any = { time: timeLabel };
      
      // Calculate cost for each project at this historical time point
      projectCosts.forEach((project) => {
        const projectName = project.project.split('-')[0];
        
        // How many hours ago was this data point?
        const hoursAgo = i;
        
        // How many hours since the project was last checked?
        const hoursSinceLastCheck = (now - project.lastChecked.getTime()) / (1000 * 60 * 60);
        
        // At this point in time, how long had it been since last check?
        const hoursElapsedAtThisPoint = hoursSinceLastCheck - hoursAgo;
        
        if (hoursElapsedAtThisPoint <= 0) {
          // This data point is before the last check - use the base actual cost
          dataPoint[projectName] = project.actualCost;
        } else {
          // This data point is after the last check - calculate accumulated cost
          const accruedCost = hoursElapsedAtThisPoint * project.hourlyRate;
          dataPoint[projectName] = project.actualCost + accruedCost;
        }
      });
      
      dataPoints.push(dataPoint);
    }
    
    return dataPoints;
  };

  // Calculate total current cost
  const getTotalCurrentCost = () => {
    return projectCosts.reduce((sum, project) => sum + calculateCurrentCost(project), 0);
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

  const handleSetLimit = () => {
    toast.success('Cost limit updated successfully!');
    setLimitDialogOpen(false);
    setSelectedProject('');
    setLimitAmount('');
    setLimitAction('warn_only');
    setWarningThreshold('0.75');
  };

  const handleSetGlobalLimit = () => {
    setHasGlobalLimit(true);
    toast.success('Global cost limit set successfully!');
    setGlobalLimitDialogOpen(false);
  };

  const handleRemoveGlobalLimit = () => {
    setHasGlobalLimit(false);
    toast.success('Global cost limit removed');
  };

  const handleCheckCosts = () => {
    // Update all projects: set actualCost to current estimated, reset lastChecked
    const updatedProjects = projectCosts.map(project => ({
      ...project,
      actualCost: calculateCurrentCost(project),
      lastChecked: new Date()
    }));
    setProjectCosts(updatedProjects);
    setCurrentTime(new Date());
    toast.success('Cost data refreshed from cloud provider!');
  };

  const handleOpenDetailWizard = (project: ProjectCostData) => {
    setDetailProject(project);
    setEditLimitAmount(project.limit.toString());
    setEditLimitAction(project.action);
    setEditWarningThreshold('0.75'); // Default value
    setDetailWizardOpen(true);
  };

  const handleSaveDetails = () => {
    if (!detailProject) return;
    
    const updatedProjects = projectCosts.map(p => 
      p.id === detailProject.id 
        ? { ...p, limit: parseFloat(editLimitAmount), action: editLimitAction }
        : p
    );
    setProjectCosts(updatedProjects);
    toast.success('Project settings updated successfully!');
    setDetailWizardOpen(false);
    setDetailProject(null);
  };

  // Generate budget bar segments
  const getBudgetBarSegments = () => {
    const colors = ['#A78BFA', '#60A5FA', '#34D399', '#FBBF24'];
    const segments = projectCosts.map((project, index) => ({
      id: project.id,
      name: project.project.split('-')[0],
      value: calculateCurrentCost(project),
      color: project.projectColor || colors[index % colors.length],
      isRemaining: false,
      onClick: () => handleOpenDetailWizard(project)
    }));

    // Add remaining budget segment
    const totalCost = getTotalCurrentCost();
    const globalLimitNum = parseFloat(globalLimit);
    const remaining = Math.max(0, globalLimitNum - totalCost);
    
    if (remaining > 0) {
      segments.push({
        id: 'remaining',
        name: 'Budget Remaining',
        value: remaining,
        color: '#6B7280', // Grey instead of green
        isRemaining: true,
        onClick: undefined
      });
    }

    return segments;
  };

  const totalCost = getTotalCurrentCost();
  const totalHourlyRate = projectCosts.reduce((sum, p) => sum + p.hourlyRate, 0);
  const totalInstances = projectCosts.reduce((sum, p) => sum + p.instances, 0);
  const globalLimitNum = parseFloat(globalLimit);
  const globalUsage = totalCost / globalLimitNum;
  const budgetSegments = getBudgetBarSegments();

  // Cost table configuration
  const columns: TableColumn<ProjectCostData>[] = [
    {
      key: 'project',
      header: 'Project',
      width: 'w-[25%]',
      align: 'left' as const,
      render: (project) => {
        const currentCost = calculateCurrentCost(project);
        const usage = currentCost / project.limit;
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="truncate">{project.project}</span>
              {project.projectColor && (
                <ProjectColorDot 
                  color={project.projectColor}
                  projectName={project.project}
                  size="md"
                />
              )}
            </div>
            {usage >= 0.75 && usage < 1.0 && (
              <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500 shrink-0 w-fit">
                <StatusNeonDot status="warning" size="xs" className="mr-1" />
                Warning
              </Badge>
            )}
            {usage >= 1.0 && (
              <Badge variant="outline" className="text-xs border-red-500/50 text-red-500 shrink-0 w-fit">
                <StatusNeonDot status="error" size="xs" className="mr-1" />
                Over Limit
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'current',
      header: 'Current',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (project) => {
        const currentCost = calculateCurrentCost(project);
        const usage = currentCost / project.limit;
        return (
          <span style={{ color: getResourceColor(usage * 100) }}>
            ${currentCost.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'limit',
      header: 'Limit',
      width: 'w-[15%]',
      align: 'center' as const,
      render: (project) => (
        <span className="text-muted-foreground">${project.limit.toFixed(2)}</span>
      ),
    },
    {
      key: 'hourly',
      header: 'Hourly',
      width: 'w-[12%]',
      align: 'center' as const,
      render: (project) => (
        <span className="text-muted-foreground">${project.hourlyRate.toFixed(3)}</span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      width: 'w-[23%]',
      align: 'center' as const,
      render: (project) => {
        const currentCost = calculateCurrentCost(project);
        const usage = currentCost / project.limit;
        const percentage = usage * 100;
        return (
          <div className="flex items-center gap-3 justify-center">
            <CircularProgress
              id={project.id}
              value={percentage}
              threshold={100}
              size={48}
              strokeWidth={6}
              showLabel={true}
              label={`${percentage.toFixed(0)}%`}
              className="transition-all"
            />
          </div>
        );
      },
    },
  ];

  const actions: TableAction<ProjectCostData>[] = [
    // View Details
    {
      label: 'View',
      icon: Eye,
      onClick: (project) => {
        handleOpenDetailWizard(project);
      },
      tooltip: 'View cost details',
    },
    // Edit Settings
    {
      label: 'Edit',
      icon: Edit2,
      onClick: (project) => {
        toast.info(`Editing cost settings for: ${project.project}`);
      },
      tooltip: 'Edit cost settings',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2>Cost Management</h2>
        <Button variant="ghost" size="icon" onClick={handleCheckCosts}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Project Cost Details Table - Standalone */}
      <DataTable
        columns={columns}
        actions={actions}
        data={projectCosts}
        getRowId={(project) => project.id}
        className="mb-6"
      />

      {/* Budget Consumption Rate Chart - Full Width */}
      <Card className="bg-card border-border p-6 mb-6">
        <h3 className="text-lg mb-4">Budget Consumption Rate</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={getTimeSeriesData()}>
            <defs>
              {/* Neon glow filters for each project line */}
              <filter id="line-glow-prod" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="line-glow-dev" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="line-glow-staging" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="line-glow-ml" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="#71717A"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#A1A1AA' }}
            />
            <YAxis 
              stroke="#71717A"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#A1A1AA' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#18181B', 
                border: '1px solid #A78BFA',
                borderRadius: '8px',
                boxShadow: neonIntensity > 0 ? `0 0 ${20 * neonIntensity}px rgba(167, 139, 250, ${0.5 * neonIntensity})` : 'none'
              }}
              labelStyle={{ color: '#A78BFA', marginBottom: '8px' }}
              itemStyle={{ color: '#E5E7EB' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
              cursor={{ stroke: '#A78BFA', strokeWidth: 1, strokeDasharray: '5 5' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            {/* Line for each project - continuous lines without dots */}
            <Line 
              type="monotone" 
              dataKey="production" 
              stroke="#A78BFA" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#A78BFA' }}
              name="Production"
              connectNulls
            />
            <Line 
              type="monotone" 
              dataKey="dev" 
              stroke="#60A5FA" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#60A5FA' }}
              name="Dev"
              connectNulls
            />
            <Line 
              type="monotone" 
              dataKey="staging" 
              stroke="#34D399" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#34D399' }}
              name="Staging"
              connectNulls
            />
            <Line 
              type="monotone" 
              dataKey="ml" 
              stroke="#FBBF24" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#FBBF24' }}
              name="ML"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Global Cost Limit Management */}
      <Card className="bg-card border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg">Global Cost Limit Management</h3>
          <Badge variant="outline" className={`text-xs ${globalUsage >= 0.85 ? 'border-red-500/50 text-red-500' : globalUsage >= 0.7 ? 'border-yellow-500/50 text-yellow-500' : 'border-green-500/50 text-green-500'}`}>
            <StatusNeonDot 
              status={globalUsage >= 0.85 ? 'error' : globalUsage >= 0.7 ? 'warning' : 'success'} 
              size="sm" 
              className="mr-1" 
            />
            {globalUsage >= 0.85 ? 'Critical' : globalUsage >= 0.7 ? 'Warning' : 'Healthy'}
          </Badge>
        </div>
        
        <div className="space-y-6">
          {/* Budget Bar - Interactive Stacked Visualization */}
          <div>
            <div className="text-sm text-muted-foreground mb-3">Budget Distribution (Click segments for details)</div>
            <BudgetBar 
              segments={budgetSegments}
              totalBudget={globalLimitNum}
              height="h-20"
              showLabels={true}
              showLegend={false}
            />
          </div>

          {/* Summary Stats Below Bar */}
          <div className="grid grid-cols-5 gap-4 pt-4 border-t border-border">
            {/* Global Limit */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-primary" />
              </div>
              <div className="text-muted-foreground text-sm mb-1">Global Limit</div>
              <div className="text-3xl mb-1">${globalLimit}</div>
              <div className="text-xs text-muted-foreground">Maximum allowed</div>
            </div>

            {/* Total Cost */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div className="text-muted-foreground text-sm mb-1">Total Current Cost</div>
              <div className="text-3xl mb-1">${totalCost.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Across {projectCosts.length} projects</div>
            </div>

            {/* Hourly Rate */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="text-muted-foreground text-sm mb-1">Hourly Rate</div>
              <div className="text-3xl mb-1">${totalHourlyRate.toFixed(2)}/hr</div>
              <div className="text-xs text-muted-foreground">~${(totalHourlyRate * 24 * 30).toFixed(0)}/month</div>
            </div>

            {/* Budget Remaining */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="text-muted-foreground text-sm mb-1">Budget Remaining</div>
              <div className="text-3xl mb-1" style={{ color: getResourceColor(globalUsage * 100) }}>
                ${(globalLimitNum - totalCost).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">{(globalUsage * 100).toFixed(1)}% used</div>
            </div>

            {/* Time Until Limit */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div className="text-muted-foreground text-sm mb-1">Time Until Limit</div>
              <div className="text-3xl mb-1">
                {totalHourlyRate > 0 && (globalLimitNum - totalCost) > 0
                  ? `${Math.floor((globalLimitNum - totalCost) / totalHourlyRate)}h`
                  : totalHourlyRate > 0 
                  ? 'Exceeded'
                  : '∞'
                }
              </div>
              <div className="text-xs text-muted-foreground">At current rate</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={() => setGlobalLimitDialogOpen(true)} variant="outline" className="flex-1">
              {hasGlobalLimit ? 'Update Limit' : 'Set Global Limit'}
            </Button>
            {hasGlobalLimit && (
              <Button onClick={handleRemoveGlobalLimit} variant="destructive" className="flex-1 bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/50">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Set Cost Limit Dialog */}
      <CreationWizard
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        title="Set Project Cost Limit"
        description="Configure cost limits and actions for a specific project"
        icon={DollarIcon}
        onNext={handleSetLimit}
        onCancel={() => setLimitDialogOpen(false)}
        nextLabel="Set Limit"
        nextDisabled={!selectedProject || !limitAmount}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prod">production-web-app</SelectItem>
                <SelectItem value="dev">dev-environment</SelectItem>
                <SelectItem value="staging">staging-cluster</SelectItem>
                <SelectItem value="ml">ml-pipeline</SelectItem>
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
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label>Action on Limit Reached</Label>
            <Select value={limitAction} onValueChange={setLimitAction}>
              <SelectTrigger>
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
              step="0.01"
              min="0"
              max="1"
            />
            <p className="text-sm text-muted-foreground">Default: 0.75 (75% of limit)</p>
          </div>
        </div>
      </CreationWizard>

      {/* Global Limit Dialog */}
      <CreationWizard
        open={globalLimitDialogOpen}
        onOpenChange={setGlobalLimitDialogOpen}
        title={`${hasGlobalLimit ? 'Update' : 'Set'} Global Cost Limit`}
        description="Set a maximum spending limit across all projects"
        icon={DollarIcon}
        onNext={handleSetGlobalLimit}
        onCancel={() => setGlobalLimitDialogOpen(false)}
        nextLabel={`${hasGlobalLimit ? 'Update' : 'Set'} Global Limit`}
        nextDisabled={!globalLimit}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Global Cost Limit ($)</Label>
            <Input
              type="number"
              value={globalLimit}
              onChange={(e) => setGlobalLimit(e.target.value)}
              placeholder="500.00"
              step="0.01"
            />
          </div>

          <Card className="bg-primary/10 border-primary/30 p-4">
            <div className="text-sm">
              <div className="text-muted-foreground mb-2">Current total estimated cost:</div>
              <div className="text-2xl text-primary">${getTotalCurrentCost().toFixed(2)}</div>
            </div>
          </Card>
        </div>
      </CreationWizard>

      {/* Project Detail Wizard */}
      {detailProject && (
        <CreationWizard
          open={detailWizardOpen}
          onOpenChange={setDetailWizardOpen}
          title={`${detailProject.project}`}
          description="View project cost details and update settings"
          icon={DollarIcon}
          onNext={handleSaveDetails}
          onCancel={() => {
            setDetailWizardOpen(false);
            setDetailProject(null);
          }}
          nextLabel="Save Changes"
          nextDisabled={!editLimitAmount}
          size="lg"
          noContentWrapper={true}
        >
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview & Usage</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Cost Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-card border-border p-4">
                  <div className="text-xs text-muted-foreground mb-1">Current Estimate</div>
                  <div className="text-xl" style={{ color: getResourceColor((calculateCurrentCost(detailProject) / detailProject.limit) * 100) }}>
                    ${calculateCurrentCost(detailProject).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground/70 mt-1">Real-time</div>
                </Card>
                <Card className="bg-card border-border p-4">
                  <div className="text-xs text-muted-foreground mb-1">Cost Limit</div>
                  <div className="text-xl">${detailProject.limit.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground/70 mt-1">{((calculateCurrentCost(detailProject) / detailProject.limit) * 100).toFixed(1)}% used</div>
                </Card>
                <Card className="bg-card border-border p-4">
                  <div className="text-xs text-muted-foreground mb-1">Hourly Rate</div>
                  <div className="text-xl">${detailProject.hourlyRate.toFixed(3)}/hr</div>
                  <div className="text-xs text-muted-foreground/70 mt-1">${(detailProject.hourlyRate * 24 * 30).toFixed(0)}/mo</div>
                </Card>
                <Card className="bg-card border-border p-4">
                  <div className="text-xs text-muted-foreground mb-1">Active Instances</div>
                  <div className="text-xl">{detailProject.instances}</div>
                  <div className="text-xs text-muted-foreground/70 mt-1">Running</div>
                </Card>
              </div>

              {/* Usage Progress Bar */}
              <Card className="bg-card border-border p-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-secondary">Budget Usage</span>
                      <span style={{ color: getResourceColor((calculateCurrentCost(detailProject) / detailProject.limit) * 100) }}>
                        ${calculateCurrentCost(detailProject).toFixed(2)} / ${detailProject.limit.toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((calculateCurrentCost(detailProject) / detailProject.limit) * 100, 100)} 
                      className="h-3" 
                      indicatorClassName={getProgressColor(calculateCurrentCost(detailProject) / detailProject.limit)} 
                    />
                    <div className="flex justify-between text-xs text-text-muted mt-1">
                      <span>$0</span>
                      <span>{((calculateCurrentCost(detailProject) / detailProject.limit) * 100).toFixed(1)}%</span>
                      <span>${detailProject.limit.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Cost Breakdown and Time to Limit */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card border-border p-4">
                  <h4 className="text-sm mb-3 text-primary">Cost Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Base Cost (Synced)</span>
                      <span>${detailProject.actualCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Accrued Since Sync</span>
                      <span>+${(calculateCurrentCost(detailProject) - detailProject.actualCost).toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-border my-2"></div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Remaining Budget</span>
                      <span style={{ color: getResourceColor((calculateCurrentCost(detailProject) / detailProject.limit) * 100) }}>
                        ${Math.max(0, detailProject.limit - calculateCurrentCost(detailProject)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-card border-border p-4">
                  <h4 className="text-sm mb-3 text-primary">Time Until Limit</h4>
                  <div className="text-center">
                    <div className="text-3xl mb-1">
                      {detailProject.hourlyRate > 0 && (detailProject.limit - calculateCurrentCost(detailProject)) > 0
                        ? `${Math.floor((detailProject.limit - calculateCurrentCost(detailProject)) / detailProject.hourlyRate)}h ${Math.floor((((detailProject.limit - calculateCurrentCost(detailProject)) / detailProject.hourlyRate) % 1) * 60)}m`
                        : detailProject.hourlyRate > 0 
                        ? 'Limit Exceeded'
                        : '∞'
                      }
                    </div>
                    <div className="text-xs text-muted-foreground/70">At current rate</div>
                  </div>
                </Card>
              </div>

              {/* Cost Projections */}
              <Card className="bg-card border-border p-4">
                <h4 className="text-sm mb-3 text-primary">Cost Projections</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-accent/30 rounded">
                    <div className="text-xs text-muted-foreground mb-1">Next Hour</div>
                    <div className="text-sm">${(calculateCurrentCost(detailProject) + detailProject.hourlyRate).toFixed(2)}</div>
                  </div>
                  <div className="text-center p-3 bg-accent/30 rounded">
                    <div className="text-xs text-muted-foreground mb-1">Next 24 Hours</div>
                    <div className="text-sm">${(calculateCurrentCost(detailProject) + (detailProject.hourlyRate * 24)).toFixed(2)}</div>
                  </div>
                  <div className="text-center p-3 bg-accent/30 rounded">
                    <div className="text-xs text-muted-foreground mb-1">End of Week</div>
                    <div className="text-sm">${(calculateCurrentCost(detailProject) + (detailProject.hourlyRate * 24 * 7)).toFixed(2)}</div>
                  </div>
                  <div className="text-center p-3 bg-accent/30 rounded">
                    <div className="text-xs text-muted-foreground mb-1">Full Month Est.</div>
                    <div className="text-sm">${(detailProject.hourlyRate * 24 * 30).toFixed(2)}</div>
                  </div>
                </div>
              </Card>

              {/* Last Sync Info */}
              <Card className="bg-blue-500/10 border-blue-500/30 p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <div className="text-sm text-blue-400">
                    Last synced with cloud provider: <span className="font-semibold">{getTimeSinceCheck(detailProject.lastChecked)}</span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              {/* Settings Section */}
              <div>
                <h4 className="text-sm mb-3 text-primary">Cost Limit Settings</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cost Limit ($)</Label>
                    <Input
                      type="number"
                      value={editLimitAmount}
                      onChange={(e) => setEditLimitAmount(e.target.value)}
                      placeholder="100.00"
                      step="0.01"
                    />
                    <p className="text-xs text-text-tertiary">
                      Current usage: {((calculateCurrentCost(detailProject) / parseFloat(editLimitAmount || '1')) * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Action on Limit Reached</Label>
                    <Select value={editLimitAction} onValueChange={setEditLimitAction}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warn_only">Warn Only</SelectItem>
                        <SelectItem value="stop">Stop Resources</SelectItem>
                        <SelectItem value="teardown">Teardown Project</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-text-tertiary">
                      {editLimitAction === 'warn_only' && 'Send notification when limit is reached'}
                      {editLimitAction === 'stop' && 'Automatically stop all instances when limit is reached'}
                      {editLimitAction === 'teardown' && 'Automatically terminate entire project when limit is reached'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Warning Threshold (0.0 - 1.0)</Label>
                    <Input
                      type="number"
                      value={editWarningThreshold}
                      onChange={(e) => setEditWarningThreshold(e.target.value)}
                      placeholder="0.75"
                      step="0.01"
                      min="0"
                      max="1"
                    />
                    <p className="text-xs text-text-tertiary">
                      Send warning at {(parseFloat(editWarningThreshold || '0.75') * 100).toFixed(0)}% of limit (${(parseFloat(editLimitAmount || '0') * parseFloat(editWarningThreshold || '0.75')).toFixed(2)})
                    </p>
                  </div>
                </div>
              </div>

              <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-400">
                    <div className="font-semibold mb-1">Important</div>
                    <div>
                      Automated actions like "Stop Resources" and "Teardown Project" will execute immediately when the limit is reached. 
                      Make sure your limit is set appropriately to avoid unexpected interruptions.
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </CreationWizard>
      )}
    </div>
  );
}