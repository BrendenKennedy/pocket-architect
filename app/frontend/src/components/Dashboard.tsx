import { RefreshCw, Server, Box, Key, Activity, Play, AlertCircle, CheckCircle2, XCircle, Clock, Terminal, Cpu, HardDrive, Network, Wifi, WifiOff, Zap, Database, Globe, AlertTriangle, Info, DollarSign, Eye, Settings } from 'lucide-react';
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
import { type FlatQuotaCategory } from '../lib/quotas';
import { Checkbox } from './ui/checkbox';
import { bridgeApi } from '../bridge/api';
import { getResourceColor, getQuotaStatus, getProjectColor } from '../lib/colors';
import { resolveColor } from '../services/themeService';
import { loadConfig, configSetters } from '../services';







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
  // Dashboard state - populated with live data from backend
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);
  const [healthChecks, setHealthChecks] = useState([]);
  const [networkStatus, setNetworkStatus] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live data from backend cache
  const [dashboardData, setDashboardData] = useState({
    instances: { instances: [], total_count: 0, running_count: 0, stopped_count: 0, healthy_count: 0, unhealthy_count: 0 },
    quotas: { quotas: [], categories_count: 0, total_quotas: 0 },
    costs: { cost_summary: {}, project_costs: { projects: {} }, total_monthly_cost: 0 },
    health: { instances: [], instance_health: {}, summary: { healthy_count: 0, warning_count: 0, error_count: 0, total_instances: 0 }, alarms: { summary: { OK: 0, ALARM: 0, INSUFFICIENT_DATA: 0 }, alarms: [] } },
    ssh_sessions: { active_sessions: 0, total_sessions_24h: 0, sessions: [], recent_sessions: [] }
  });

  // Project budgets derived from live cost data
  const projectBudgets = useMemo(() => {
    const costData = dashboardData.costs;
    if (!costData?.project_costs?.projects) return [];

    const projectCosts = costData.project_costs.projects;

    return Object.entries(projectCosts).map(([projectName, projectData]: [string, any], index) => ({
      id: index + 1,
      project: projectName,
      currentCost: projectData.monthly_cost || 0,
      limit: (projectData.monthly_cost || 0) * 1.2, // Estimate limit as 20% above current
      instances: 0, // We don't have this data yet
      hourlyRate: 0, // We don't have this data yet
      action: 'warn_only'
    }));
  }, [dashboardData.costs]);

  const [detailWizardOpen, setDetailWizardOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<ProjectBudget | null>(null);
  const [editLimitAmount, setEditLimitAmount] = useState('');
  const [editLimitAction, setEditLimitAction] = useState('warn_only');
  const [editWarningThreshold, setEditWarningThreshold] = useState('0.75');

  // Quota selector state
  const [quotaSelectorOpen, setQuotaSelectorOpen] = useState(false);
  const [selectedQuotaCategories, setSelectedQuotaCategories] = useState<Record<string, string[]>>({});
  const [initialQuotaSelections, setInitialQuotaSelections] = useState<Record<string, string[]>>({});

  // Quota data state
  const [allAvailableQuotas, setAllAvailableQuotas] = useState<FlatQuotaCategory[]>([]);
  const [quotasLoading, setQuotasLoading] = useState(true);

  // Load config on mount
  useEffect(() => {
    const loadDashboardConfig = async () => {
      try {
        const config = await loadConfig();
        const quotaSelections = config.dashboard.quotaSelections || {};
        setInitialQuotaSelections(quotaSelections);
        setSelectedQuotaCategories(quotaSelections);
      } catch (error) {
        console.error('Failed to load dashboard config:', error);
        setInitialQuotaSelections({});
        setSelectedQuotaCategories({});
      }
    };
    loadDashboardConfig();
  }, []);

  // Start dashboard service and load initial data
  useEffect(() => {
    console.log('Dashboard: Initializing...');
    const initializeDashboard = async () => {
      try {
        console.log('Dashboard: Starting service...');
        // Start the dashboard refresh service
        await bridgeApi.startDashboardService();
        console.log('Dashboard: Service started');

        // Load initial data for all types
        await loadAllDashboardData();
        console.log('Dashboard: Data loaded');

        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        setLoading(false);
      }
    };

    initializeDashboard();

    // Cleanup: stop dashboard service on unmount
    return () => {
      bridgeApi.stopDashboardService().catch(console.error);
    };
  }, []);

  // Load all dashboard data types
  const loadAllDashboardData = async () => {
    console.log('Dashboard: Loading all data...');
    const dataTypes = ['instances', 'quotas', 'costs', 'health', 'ssh_sessions'];

    for (const dataType of dataTypes) {
      try {
        console.log(`Dashboard: Loading ${dataType}...`);
        const result = await bridgeApi.getDashboardData(dataType);
        console.log(`Dashboard: ${dataType} result:`, result);
        if (result && typeof result === 'object' && result.success && result.data && typeof result.data === 'object') {
          setDashboardData(prev => ({
            ...prev,
            [dataType]: result.data
          }));
        } else {
          console.log(`Dashboard: No valid data available for ${dataType}, keeping defaults. Result:`, result);
        }
      } catch (error) {
        console.error(`Failed to load ${dataType} data:`, error);
      }
    }
    console.log('Dashboard: All data loaded');
  };

  // Quotas are now loaded as part of dashboard data

  // Initialize with all quotas selected if no saved selections exist
  useEffect(() => {
    const quotaData = dashboardData.quotas;
    if (quotaData?.quotas && quotaData.quotas.length > 0 && Object.keys(selectedQuotaCategories).length === 0) {
      const initialSelections: Record<string, string[]> = {};
      quotaData.quotas.forEach(category => {
        initialSelections[category.category] = category.quotas.map(q => q.name);
      });
      setSelectedQuotaCategories(initialSelections);
    }
  }, [dashboardData.quotas, selectedQuotaCategories]);

  // Filter quotas based on selection
  const filteredQuotas = useMemo(() => {
    const quotaData = dashboardData.quotas;
    const quotasArray = Array.isArray(quotaData?.quotas) ? quotaData.quotas : [];
    if (quotasArray.length === 0) return [];

    return quotasArray.map(category => ({
      ...category,
      quotas: (Array.isArray(category.quotas) ? category.quotas : []).filter(quota =>
        (selectedQuotaCategories[category.category] || []).includes(quota.name)
      )
    })).filter(category => category.quotas && category.quotas.length > 0);
  }, [dashboardData.quotas, selectedQuotaCategories]);

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
    const quotaData = dashboardData.quotas;
    const category = quotaData?.quotas?.find(c => c.category === categoryName);
    if (!category || !Array.isArray(category.quotas)) return;

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

  // Calculate total costs from live data
  const costData = dashboardData.costs;
  const projectCosts = costData?.project_costs?.projects || {};
  const totalMonthlyCost = costData?.total_monthly_cost || 0;

  // Create budget segments from live cost data
  const budgetSegments = [
    ...Object.entries(projectCosts).map(([projectName, projectData]: [string, any], index) => ({
      id: projectName,
      name: projectName,
      value: projectData?.monthly_cost || 0,
      color: resolveColor(getProjectColor(index)),
      onClick: () => {
        // Create a mock budget object for the wizard
        const mockBudget = {
          id: index + 1,
          project: projectName,
          currentCost: projectData?.monthly_cost || 0,
          limit: (projectData?.monthly_cost || 0) * 1.2, // Estimate limit as 20% above current
          instances: 0, // We don't have this data yet
          hourlyRate: 0, // We don't have this data yet
          action: 'warn_only'
        };
        handleOpenDetailWizard(mockBudget);
      },
    })),
    {
      id: 'remaining',
      name: 'Other Costs',
      value: Math.max(0, totalMonthlyCost - Object.values(projectCosts).reduce((sum: number, p: any) => sum + (p?.monthly_cost || 0), 0)),
      color: '#3F3F46',
      isRemaining: true,
    },
  ];

  // Calculate dashboard metrics from live instance data
  const instanceData = dashboardData.instances;
  const runningInstances = instanceData?.running_count || 0;
  const stoppedInstances = instanceData?.stopped_count || 0;
  const totalInstances = instanceData?.total_count || 0;
  const healthyInstances = instanceData?.healthy_count || 0;
  const degradedInstances = instanceData?.unhealthy_count || 0;
  const launchingInstances = degradedInstances;

  // Calculate overall quota status from all categories
  const allQuotas = filteredQuotas.flatMap(category => Array.isArray(category.quotas) ? category.quotas : []);
  const quotaWarnings = quotasLoading ? 0 : allQuotas.filter(q => q && (q.used / q.limit) >= 0.7 && (q.used / q.limit) < 0.9).length;
  const quotaCritical = quotasLoading ? 0 : allQuotas.filter(q => q && (q.used / q.limit) >= 0.9).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
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
              disabled={!dashboardData.quotas?.quotas}
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
                if (quota.usedBy && Array.isArray(quota.usedBy)) {
                  for (const usage of quota.usedBy) {
                    if (usage && typeof usage.count === 'number') {
                      for (let i = 0; i < usage.count; i++) {
                        pegs.push({ color: usage.color || '#3F3F46', filled: true, project: usage.project });
                      }
                    }
                  }
                }

                // Then add empty pegs for available resources
                const available = Math.max(0, (quota.limit || 0) - (quota.used || 0));
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
            <div className="text-4xl mb-2">{dashboardData.ssh_sessions?.active_sessions || 0}</div>
            <div className="text-xs text-muted-foreground">
              {dashboardData.ssh_sessions?.active_sessions ? 'Active sessions' : 'No active sessions'}
            </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <StatusBadge status="success" label="OK" size="sm" />
          </div>
            <div className="text-muted-foreground mb-1">Health Checks</div>
            <div className="text-4xl mb-2">
              {loading ? '...' : `${dashboardData.health?.summary?.healthy_count || 0}/${dashboardData.health?.summary?.total_instances || 0}`}
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : (() => {
                const health = dashboardData.health?.summary;
                const alarms = dashboardData.health?.alarms?.summary;
                const issues = (health?.warning_count || 0) + (health?.error_count || 0) + (alarms?.ALARM || 0);
                return issues > 0 ? `${issues} issues detected` : 'All systems healthy';
              })()}
            </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <StatusBadge status="connected" label="Connected" size="sm" />
          </div>
           <div className="text-muted-foreground mb-1">Regions Online</div>
           <div className="text-4xl mb-2">1/1</div>
           <div className="text-xs text-muted-foreground">Current region operational</div>
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
            {/* Network Status */}
            {networkStatus.length === 0 && healthChecks.length === 0 && (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">No health checks available</p>
                <p className="text-xs text-muted-foreground mt-1">Deploy instances to monitor health</p>
              </div>
            )}

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
            {(() => {
              const alarms = dashboardData.health?.alarms;
              const hasAlarms = alarms && (alarms.summary.ALARM > 0 || alarms.summary.INSUFFICIENT_DATA > 0);

              if (!hasAlarms) {
                return (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">All systems healthy</p>
                    <p className="text-xs text-muted-foreground mt-1">No alarms or issues detected</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {/* Alarm Summary */}
                  <div className="p-3 bg-background/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">CloudWatch Alarms</span>
                      <div className="flex gap-2">
                        {alarms.summary.ALARM > 0 && (
                          <Badge variant="outline" className="text-xs border-error/50 text-error">
                            {alarms.summary.ALARM} in alarm
                          </Badge>
                        )}
                        {alarms.summary.INSUFFICIENT_DATA > 0 && (
                          <Badge variant="outline" className="text-xs border-warning/50 text-warning">
                            {alarms.summary.INSUFFICIENT_DATA} insufficient data
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {alarms.summary.OK} alarms OK
                    </div>
                  </div>

                   {/* Individual Alarms */}
                   {(alarms.alarms || []).slice(0, 3).map((alarm, index) => (
                    <div key={index} className="p-3 bg-background/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium truncate">{alarm.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            alarm.state === 'ALARM'
                              ? 'border-error/50 text-error'
                              : alarm.state === 'INSUFFICIENT_DATA'
                              ? 'border-warning/50 text-warning'
                              : 'border-success/50 text-success'
                          }`}
                        >
                          {alarm.state}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {alarm.metric} • {alarm.namespace}
                      </div>
                      {alarm.description && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {alarm.description}
                        </div>
                      )}
                    </div>
                  ))}

                  {(alarms.alarms || []).length > 3 && (
                    <div className="text-center text-xs text-muted-foreground">
                      +{(alarms.alarms || []).length - 3} more alarms
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Active SSH Connections */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-text-primary">Active SSH Sessions</h3>
            <Badge variant="secondary" className="text-xs">{activeConnections.length}</Badge>
          </div>
          <div className="space-y-3">
            {activeConnections.length === 0 ? (
              <div className="text-center py-8">
                <Terminal className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">No active SSH sessions</p>
                <p className="text-xs text-muted-foreground mt-1">SSH connections will appear here</p>
              </div>
            ) : (
              activeConnections.map((conn, index) => (
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
              ))
            )}
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
          {recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground mt-1">Activity will be tracked here</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => (
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
                      <span>•</span>
                      <span>{activity.region}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </Card>

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
              <span className="font-medium ml-1">{dashboardData.quotas?.total_quotas || 0}</span>
              <span className="text-muted-foreground ml-1">quotas selected</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const quotaData = dashboardData.quotas;
                const totalSelected = Object.values(selectedQuotaCategories).flat().length;
                const totalAvailable = quotaData?.total_quotas || 0;
                const allSelected = totalSelected === totalAvailable;

                if (allSelected) {
                  // Deselect all
                  setSelectedQuotaCategories({});
                } else {
                  // Select all
                  const allSelections: Record<string, string[]> = {};
                  quotaData?.quotas?.forEach(category => {
                    allSelections[category.category] = category.quotas.map(q => q.name);
                  });
                  setSelectedQuotaCategories(allSelections);
                }
              }}
            >
              {(() => {
                const quotaData = dashboardData.quotas;
                const totalSelected = Object.values(selectedQuotaCategories).flat().length;
                const totalAvailable = (quotaData?.quotas || []).flatMap(c => c?.quotas || []).length;
                return totalSelected === totalAvailable ? 'Deselect All' : 'Select All';
              })()}
            </Button>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {(Array.isArray(dashboardData.quotas?.quotas) ? dashboardData.quotas.quotas : []).map((category) => {
              const categoryQuotas = selectedQuotaCategories[category.category] || [];
              const categoryQuotasList = category.quotas || [];
              const allCategorySelected = categoryQuotas.length === categoryQuotasList.length;
              const someCategorySelected = categoryQuotas.length > 0 && !allCategorySelected;

              return (
                <Card key={category.category} className="bg-muted border-border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Checkbox
                      checked={allCategorySelected}
                      onCheckedChange={() => handleToggleCategory(category.category)}
                      disabled={!categoryQuotasList.length}
                      className={someCategorySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{category.category}</h4>
                      <p className="text-xs text-muted-foreground">
                        {categoryQuotas.length} of {categoryQuotasList.length} selected
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 ml-7">
                    {categoryQuotasList.map((quota) => {
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
    </div>
  );
}
