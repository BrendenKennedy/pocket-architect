import { useState, useEffect } from 'react';
import { Play, Square, Trash2, RefreshCw, Activity, Plus, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';
import { useBridge } from '../contexts/BridgeContext';

export function Projects() {
  const { bridge, isReady } = useBridge();
  const [projects, setProjects] = useState<any[]>([]);
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [deployOpen, setDeployOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusData, setStatusData] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [teardownOpen, setTeardownOpen] = useState(false);
  const [deployStep, setDeployStep] = useState(1);
  const [deploying, setDeploying] = useState(false);
  
  // Deploy form state
  const [blueprint, setBlueprint] = useState('');
  const [projectName, setProjectName] = useState('');
  const [useSnapshot, setUseSnapshot] = useState(false);
  const [snapshot, setSnapshot] = useState('');
  const [costLimit, setCostLimit] = useState('');
  const [costAction, setCostAction] = useState('warn_only');
  const [overrideLimit, setOverrideLimit] = useState(false);

  useEffect(() => {
    if (isReady && bridge) {
      loadData();
    }
  }, [isReady, bridge]);

  const loadData = async () => {
    if (!bridge) return;
    
    try {
      setLoading(true);
      const [projectsData, blueprintsData] = await Promise.all([
        bridge.listProjects(),
        bridge.listBlueprints(),
      ]);

      if (Array.isArray(projectsData)) {
        setProjects(projectsData);
      }
      if (Array.isArray(blueprintsData)) {
        setBlueprints(blueprintsData);
      }
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = () => {
    setDeployOpen(true);
    setDeployStep(1);
  };

  const handleNextStep = async () => {
    if (deployStep < 3) {
      setDeployStep(deployStep + 1);
    } else {
      // Create project
      if (!bridge || !blueprint || !projectName) {
        toast.error('Please fill in all required fields');
        return;
      }

      try {
        setDeploying(true);
        await bridge.deployProject(
          blueprint,
          projectName,
          useSnapshot ? snapshot : null,
          costLimit ? parseFloat(costLimit) : null,
          costAction,
          overrideLimit,
          (message: string) => {
            toast.info(message);
          },
          (success: boolean, message: string) => {
            setDeploying(false);
            if (success) {
              toast.success(message);
              setDeployOpen(false);
              setDeployStep(1);
              setBlueprint('');
              setProjectName('');
              setUseSnapshot(false);
              setSnapshot('');
              setCostLimit('');
              setCostAction('warn_only');
              setOverrideLimit(false);
              loadData();
            } else {
              toast.error(message);
            }
          }
        );
      } catch (error: any) {
        setDeploying(false);
        toast.error(`Failed to create project: ${error.message}`);
      }
    }
  };

  const handlePrevStep = () => {
    if (deployStep > 1) {
      setDeployStep(deployStep - 1);
    }
  };

  const handleStart = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    if (!bridge || !isReady) {
      toast.error('Bridge not ready');
      return;
    }

    try {
      await bridge.startStopProject(
        selectedProject,
        'start',
        (message: string) => {
          toast.info(message);
        },
        (success: boolean, message: string) => {
          if (success) {
            toast.success(message);
            loadData();
          } else {
            toast.error(message);
          }
        }
      );
    } catch (error: any) {
      toast.error(`Failed to start project: ${error.message}`);
    }
  };

  const handleStop = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    if (!bridge || !isReady) {
      toast.error('Bridge not ready');
      return;
    }

    try {
      await bridge.startStopProject(
        selectedProject,
        'stop',
        (message: string) => {
          toast.info(message);
        },
        (success: boolean, message: string) => {
          if (success) {
            toast.success(message);
            loadData();
          } else {
            toast.error(message);
          }
        }
      );
    } catch (error: any) {
      toast.error(`Failed to stop project: ${error.message}`);
    }
  };

  const handleTeardownClick = (e?: React.MouseEvent) => {
    console.log('[Teardown] Button clicked');
    console.log('[Teardown] selectedProject:', selectedProject);
    console.log('[Teardown] bridge:', bridge);
    console.log('[Teardown] isReady:', isReady);
    
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!selectedProject) {
      console.log('[Teardown] No project selected');
      toast.error('Please select a project first');
      return;
    }
    
    console.log('[Teardown] Opening dialog for project:', selectedProject);
    setTeardownOpen(true);
  };

  const handleTeardownConfirm = async () => {
    console.log('[Teardown] Confirm clicked');
    console.log('[Teardown] selectedProject:', selectedProject);
    console.log('[Teardown] bridge:', bridge);
    console.log('[Teardown] isReady:', isReady);
    
    if (!selectedProject) {
      console.error('[Teardown] No project selected in confirm');
      toast.error('No project selected');
      setTeardownOpen(false);
      return;
    }
    
    if (!bridge) {
      console.error('[Teardown] Bridge is null');
      toast.error('Bridge not available');
      setTeardownOpen(false);
      return;
    }
    
    if (!isReady) {
      console.error('[Teardown] Bridge not ready');
      toast.error('Bridge not ready');
      setTeardownOpen(false);
      return;
    }

    const projectName = selectedProject; // Store before closing dialog
    console.log('[Teardown] Starting teardown for project:', projectName);
    setTeardownOpen(false);
    
    try {
      console.log('[Teardown] Calling bridge.teardownProject');
      const operationId = await bridge.teardownProject(
        projectName,
        false, // force
        (message: string) => {
          console.log('[Teardown] Progress:', message);
          toast.info(message);
        },
        (success: boolean, message: string) => {
          console.log('[Teardown] Finished - success:', success, 'message:', message);
          if (success) {
            toast.success(message);
            setSelectedProject(null);
            loadData();
          } else {
            toast.error(message);
          }
        }
      );
      console.log('[Teardown] Operation ID:', operationId);
    } catch (error: any) {
      console.error('[Teardown] Error caught:', error);
      console.error('[Teardown] Error message:', error.message);
      console.error('[Teardown] Error stack:', error.stack);
      toast.error(`Failed to teardown project: ${error.message}`);
    }
  };

  const renderDeployStep = () => {
    switch (deployStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Blueprint</Label>
              <Select value={blueprint} onValueChange={setBlueprint}>
                <SelectTrigger className="bg-[#0F0F0F] border-gray-700">
                  <SelectValue placeholder="Choose a blueprint..." />
                </SelectTrigger>
                <SelectContent>
                  {blueprints.map((bp: any) => (
                    <SelectItem key={bp.name} value={bp.name}>
                      {bp.name} ({bp.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-project-name"
                className="bg-[#0F0F0F] border-gray-700"
              />
              <p className="text-sm text-gray-400">Use lowercase letters, numbers, and hyphens only</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={useSnapshot}
                onCheckedChange={(checked) => setUseSnapshot(checked as boolean)}
              />
              <Label>Create from snapshot (optional)</Label>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cost Limit ($)</Label>
              <Input
                type="number"
                value={costLimit}
                onChange={(e) => setCostLimit(e.target.value)}
                placeholder="100.00"
                className="bg-[#0F0F0F] border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Action on Limit Reached</Label>
              <Select value={costAction} onValueChange={setCostAction}>
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
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={overrideLimit}
                onCheckedChange={(checked) => setOverrideLimit(checked as boolean)}
              />
              <Label>Override global cost limit</Label>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-8">
      {/* Action Bar */}
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={handleDeploy} className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
          <Plus className="w-4 h-4 mr-2" />
          Create Project
        </Button>
        <Button 
          variant="outline" 
          className="border-gray-700 hover:bg-[#2A2A2A]"
          onClick={handleStart}
          disabled={!selectedProject || loading || !isReady}
        >
          <Play className="w-4 h-4 mr-2" />
          Start
        </Button>
        <Button 
          variant="outline" 
          className="border-gray-700 hover:bg-[#2A2A2A]"
          onClick={handleStop}
          disabled={!selectedProject || loading || !isReady}
        >
          <Square className="w-4 h-4 mr-2" />
          Stop
        </Button>
        <Button 
          variant="destructive" 
          className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/50"
          onClick={(e) => {
            console.log('[Teardown] Button onClick fired');
            console.log('[Teardown] Button disabled state:', !selectedProject || loading || !isReady);
            console.log('[Teardown] selectedProject:', selectedProject);
            console.log('[Teardown] loading:', loading);
            console.log('[Teardown] isReady:', isReady);
            e.preventDefault();
            e.stopPropagation();
            handleTeardownClick(e);
          }}
          disabled={!selectedProject || loading || !isReady}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Teardown
        </Button>
        <Button 
          variant="outline" 
          className="border-gray-700 hover:bg-[#2A2A2A]"
          onClick={async () => {
            if (!selectedProject) {
              toast.error('Please select a project first');
              return;
            }
            if (!bridge || !isReady) {
              toast.error('Bridge not ready');
              return;
            }
            try {
              setLoadingStatus(true);
              const status = await bridge.getProjectStatus(selectedProject);
              setStatusData(status);
              setStatusOpen(true);
            } catch (error: any) {
              toast.error(`Failed to get project status: ${error.message}`);
            } finally {
              setLoadingStatus(false);
            }
          }}
          disabled={!selectedProject || loadingStatus || !isReady}
        >
          <Activity className="w-4 h-4 mr-2" />
          Status
        </Button>
        <Button 
          variant="outline" 
          className="border-gray-700 hover:bg-[#2A2A2A] ml-auto"
          onClick={loadData}
          disabled={loading || !isReady}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Projects Table */}
      {loading ? (
        <Card className="bg-[#1E1E1E] border-gray-800 p-12 text-center">
          <div className="text-gray-400">Loading projects...</div>
        </Card>
      ) : projects.length > 0 ? (
        <Card className="bg-[#1E1E1E] border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-800">
                <tr>
                  <th className="text-left p-4 text-gray-400"></th>
                  <th className="text-left p-4 text-gray-400">Name</th>
                  <th className="text-left p-4 text-gray-400">Blueprint</th>
                  <th className="text-left p-4 text-gray-400">Status</th>
                  <th className="text-left p-4 text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project: any) => (
                  <tr 
                    key={project.name}
                    onClick={() => setSelectedProject(project.name)}
                    className={`border-b border-gray-800 hover:bg-[#2A2A2A] cursor-pointer transition-colors ${
                      selectedProject === project.name ? 'bg-[#2A2A2A]' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className={`w-2 h-2 rounded-full ${project.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    </td>
                    <td className="p-4">{project.name}</td>
                    <td className="p-4 text-gray-400">{project.blueprint}</td>
                    <td className="p-4">
                      <Badge variant={project.status === 'running' ? 'default' : 'secondary'} className={project.status === 'running' ? 'bg-green-500/20 text-green-500 hover:bg-green-500/20' : 'bg-gray-700 text-gray-300'}>
                        {project.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-400">{project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="bg-[#1E1E1E] border-gray-800 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-[#8B5CF6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-[#8B5CF6]" />
            </div>
            <h3 className="text-xl mb-2">No Projects Yet</h3>
            <p className="text-gray-400 mb-6">Get started by creating your first project from a blueprint</p>
            <Button onClick={handleDeploy} className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
              Create Project
            </Button>
          </div>
        </Card>
      )}

      {/* Create Project Wizard Dialog */}
      <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription className="text-gray-400">
              Step {deployStep} of 3: {deployStep === 1 ? 'Blueprint Selection' : deployStep === 2 ? 'Project Configuration' : 'Cost Management'}
            </DialogDescription>
          </DialogHeader>
          
          <Progress value={(deployStep / 3) * 100} className="mb-4" />
          
          {renderDeployStep()}

          <DialogFooter className="flex gap-2">
            {deployStep > 1 && (
              <Button variant="outline" onClick={handlePrevStep} className="border-gray-700">
                Back
              </Button>
            )}
            <Button 
              onClick={handleNextStep}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
              disabled={(deployStep === 1 && !blueprint) || (deployStep === 2 && !projectName) || deploying}
            >
              {deploying ? 'Creating...' : deployStep === 3 ? 'Create' : 'Next'}
              {!deploying && <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800 max-w-3xl">
          <DialogHeader>
            <DialogTitle>Project Status: {selectedProject || 'Unknown'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingStatus ? (
              <div className="text-center text-gray-400 py-8">Loading status...</div>
            ) : statusData ? (
              <div className="p-4 bg-[#0F0F0F] rounded-lg space-y-2 font-mono text-sm">
                <div className="text-[#8B5CF6]">Project Details:</div>
                <div>  Name: {statusData.project_name || selectedProject}</div>
                <div>  Blueprint: {statusData.blueprint || 'Unknown'}</div>
                <div>  Status: <span className={statusData.status === 'running' ? 'text-green-500' : 'text-gray-500'}>{statusData.status?.toUpperCase() || 'UNKNOWN'}</span></div>
                {statusData.created_at && (
                  <div>  Created: {new Date(statusData.created_at).toLocaleString()}</div>
                )}
                {statusData.resources && Object.keys(statusData.resources).length > 0 && (
                  <>
                    <div className="text-[#8B5CF6] mt-4">Resources:</div>
                    {Object.entries(statusData.resources).map(([resourceType, resourceStatus]: [string, any]) => {
                      const state = typeof resourceStatus === 'object' ? resourceStatus.state : resourceStatus;
                      const stateColor = state === 'running' || state === 'active' || state === 'attached' ? 'text-green-500' : 'text-gray-500';
                      return (
                        <div key={resourceType}>
                          {resourceType}: <span className={stateColor}>{state || 'unknown'}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">No status data available</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setStatusOpen(false);
              setStatusData(null);
            }} className="border-gray-700">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teardown Confirmation Dialog */}
      <AlertDialog 
        open={teardownOpen} 
        onOpenChange={(open) => {
          console.log('[Teardown] Dialog open state changed:', open);
          setTeardownOpen(open);
        }}
      >
        <AlertDialogContent className="bg-[#1E1E1E] border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Teardown</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to teardown project "{selectedProject}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Card className="bg-red-500/10 border-red-500/30 p-4">
            <div className="text-sm text-red-500">
              <div className="mb-2 font-semibold">Warning:</div>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>This will delete all resources for this project</li>
                <li>This action cannot be undone</li>
                <li>All associated AWS resources will be permanently deleted</li>
              </ul>
            </div>
          </Card>

          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-gray-700"
              onClick={() => {
                console.log('[Teardown] Cancel clicked');
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                console.log('[Teardown] AlertDialogAction clicked');
                e.preventDefault();
                e.stopPropagation();
                handleTeardownConfirm();
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Teardown Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
