import { useState, useEffect } from 'react';
import { Search, RefreshCw, Eye, Plus, ChevronRight, Server, Network, HardDrive, Shield, Tag, Trash2, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';
import { useBridge } from '../contexts/BridgeContext';

const instanceSpecs = {
  't3.small': { vcpu: 2, memory: '2 GiB', cost: '$0.0208/hr' },
  't3.medium': { vcpu: 2, memory: '4 GiB', cost: '$0.0416/hr' },
  't3.large': { vcpu: 2, memory: '8 GiB', cost: '$0.0832/hr' },
  't3.xlarge': { vcpu: 4, memory: '16 GiB', cost: '$0.1664/hr' },
};

export function Blueprints() {
  const { bridge, isReady } = useBridge();
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<any | null>(null);
  const [setupScript, setSetupScript] = useState<string>('');

  useEffect(() => {
    if (isReady && bridge) {
      loadBlueprints();
    }
  }, [isReady, bridge]);

  const loadBlueprints = async () => {
    if (!bridge) return;
    
    try {
      setLoading(true);
      const data = await bridge.listBlueprints();
      if (Array.isArray(data)) {
        setBlueprints(data);
      }
    } catch (error: any) {
      console.error('Failed to load blueprints:', error);
      toast.error('Failed to load blueprints');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (blueprint: any) => {
    setSelectedBlueprint(blueprint);
    setDetailsOpen(true);
    
    // Load setup script if available
    if (bridge && blueprint.name) {
      try {
        const scripts = await bridge.listSetupScripts();
        if (scripts.scripts && scripts.scripts.length > 0) {
          const scriptContent = await bridge.loadSetupScript(scripts.scripts[0]);
          if (scriptContent.content) {
            setSetupScript(scriptContent.content);
          }
        }
      } catch (error) {
        console.error('Failed to load setup script:', error);
      }
    }
  };

  const handleDeleteClick = (blueprint: any) => {
    if (blueprint.type === 'Built-in') {
      toast.error('Cannot delete built-in blueprints');
      return;
    }
    setBlueprintToDelete(blueprint.name);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!blueprintToDelete || !bridge || !isReady) {
      toast.error('Bridge not ready');
      setDeleteOpen(false);
      return;
    }

    try {
      const result = await bridge.deleteBlueprint(blueprintToDelete);
      if (result.success) {
        toast.success(result.message || 'Blueprint deleted successfully');
        setDeleteOpen(false);
        setBlueprintToDelete(null);
        loadBlueprints();
      } else {
        toast.error(result.error || result.message || 'Failed to delete blueprint');
      }
    } catch (error: any) {
      toast.error(`Failed to delete blueprint: ${error.message}`);
    }
  };

  const handleUpdateClick = (blueprint: any) => {
    if (blueprint.type === 'Built-in') {
      toast.error('Cannot update built-in blueprints');
      return;
    }
    setBlueprintToUpdate(blueprint);
    setUpdateOpen(true);
    // Pre-fill form with blueprint data
    setBpName(blueprint.name);
    setBpDescription(blueprint.description || '');
    setBpUseCase(blueprint.use_case || '');
    setBpRegion(blueprint.region || 'us-east-1');
    setBpInstanceType(blueprint.instance_type || 't3.medium');
    setCreateStep(1);
  };

  const handleUpdateConfirm = async () => {
    if (!blueprintToUpdate || !bridge || !isReady) {
      toast.error('Bridge not ready');
      setUpdateOpen(false);
      return;
    }

    try {
      // Build blueprint data from form state
      const blueprintData: any = {
        name: bpName,
        description: bpDescription,
        provider: 'aws',
        resources: {
          instance_type: bpInstanceType,
          ami: bpAmi,
          count: parseInt(bpInstanceCount) || 1,
          use_spot: bpUseSpot,
          use_default_vpc: bpDefaultVpc,
          vpc_cidr: bpCidr,
          use_alb: bpUseAlb,
          use_eip: bpUseEip,
        },
      };

      if (!bpSkipStorage) {
        blueprintData.resources.ebs_size = parseInt(bpEbsSize) || 30;
        blueprintData.resources.ebs_type = bpEbsType;
      }

      if (bpTags) {
        blueprintData.metadata = { tags: bpTags };
      }

      const result = await bridge.updateBlueprint(blueprintToUpdate.name, blueprintData);
      if (result.success) {
        toast.success(result.message || 'Blueprint updated successfully');
        setUpdateOpen(false);
        setBlueprintToUpdate(null);
        loadBlueprints();
      } else {
        toast.error(result.error || result.message || 'Failed to update blueprint');
      }
    } catch (error: any) {
      toast.error(`Failed to update blueprint: ${error.message}`);
    }
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blueprintToDelete, setBlueprintToDelete] = useState<string | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [blueprintToUpdate, setBlueprintToUpdate] = useState<any | null>(null);
  
  // Create form state
  const [bpName, setBpName] = useState('');
  const [bpDescription, setBpDescription] = useState('');
  const [bpUseCase, setBpUseCase] = useState('');
  const [bpRegion, setBpRegion] = useState('us-east-1');
  const [bpTags, setBpTags] = useState('');
  const [bpInstanceType, setBpInstanceType] = useState('t3.medium');
  const [bpAmi, setBpAmi] = useState('ami-0c55b159cbfafe1f0');
  const [bpInstanceCount, setBpInstanceCount] = useState('1');
  const [bpUseSpot, setBpUseSpot] = useState(false);
  const [bpDefaultVpc, setBpDefaultVpc] = useState(true);
  const [bpCidr, setBpCidr] = useState('10.0.0.0/16');
  const [bpUseAlb, setBpUseAlb] = useState(false);
  const [bpUseEip, setBpUseEip] = useState(true);
  const [bpSkipStorage, setBpSkipStorage] = useState(false);
  const [bpEbsSize, setBpEbsSize] = useState('30');
  const [bpEbsType, setBpEbsType] = useState('gp3');

  const handleCreateBlueprint = () => {
    setCreateOpen(true);
    setCreateStep(1);
  };

  const handleNextStep = () => {
    if (createStep < 6) {
      setCreateStep(createStep + 1);
    } else {
      toast.success('Blueprint created successfully!');
      setCreateOpen(false);
      setCreateStep(1);
    }
  };

  const handlePrevStep = () => {
    if (createStep > 1) {
      setCreateStep(createStep - 1);
    }
  };

  const filteredBlueprints = blueprints.filter((bp: any) => {
    const matchesSearch = bp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || bp.type?.toLowerCase() === typeFilter;
    return matchesSearch && matchesType;
  });

  const renderCreateStep = () => {
    switch (createStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Blueprint Name</Label>
              <Input value={bpName} onChange={(e) => setBpName(e.target.value)} placeholder="my-blueprint" className="bg-[#0F0F0F] border-gray-700" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={bpDescription} onChange={(e) => setBpDescription(e.target.value)} placeholder="Describe your blueprint..." className="bg-[#0F0F0F] border-gray-700" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Use Case</Label>
              <Input value={bpUseCase} onChange={(e) => setBpUseCase(e.target.value)} placeholder="e.g., Web hosting, Development" className="bg-[#0F0F0F] border-gray-700" />
            </div>
            <div className="space-y-2">
              <Label>AWS Region</Label>
              <Select value={bpRegion} onValueChange={setBpRegion}>
                <SelectTrigger className="bg-[#0F0F0F] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-[#8B5CF6] hover:text-[#7C3AED]">Advanced: Custom Tags</summary>
              <div className="mt-2">
                <Input value={bpTags} onChange={(e) => setBpTags(e.target.value)} placeholder="key1=value1,key2=value2" className="bg-[#0F0F0F] border-gray-700" />
              </div>
            </details>
          </div>
        );
      case 2:
        const selectedSpec = instanceSpecs[bpInstanceType as keyof typeof instanceSpecs];
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Instance Type</Label>
              <Select value={bpInstanceType} onValueChange={setBpInstanceType}>
                <SelectTrigger className="bg-[#0F0F0F] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="t3.small">t3.small</SelectItem>
                  <SelectItem value="t3.medium">t3.medium</SelectItem>
                  <SelectItem value="t3.large">t3.large</SelectItem>
                  <SelectItem value="t3.xlarge">t3.xlarge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card className="bg-[#0F0F0F] border-gray-700 p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-400 mb-1">vCPU</div>
                  <div>{selectedSpec.vcpu}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Memory</div>
                  <div>{selectedSpec.memory}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Cost</div>
                  <div className="text-green-500">{selectedSpec.cost}</div>
                </div>
              </div>
            </Card>
            <div className="space-y-2">
              <Label>AMI ID</Label>
              <Input value={bpAmi} onChange={(e) => setBpAmi(e.target.value)} className="bg-[#0F0F0F] border-gray-700" />
            </div>
            <div className="space-y-2">
              <Label>Instance Count</Label>
              <Input type="number" value={bpInstanceCount} onChange={(e) => setBpInstanceCount(e.target.value)} className="bg-[#0F0F0F] border-gray-700" min="1" />
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-[#8B5CF6] hover:text-[#7C3AED]">Advanced Options</summary>
              <div className="mt-2 space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={bpUseSpot} onCheckedChange={(checked) => setBpUseSpot(checked as boolean)} />
                  <Label>Use Spot Instances (save up to 90%)</Label>
                </div>
                <div className="space-y-2">
                  <Label>User Data Script</Label>
                  <Textarea placeholder="#!/bin/bash&#10;echo 'Hello World'" className="bg-[#0F0F0F] border-gray-700 font-mono" rows={3} />
                </div>
              </div>
            </details>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox checked={bpDefaultVpc} onCheckedChange={(checked) => setBpDefaultVpc(checked as boolean)} />
              <Label>Use Default VPC</Label>
            </div>
            {!bpDefaultVpc && (
              <div className="space-y-2">
                <Label>VPC CIDR Block</Label>
                <Input value={bpCidr} onChange={(e) => setBpCidr(e.target.value)} className="bg-[#0F0F0F] border-gray-700" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox checked={bpUseAlb} onCheckedChange={(checked) => setBpUseAlb(checked as boolean)} />
              <Label>Create Application Load Balancer</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={bpUseEip} onCheckedChange={(checked) => setBpUseEip(checked as boolean)} />
              <Label>Allocate Elastic IP</Label>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-[#8B5CF6] hover:text-[#7C3AED]">Advanced: Custom Domain</summary>
              <div className="mt-2 space-y-2">
                <Label>Domain Name</Label>
                <Input placeholder="example.com" className="bg-[#0F0F0F] border-gray-700" />
              </div>
            </details>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox checked={bpSkipStorage} onCheckedChange={(checked) => setBpSkipStorage(checked as boolean)} />
              <Label>Skip additional storage configuration</Label>
            </div>
            {!bpSkipStorage && (
              <>
                <div className="space-y-2">
                  <Label>EBS Volume Size (GB)</Label>
                  <Input type="number" value={bpEbsSize} onChange={(e) => setBpEbsSize(e.target.value)} className="bg-[#0F0F0F] border-gray-700" min="8" />
                </div>
                <div className="space-y-2">
                  <Label>EBS Volume Type</Label>
                  <Select value={bpEbsType} onValueChange={setBpEbsType}>
                    <SelectTrigger className="bg-[#0F0F0F] border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gp3">General Purpose SSD (gp3)</SelectItem>
                      <SelectItem value="gp2">General Purpose SSD (gp2)</SelectItem>
                      <SelectItem value="io2">Provisioned IOPS SSD (io2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox />
                  <Label>Create S3 Bucket for backups</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox />
                  <Label>Enable EFS shared file system</Label>
                </div>
              </>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>IAM Role</Label>
              <Select defaultValue="default">
                <SelectTrigger className="bg-[#0F0F0F] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default EC2 Role</SelectItem>
                  <SelectItem value="admin">Administrator Access</SelectItem>
                  <SelectItem value="readonly">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox defaultChecked />
              <Label>Grant S3 access</Label>
            </div>
            <div className="space-y-2">
              <Label>Open Ports (comma-separated)</Label>
              <Input placeholder="22, 80, 443" className="bg-[#0F0F0F] border-gray-700" />
            </div>
            <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="text-yellow-500 mb-1">Security Notice</div>
                  <div className="text-gray-300">Opening port 22 (SSH) to the internet is not recommended. Consider using a bastion host or VPN.</div>
                </div>
              </div>
            </Card>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <div className="text-lg mb-4">Review Blueprint Configuration</div>
            <Card className="bg-[#0F0F0F] border-gray-700 p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span>{bpName || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Region:</span>
                  <span>{bpRegion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Instance Type:</span>
                  <span>{bpInstanceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Instance Count:</span>
                  <span>{bpInstanceCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">EBS Size:</span>
                  <span>{bpSkipStorage ? 'None' : `${bpEbsSize} GB (${bpEbsType})`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Elastic IP:</span>
                  <span>{bpUseEip ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </Card>
            <Card className="bg-[#8B5CF6]/10 border-[#8B5CF6]/30 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Estimated Monthly Cost</div>
                  <div className="text-2xl text-[#8B5CF6]">$32.50</div>
                </div>
                <div className="text-sm text-gray-400">
                  Based on 730 hours/month
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  const stepTitles = ['Basic Info', 'Compute', 'Networking', 'Storage', 'Security', 'Review'];

  return (
    <div className="p-8">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search blueprints..."
            className="pl-10 bg-[#1E1E1E] border-gray-700"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48 bg-[#1E1E1E] border-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="built-in">Built-in</SelectItem>
            <SelectItem value="user">User Created</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleCreateBlueprint} className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
          <Plus className="w-4 h-4 mr-2" />
          Create Blueprint
        </Button>
        <Button 
          variant="outline" 
          className="border-gray-700 hover:bg-[#2A2A2A]"
          onClick={loadBlueprints}
          disabled={loading || !isReady}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Blueprints Table */}
      <Card className="bg-[#1E1E1E] border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="text-left p-4 text-gray-400">Name</th>
                <th className="text-left p-4 text-gray-400">Description</th>
                <th className="text-left p-4 text-gray-400">Type</th>
                <th className="text-left p-4 text-gray-400">Instance Type</th>
                <th className="text-left p-4 text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">Loading blueprints...</td>
                </tr>
              ) : filteredBlueprints.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">No blueprints found</td>
                </tr>
              ) : (
                filteredBlueprints.map((blueprint: any) => (
                  <tr key={blueprint.name} className="border-b border-gray-800 hover:bg-[#2A2A2A] transition-colors">
                    <td className="p-4">{blueprint.name}</td>
                    <td className="p-4 text-gray-400">{blueprint.description || 'No description'}</td>
                    <td className="p-4">
                      <Badge variant={blueprint.type === 'Built-in' ? 'default' : 'secondary'} className={blueprint.type === 'Built-in' ? 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/20' : 'bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/20'}>
                        {blueprint.type}
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-400">{blueprint.instance_type || 'N/A'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(blueprint)}
                          className="hover:bg-[#8B5CF6]/20 hover:text-[#8B5CF6]"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        {blueprint.type !== 'Built-in' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateClick(blueprint)}
                              className="hover:bg-blue-500/20 hover:text-blue-500"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Update
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteClick(blueprint)}
                              className="hover:bg-red-500/20 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Blueprint Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBlueprint?.name}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-[#0F0F0F]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="config">Config YAML</TabsTrigger>
              <TabsTrigger value="script">Setup Script</TabsTrigger>
              <TabsTrigger value="diagram">Visual Diagram</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Name</Label>
                  <div className="mt-1">{selectedBlueprint?.name}</div>
                </div>
                <div>
                  <Label className="text-gray-400">Type</Label>
                  <div className="mt-1">
                    <Badge variant={selectedBlueprint?.type === 'Built-in' ? 'default' : 'secondary'}>
                      {selectedBlueprint?.type}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Instance Type</Label>
                  <div className="mt-1">{selectedBlueprint?.instance_type || selectedBlueprint?.instanceType}</div>
                </div>
                <div>
                  <Label className="text-gray-400">Region</Label>
                  <div className="mt-1">us-east-1</div>
                </div>
              </div>
              <div>
                <Label className="text-gray-400">Description</Label>
                <div className="mt-1 text-gray-300">{selectedBlueprint?.description}</div>
              </div>
              <div>
                <Label className="text-gray-400">Setup Script</Label>
                <div className="mt-1 text-gray-300">Included (bash, 45 lines)</div>
              </div>
            </TabsContent>

            <TabsContent value="config" className="mt-4">
              <Card className="bg-[#0F0F0F] border-gray-700 p-4">
                <pre className="font-mono text-sm text-gray-300 overflow-x-auto">
{`  resources:
    vpc:
      cidr: 10.0.0.0/16
      enable_dns: true
    
    subnet:
      cidr: 10.0.1.0/24
      availability_zone: us-east-1a
    
    ec2:
      instance_type: ${selectedBlueprint?.instance_type || selectedBlueprint?.instanceType || 't3.medium'}
      ami: ami-0c55b159cbfafe1f0
      count: 1
      
    security_group:
      ingress:
        - port: 22
          protocol: tcp
          cidr: 0.0.0.0/0
        - port: 80
          protocol: tcp
          cidr: 0.0.0.0/0`}
                </pre>
              </Card>
            </TabsContent>

            <TabsContent value="script" className="mt-4">
              <Card className="bg-[#0F0F0F] border-gray-700 p-4">
                <pre className="font-mono text-sm text-gray-300 overflow-x-auto">
                  {setupScript || `#!/bin/bash
# Setup script for ${selectedBlueprint?.name}

echo "Starting instance setup..."

# Update system packages
apt-get update -y
apt-get upgrade -y

# Install required packages
apt-get install -y nginx curl git

# Configure nginx
systemctl start nginx
systemctl enable nginx

# Setup application directory
mkdir -p /var/www/app
chown -R www-data:www-data /var/www/app

echo "Setup complete!"`}
                </pre>
              </Card>
            </TabsContent>

            <TabsContent value="diagram" className="mt-4">
              <Card className="bg-[#0F0F0F] border-gray-700 p-8">
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <div className="w-32 h-24 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center mb-2">
                      <Network className="w-12 h-12 text-blue-500" />
                    </div>
                    <div className="text-sm">VPC</div>
                    <div className="text-xs text-gray-400">10.0.0.0/16</div>
                  </div>
                  <ChevronRight className="w-8 h-8 text-gray-600" />
                  <div className="text-center">
                    <div className="w-32 h-24 bg-[#8B5CF6]/20 border-2 border-[#8B5CF6] rounded-lg flex items-center justify-center mb-2">
                      <Network className="w-12 h-12 text-[#8B5CF6]" />
                    </div>
                    <div className="text-sm">Subnet</div>
                    <div className="text-xs text-gray-400">10.0.1.0/24</div>
                  </div>
                  <ChevronRight className="w-8 h-8 text-gray-600" />
                  <div className="text-center">
                    <div className="w-32 h-24 bg-green-500/20 border-2 border-green-500 rounded-lg flex items-center justify-center mb-2">
                      <Server className="w-12 h-12 text-green-500" />
                    </div>
                  <div className="text-sm">EC2 Instance</div>
                  <div className="text-xs text-gray-400">{selectedBlueprint?.instance_type || selectedBlueprint?.instanceType}</div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)} className="border-gray-700">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Blueprint Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Blueprint</DialogTitle>
            <div className="text-sm text-gray-400">Step {createStep} of 6: {stepTitles[createStep - 1]}</div>
          </DialogHeader>

          <Progress value={(createStep / 6) * 100} className="mb-4" />

          {renderCreateStep()}

          <DialogFooter className="flex gap-2">
            {createStep > 1 && (
              <Button variant="outline" onClick={handlePrevStep} className="border-gray-700">
                Back
              </Button>
            )}
            {createStep < 6 && (
              <Button variant="outline" className="border-gray-700">
                Save Draft
              </Button>
            )}
            <Button
              onClick={handleNextStep}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
              disabled={createStep === 1 && !bpName}
            >
              {createStep === 6 ? 'Create Blueprint' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#1E1E1E] border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blueprint</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete blueprint "{blueprintToDelete}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Card className="bg-red-500/10 border-red-500/30 p-4">
            <div className="text-sm text-red-500">
              <div className="mb-2 font-semibold">Warning:</div>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>This action cannot be undone</li>
                <li>The blueprint file will be permanently deleted</li>
                <li>Existing projects using this blueprint will not be affected</li>
              </ul>
            </div>
          </Card>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete Blueprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Blueprint Dialog */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Blueprint: {blueprintToUpdate?.name}</DialogTitle>
            <div className="text-sm text-gray-400">Step {createStep} of 6: {stepTitles[createStep - 1]}</div>
          </DialogHeader>

          <Progress value={(createStep / 6) * 100} className="mb-4" />

          {renderCreateStep()}

          <DialogFooter className="flex gap-2">
            {createStep > 1 && (
              <Button variant="outline" onClick={handlePrevStep} className="border-gray-700">
                Back
              </Button>
            )}
            {createStep < 6 && (
              <Button variant="outline" className="border-gray-700">
                Save Draft
              </Button>
            )}
            <Button
              onClick={handleUpdateConfirm}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
              disabled={createStep === 1 && !bpName}
            >
              {createStep === 6 ? 'Update Blueprint' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
