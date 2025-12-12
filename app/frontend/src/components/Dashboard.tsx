import { RefreshCw, Server, Box, Key, Activity, FolderOpen, Play, AlertCircle, CheckCircle2, XCircle, Clock, Terminal, Cpu, HardDrive, Network, Wifi, WifiOff, Zap, Database, Globe, AlertTriangle, Info, DollarSign, Eye, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { LayoutDashboard } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useState, useMemo, useEffect } from 'react';
import { CreationWizard } from './ui/creation-wizard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { BudgetBar } from './BudgetBar';
import { CircularProgress } from './ui/circular-progress';
import { NeonDot, StatusNeonDot } from './ui/neon-dot';
import { StatusBadge } from './ui/status-badge';
import { type QuotaCategory } from '../lib/quotas';
import { Checkbox } from './ui/checkbox';
import { bridgeApi } from '../bridge/api';
import { getResourceColor, getQuotaStatus, getProjectColor } from '../lib/colors';
import { resolveColor } from '../services/themeService';







// Project budgets interface
interface ProjectBudget {
  id: number;
  project: string;
  currentCost: number;
  limit: number;
  instances: number;
  hourlyRate: number;
  action: string;
}

const getProgressColor = (usage: number) => {
  if (usage >= 1.0) return 'bg-red-500';
  if (usage >= 0.75) return 'bg-yellow-500';
  return 'bg-green-500';
};

interface DashboardProps {
  selectedPlatform?: 'aws' | 'gcp' | 'azure';
}

export function Dashboard({ selectedPlatform = 'aws' }: DashboardProps) {
  // Dashboard state - will be populated with real data from APIs
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);
  const [healthChecks, setHealthChecks] = useState([]);
  const [networkStatus, setNetworkStatus] = useState([]);
  const [projectBudgets, setProjectBudgets] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

  const [detailWizardOpen, setDetailWizardOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<ProjectBudget | null>(null);
  const [editLimitAmount, setEditLimitAmount] = useState('');
  const [editLimitAction, setEditLimitAction] = useState('warn_only');
  const [editWarningThreshold, setEditWarningThreshold] = useState('0.75');

  // Quota selector state
  const [quotaSelectorOpen, setQuotaSelectorOpen] = useState(false);
  const [selectedQuotaCategories, setSelectedQuotaCategories] = useState<Record<string, string[]>>({});
  
  // Quota data state
  const [allAvailableQuotas, setAllAvailableQuotas] = useState<QuotaCategory[]>([]);
  const [quotasLoading, setQuotasLoading] = useState(true);
  
  // Initialize with all quotas selected on first render (using useEffect to avoid setState during render)
  useEffect(() => {
    // Try to load from localStorage first
    const savedSelections = localStorage.getItem('pocketarchitect_quota_selections');
    if (savedSelections) {
      try {
        setSelectedQuotaCategories(JSON.parse(savedSelections));
        return;
      } catch (e) {
        console.error('Failed to parse saved quota selections:', e);
      }
    }

    // If no saved selections or parse failed, initialize with all quotas selected
    if (allAvailableQuotas.length > 0 && !quotasLoading) {
      const initialSelections: Record<string, string[]> = {};
      allAvailableQuotas.forEach(category => {
        initialSelections[category.category] = category.quotas.map(q => q.name);
      });
      setSelectedQuotaCategories(initialSelections);
    }
  }, [allAvailableQuotas, quotasLoading]); // Run when quotas are loaded
  
  // Update localStorage when selections change
  useEffect(() => {
    if (Object.keys(selectedQuotaCategories).length > 0) {
      localStorage.setItem('pocketarchitect_quota_selections', JSON.stringify(selectedQuotaCategories));
    }
  }, [selectedQuotaCategories]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch real quota data
        const quotaData = await bridgeApi.getQuotas();
        setAllAvailableQuotas(quotaData.categories || []);

        // Fetch real instance data to calculate dashboard metrics
        const instanceData = await bridgeApi.listInstances();
        setInstances(instanceData);

        // TODO: Add API calls for other dashboard data when backend supports it
        // For now, show empty states to indicate real data will be displayed

        // Set empty arrays for now - these would be populated with real data
        setRecentActivity([]);
        setActiveConnections([]);
        setHealthChecks([]);
        setNetworkStatus([]);
        setProjectBudgets([]);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Set empty quotas on error
        setAllAvailableQuotas([]);
      } finally {
        setLoading(false);
        setQuotasLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Filter quotas based on selection
  const filteredQuotas = useMemo(() => {
    return allAvailableQuotas.map(category => ({
      ...category,
      quotas: category.quotas.filter(quota => 
        selectedQuotaCategories[category.category]?.includes(quota.name)
      )
    })).filter(category => category.quotas.length > 0);
  }, [allAvailableQuotas, selectedQuotaCategories]);

  const handleToggleQuota = (categoryName: string, quotaName: string) => {
    setSelectedQuotaCategories(prev => {
      const categoryQuotas = prev[categoryName] || [];
      const isSelected = categoryQuotas.includes(quotaName);
      
      return {
        ...prev,
        [categoryName]: isSelected
          ? categoryQuotas.filter(q => q !== quotaName)
          : [...categoryQuotas, quotaName]
      };
    });
  };

  const handleToggleCategory = (categoryName: string) => {
    const category = allAvailableQuotas.find(c => c.category === categoryName);
    if (!category) return;
    
    const categoryQuotas = selectedQuotaCategories[categoryName] || [];
    const allSelected = categoryQuotas.length === category.quotas.length;
    
    setSelectedQuotaCategories(prev => ({
      ...prev,
      [categoryName]: allSelected ? [] : category.quotas.map(q => q.name)
    }));
  };

  const handleSaveQuotaSelection = () => {
    const totalSelected = Object.values(selectedQuotaCategories).flat().length;
    toast.success(`Quota tracking updated! Now tracking ${totalSelected} quotas.`);
    setQuotaSelectorOpen(false);
  };

  const handleOpenDetailWizard = (budget: ProjectBudget) => {
    setDetailProject(budget);
    setEditLimitAmount(budget.limit.toString());
    setEditLimitAction(budget.action);
    setEditWarningThreshold('0.75');
    setDetailWizardOpen(true);
  };

  const handleSaveDetails = () => {
    if (!detailProject) return;
    toast.success('Project settings updated successfully!');
    setDetailWizardOpen(false);
    setDetailProject(null);
  };

  // Calculate total costs and prepare budget bar data
  const totalBudget = projectBudgets.reduce((sum, p) => sum + p.limit, 0);
  const totalCost = projectBudgets.reduce((sum, p) => sum + p.currentCost, 0);
  const remaining = totalBudget - totalCost;

  const budgetSegments = [
    ...projectBudgets.map((budget, index) => ({
      id: budget.id,
      name: budget.project,
      value: budget.currentCost,
      color: resolveColor(getProjectColor(index)),
      onClick: () => handleOpenDetailWizard(budget),
    })),
    {
      id: 'remaining',
      name: 'Budget Remaining',
      value: Math.max(0, remaining),
      color: '#3F3F46',
      isRemaining: true,
    },
  ];

  // Calculate dashboard metrics from real instance data
  const runningInstances = instances.filter(inst => inst.status === 'healthy').length;
  const stoppedInstances = instances.filter(inst => inst.status === 'stopped').length;
  const launchingInstances = instances.filter(inst => inst.status === 'degraded').length;
  const errorInstances = instances.filter(inst => inst.status === 'error').length;
  const totalInstances = instances.length;
  const healthyInstances = runningInstances;
  const degradedInstances = launchingInstances;

  // Calculate overall quota status from all categories
  const allQuotas = filteredQuotas.flatMap(category => category.quotas);
  const quotaWarnings = quotasLoading ? 0 : allQuotas.filter(q => (q.used / q.limit) >= 0.7 && (q.used / q.limit) < 0.9).length;
  const quotaCritical = quotasLoading ? 0 : allQuotas.filter(q => (q.used / q.limit) >= 0.9).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="size-8 text-primary" />
          <h2 className="text-primary">Dashboard</h2>
        </div>
        <Button variant="ghost" size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Service Quotas & Limits */}
      <Card className="bg-card border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg text-text-primary">
              Service Quotas & Limits 
              <span className="text-sm text-muted-foreground ml-2">
                ({selectedPlatform.toUpperCase()})
              </span>
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setQuotaSelectorOpen(true)}
              className="h-7"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Select Quotas
            </Button>
          </div>
          <Badge variant={quotasLoading ? "secondary" : quotaCritical > 0 ? "destructive" : quotaWarnings > 0 ? "outline" : "secondary"} className={`text-xs ${quotasLoading ? '' : quotaCritical > 0 ? '' : quotaWarnings > 0 ? 'border-yellow-500/50 text-yellow-500' : ''}`}>
            <StatusNeonDot
              status={quotasLoading ? 'unknown' : quotaCritical > 0 ? 'error' : quotaWarnings > 0 ? 'warning' : 'success'}
              size="sm"
              className="mr-1"
            />
            {quotasLoading ? 'Loading...' : quotaCritical > 0 ? `${quotaCritical} Critical` : quotaWarnings > 0 ? `${quotaWarnings} Warning` : 'All Normal'}
          </Badge>
        </div>
        
        {/* Peg Board Rows */}
        <div className="space-y-3">
          {quotasLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading quotas...</div>
            </div>
          ) : filteredQuotas.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No quota data available</div>
            </div>
          ) : (
            filteredQuotas.map((category) => (
            <div key={category.category} className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">{category.category}</h4>
              {category.quotas.map((quota, index) => {
                const status = getQuotaStatus(quota.used, quota.limit);
                const percentage = (quota.used / quota.limit) * 100;
                
                // Create an array of "pegs" representing each resource unit
                const pegs = [];
                
                // First, add filled pegs for each project
                for (const usage of quota.usedBy) {
                  for (let i = 0; i < usage.count; i++) {
                    pegs.push({ color: usage.color, filled: true, project: usage.project });
                  }
                }
                
                // Then add empty pegs for available resources
                const available = quota.limit - quota.used;
                for (let i = 0; i < available; i++) {
                  pegs.push({ color: '#3F3F46', filled: false, project: null });
                }
                
                return (
                  <div key={index} className="flex items-center gap-4 py-2 px-3 bg-background/50 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                    {/* Quota Name and Status Indicator */}
                    <div className="flex items-center gap-2 min-w-[200px] flex-shrink-0">
                      <StatusNeonDot 
                        status={percentage >= 90 ? 'error' : percentage >= 70 ? 'warning' : 'success'}
                        size="md"
                      />
                      <span className="text-sm font-medium">{quota.name}</span>
                    </div>
                    
                    {/* Peg Board - Single Row */}
                    <div className="flex-1 flex flex-wrap items-center gap-1.5">
                      {pegs.map((peg, i) => (
                        <NeonDot
                          key={i}
                          color={peg.color}
                          size="md"
                          filled={peg.filled}
                          tooltip={peg.filled && peg.project ? peg.project : undefined}
                          animateOnHover={peg.filled}
                        />
                      ))}
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs flex-shrink-0 min-w-[160px] justify-end">
                      <span style={{ color: status.color }}>
                        <span className="text-base">{available}</span> available
                      </span>
                      <span className="text-muted-foreground">
                        {quota.used}/{quota.limit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
          )}
        </div>
      </Card>

      {/* Live Status Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <Card className="bg-card border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <StatusBadge status="operational" label="Live" size="sm" />
          </div>
           <div className="text-muted-foreground mb-1">Running Instances</div>
           <div className="text-4xl mb-2">{loading ? '...' : runningInstances}</div>
           <div className="text-xs text-muted-foreground">{loading ? 'Loading...' : `${stoppedInstances} stopped • ${launchingInstances} launching`}</div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Terminal className="w-6 h-6 text-primary" />
            </div>
            <StatusBadge status="active" label="Active" size="sm" />
          </div>
           <div className="text-muted-foreground mb-1">SSH Sessions</div>
           <div className="text-4xl mb-2">0</div>
           <div className="text-xs text-muted-foreground">No active sessions</div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <StatusBadge status="success" label="OK" size="sm" />
          </div>
           <div className="text-muted-foreground mb-1">Health Checks</div>
           <div className="text-4xl mb-2">{loading ? '...' : `${healthyInstances}/${totalInstances}`}</div>
           <div className="text-xs text-muted-foreground">{loading ? 'Loading...' : `${degradedInstances} degraded • ${errorInstances} failing`}</div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <StatusBadge status="connected" label="Connected" size="sm" />
          </div>
          <div className="text-muted-foreground mb-1">Regions Online</div>
          <div className="text-4xl mb-2">4/4</div>
          <div className="text-xs text-muted-foreground">All operational</div>
        </Card>
      </div>

      {/* Health Status Grid */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Service Health */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-text-primary">Service Health</h3>
            <StatusBadge status="operational" label="Operational" size="sm" />
          </div>
          <div className="space-y-3">
            {/* Health Checks */}
            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">Instance Health</span>
                </div>
                <Badge variant="outline" className="text-xs border-success/50 text-success">18/19</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Last check: 30s ago • 5 projects monitored
              </div>
            </div>

            {/* Network Status */}
            {networkStatus.map((network, index) => (
              <div key={index} className="p-3 bg-background/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {network.status === 'operational' ?
                      <Wifi className="w-4 h-4 text-success" /> :
                      <WifiOff className="w-4 h-4 text-warning" />
                    }
                    <span className="text-sm font-medium">{network.region}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      network.status === 'operational'
                        ? 'border-success/50 text-success'
                        : 'border-warning/50 text-warning'
                    }`}
                  >
                    {network.latency}ms
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {network.instances} instances • {network.status}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Health Check Details */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-text-primary">Health Check Status</h3>
            <Badge variant="secondary" className="text-xs">By Project</Badge>
          </div>
          <div className="space-y-3">
            {healthChecks.map((check, index) => (
              <div key={index} className="p-3 bg-background/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate">{check.project}</span>
                  <Badge variant="outline" className="text-xs border-success/50 text-success">
                    {check.healthy}/{check.instances}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-success" />
                  <span>{check.healthy} healthy</span>
                  {check.degraded > 0 && (
                    <>
                      <span>•</span>
                      <AlertTriangle className="w-3 h-3 text-warning" />
                      <span className="text-warning">{check.degraded} degraded</span>
                    </>
                  )}
                  {check.failing > 0 && (
                    <>
                      <span>•</span>
                      <XCircle className="w-3 h-3 text-error" />
                      <span className="text-error">{check.failing} failing</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Last: {check.lastCheck}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Active SSH Connections */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-text-primary">Active SSH Sessions</h3>
            <Badge variant="secondary" className="text-xs">{activeConnections.length}</Badge>
          </div>
          <div className="space-y-3">
            {activeConnections.map((conn, index) => (
              <div key={index} className="p-3 bg-background/50 rounded-lg border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <div>
                      <code className="text-sm font-mono">{conn.instanceId}</code>
                      <div className="text-xs text-muted-foreground mt-0.5">{conn.ip}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs border-success/50 text-success">
                    <StatusNeonDot status="active" size="xs" className="mr-1" />
                    {conn.duration}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Project: {conn.project}</div>
                  <div>User: {conn.user} • {conn.region}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity - Bottom */}
      <Card className="bg-card border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-text-primary">Recent Activity</h3>
          <Badge variant="secondary" className="text-xs">Live Feed</Badge>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg hover:bg-accent/50 transition-colors border border-transparent hover:border-border">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                activity.status === 'success' ? 'bg-green-500/10' :
                activity.status === 'warning' ? 'bg-yellow-500/10' :
                activity.status === 'error' ? 'bg-red-500/10' :
                'bg-blue-500/10'
              }`}>
                {activity.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> :
                 activity.status === 'warning' ? <AlertCircle className="w-3.5 h-3.5 text-warning" /> :
                 activity.status === 'error' ? <XCircle className="w-3.5 h-3.5 text-error" /> :
                 <Info className="w-3.5 h-3.5 text-info" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{activity.message}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{activity.time}</span>
                  {activity.project && (
                    <>
                      <span>•</span>
                      <span className="truncate">{activity.project}</span>
                    </>
                  )}
                  {activity.region && (
                    <>
                      <span></span>
                      <span>{activity.region}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Project Detail Wizard */}
      {detailProject && (
        <CreationWizard
          open={detailWizardOpen}
          onOpenChange={setDetailWizardOpen}
          title={`${detailProject.project}`}
          description="View project cost details and update settings"
          icon={DollarSign}
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
                <Card className="bg-muted border-border p-4">
                  <div className="text-xs text-text-tertiary mb-1">Current Estimate</div>
                  <div className="text-xl" style={{ color: getResourceColor((detailProject.currentCost / detailProject.limit) * 100) }}>
                    ${detailProject.currentCost.toFixed(2)}
                  </div>
                  <div className="text-xs text-text-muted mt-1">Real-time</div>
                </Card>
                <Card className="bg-muted border-border p-4">
                  <div className="text-xs text-text-tertiary mb-1">Cost Limit</div>
                  <div className="text-xl">${detailProject.limit.toFixed(2)}</div>
                  <div className="text-xs text-text-muted mt-1">{((detailProject.currentCost / detailProject.limit) * 100).toFixed(1)}% used</div>
                </Card>
                <Card className="bg-muted border-border p-4">
                  <div className="text-xs text-text-tertiary mb-1">Hourly Rate</div>
                  <div className="text-xl">${detailProject.hourlyRate.toFixed(3)}/hr</div>
                  <div className="text-xs text-text-muted mt-1">${(detailProject.hourlyRate * 24 * 30).toFixed(0)}/mo</div>
                </Card>
                <Card className="bg-muted border-border p-4">
                  <div className="text-xs text-text-tertiary mb-1">Active Instances</div>
                  <div className="text-xl">{detailProject.instances}</div>
                  <div className="text-xs text-text-muted mt-1">Running</div>
                </Card>
              </div>

              {/* Usage Progress Bar */}
              <Card className="bg-muted border-border p-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-secondary">Budget Usage</span>
                      <span style={{ color: getResourceColor((detailProject.currentCost / detailProject.limit) * 100) }}>
                        ${detailProject.currentCost.toFixed(2)} / ${detailProject.limit.toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((detailProject.currentCost / detailProject.limit) * 100, 100)} 
                      className="h-3" 
                      indicatorClassName={getProgressColor(detailProject.currentCost / detailProject.limit)} 
                    />
                    <div className="flex justify-between text-xs text-text-muted mt-1">
                      <span>$0</span>
                      <span>{((detailProject.currentCost / detailProject.limit) * 100).toFixed(1)}%</span>
                      <span>${detailProject.limit.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Cost Breakdown and Time to Limit */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted border-border p-4">
                  <h4 className="text-sm mb-3 text-primary">Cost Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Current Cost</span>
                      <span>${detailProject.currentCost.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-border my-2"></div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Remaining Budget</span>
                      <span style={{ color: getResourceColor((detailProject.currentCost / detailProject.limit) * 100) }}>
                        ${Math.max(0, detailProject.limit - detailProject.currentCost).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-muted border-border p-4">
                  <h4 className="text-sm mb-3 text-primary">Time Until Limit</h4>
                  <div className="text-center">
                    <div className="text-3xl mb-1">
                      {detailProject.hourlyRate > 0 && (detailProject.limit - detailProject.currentCost) > 0
                        ? `${Math.floor((detailProject.limit - detailProject.currentCost) / detailProject.hourlyRate)}h ${Math.floor((((detailProject.limit - detailProject.currentCost) / detailProject.hourlyRate) % 1) * 60)}m`
                        : detailProject.hourlyRate > 0 
                        ? 'Limit Exceeded'
                        : '∞'
                      }
                    </div>
                    <div className="text-xs text-text-muted">At current rate</div>
                  </div>
                </Card>
              </div>

              {/* Cost Projections */}
              <Card className="bg-muted border-border p-4">
                <h4 className="text-sm mb-3 text-primary">Cost Projections</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-background rounded">
                    <div className="text-xs text-text-tertiary mb-1">Next Hour</div>
                    <div className="text-sm">${(detailProject.currentCost + detailProject.hourlyRate).toFixed(2)}</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded">
                    <div className="text-xs text-text-tertiary mb-1">Next 24 Hours</div>
                    <div className="text-sm">${(detailProject.currentCost + (detailProject.hourlyRate * 24)).toFixed(2)}</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded">
                    <div className="text-xs text-text-tertiary mb-1">End of Week</div>
                    <div className="text-sm">${(detailProject.currentCost + (detailProject.hourlyRate * 24 * 7)).toFixed(2)}</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded">
                    <div className="text-xs text-text-tertiary mb-1">Full Month Est.</div>
                    <div className="text-sm">${(detailProject.hourlyRate * 24 * 30).toFixed(2)}</div>
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
                      className="bg-muted border-border"
                    />
                    <p className="text-xs text-text-tertiary">
                      Current usage: {((detailProject.currentCost / parseFloat(editLimitAmount || '1')) * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Action on Limit Reached</Label>
                    <Select value={editLimitAction} onValueChange={setEditLimitAction}>
                      <SelectTrigger className="bg-muted border-border">
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
                      className="bg-muted border-border"
                    />
                    <p className="text-xs text-text-tertiary">
                      Send warning at {(parseFloat(editWarningThreshold || '0.75') * 100).toFixed(0)}% of limit (${(parseFloat(editLimitAmount || '0') * parseFloat(editWarningThreshold || '0.75')).toFixed(2)})
                    </p>
                  </div>
                </div>
              </div>

              <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-warning">
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

      {/* Quota Selector Wizard */}
      <CreationWizard
        open={quotaSelectorOpen}
        onOpenChange={setQuotaSelectorOpen}
        title="Select Quotas to Track"
        description="Choose which resource quotas you want to monitor on your dashboard"
        icon={Eye}
        onNext={handleSaveQuotaSelection}
        onCancel={() => setQuotaSelectorOpen(false)}
        nextLabel="Save Selection"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="text-sm">
              <span className="font-medium">{Object.values(selectedQuotaCategories).flat().length}</span>
              <span className="text-muted-foreground ml-1">of</span>
              <span className="font-medium ml-1">{allAvailableQuotas.flatMap(c => c.quotas).length}</span>
              <span className="text-muted-foreground ml-1">quotas selected</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allSelected = Object.values(selectedQuotaCategories).flat().length === allAvailableQuotas.flatMap(c => c.quotas).length;
                if (allSelected) {
                  // Deselect all
                  setSelectedQuotaCategories({});
                } else {
                  // Select all
                  const allSelections: Record<string, string[]> = {};
                  allAvailableQuotas.forEach(category => {
                    allSelections[category.category] = category.quotas.map(q => q.name);
                  });
                  setSelectedQuotaCategories(allSelections);
                }
              }}
            >
              {Object.values(selectedQuotaCategories).flat().length === allAvailableQuotas.flatMap(c => c.quotas).length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {allAvailableQuotas.map((category) => {
              const categoryQuotas = selectedQuotaCategories[category.category] || [];
              const allCategorySelected = categoryQuotas.length === category.quotas.length;
              const someCategorySelected = categoryQuotas.length > 0 && !allCategorySelected;
              
              return (
                <Card key={category.category} className="bg-muted border-border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Checkbox
                      checked={allCategorySelected}
                      onCheckedChange={() => handleToggleCategory(category.category)}
                      className={someCategorySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{category.category}</h4>
                      <p className="text-xs text-muted-foreground">
                        {categoryQuotas.length} of {category.quotas.length} selected
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 ml-7">
                    {category.quotas.map((quota) => {
                      const isSelected = categoryQuotas.includes(quota.name);
                      const percentage = (quota.used / quota.limit) * 100;
                      
                      return (
                        <div 
                          key={quota.name}
                          className="flex items-center gap-3 p-2 rounded hover:bg-background/50 transition-colors"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleQuota(category.category, quota.name)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <StatusNeonDot 
                                status={percentage >= 90 ? 'error' : percentage >= 70 ? 'warning' : 'success'}
                                size="sm"
                              />
                              <span className="text-sm">{quota.name}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {quota.used}/{quota.limit}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </CreationWizard>
    </div>
  );
}