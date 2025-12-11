import { Database, Server, Copy, Check, FileCode, Terminal, Key, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DetailsWizard } from './ui/details-wizard';
import { StatusBadge } from './ui/status-badge';

interface InstanceData {
  name: string;
  project: string;
  blueprint: string;
  instanceType: string;
  status: 'running' | 'stopped';
  created: string;
  ip: string;
  publicIp: string;
  sshEnabled: boolean;
  sshUser: string;
  sshPort: number;
}

interface InstanceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: InstanceData | null;
  copiedField: string;
  onCopyField: (value: string, field: string) => void;
  getInstanceYAML: (instance: InstanceData) => string;
}

export function InstanceDetailsDialog({
  open,
  onOpenChange,
  instance,
  copiedField,
  onCopyField,
  getInstanceYAML,
}: InstanceDetailsDialogProps) {
  if (!instance) return null;

  return (
    <DetailsWizard
      open={open}
      onOpenChange={onOpenChange}
      title={`Instance Details: ${instance.name}`}
      description="In-depth technical details and configuration for this instance"
      icon={Database}
      showFooter={false}
      size="xl"
    >
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="yaml">YAML Config</TabsTrigger>
          <TabsTrigger value="ids">Resource IDs</TabsTrigger>
          <TabsTrigger value="script">Startup Script</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-tertiary">Name:</span>
              <span className="font-mono">{instance.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-tertiary">Project:</span>
              <span>{instance.project}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-tertiary">Blueprint:</span>
              <span>{instance.blueprint}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-tertiary">Instance Type:</span>
              <Badge variant="outline" className="border-primary/30 text-primary">
                {instance.instanceType}
              </Badge>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-tertiary">Status:</span>
              <StatusBadge status={instance.status} />
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Created:</span>
              <span>{instance.created}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4 mt-4">
          <Card className="bg-muted border-border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Network Configuration
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-text-tertiary">Private IP:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{instance.ip}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => onCopyField(instance.ip, 'Private IP')}
                  >
                    {copiedField === 'Private IP' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-text-tertiary">Public IP:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{instance.publicIp}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => onCopyField(instance.publicIp, 'Public IP')}
                  >
                    {copiedField === 'Public IP' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-tertiary">SSH Enabled:</span>
                <StatusBadge 
                  status={instance.sshEnabled ? 'success' : 'error'}
                  label={instance.sshEnabled ? 'Yes' : 'No'}
                />
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-tertiary">SSH User:</span>
                <span className="font-mono">{instance.sshUser}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-tertiary">SSH Port:</span>
                <span className="font-mono">{instance.sshPort}</span>
              </div>
              {instance.sshEnabled && instance.status === 'running' && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-text-tertiary">SSH Command:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-black px-2 py-1 rounded border border-border text-primary font-mono">
                      ssh -i ~/.ssh/your-key.pem {instance.sshUser}@{instance.publicIp}{instance.sshPort !== 22 ? ` -p ${instance.sshPort}` : ''}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        const sshCommand = `ssh -i ~/.ssh/your-key.pem ${instance.sshUser}@${instance.publicIp}${instance.sshPort !== 22 ? ` -p ${instance.sshPort}` : ''}`;
                        navigator.clipboard.writeText(sshCommand);
                        onCopyField(sshCommand, 'SSH Command');
                      }}
                    >
                      {copiedField === 'SSH Command' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="yaml" className="space-y-4 mt-4">
          <Card className="bg-muted border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileCode className="w-4 h-4 text-primary" />
                Instance Configuration (YAML)
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopyField(getInstanceYAML(instance), 'YAML Configuration')}
              >
                {copiedField === 'YAML Configuration' ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy YAML
                  </>
                )}
              </Button>
            </div>
            <pre className="bg-black p-4 rounded text-xs font-mono overflow-x-auto border border-border">
              <code className="text-gray-300">{getInstanceYAML(instance)}</code>
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="ids" className="space-y-4 mt-4">
          <Card className="bg-muted border-border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              Resource Identifiers
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-text-tertiary">Instance ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">i-0a1b2c3d4e5f6g7h8</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => onCopyField('i-0a1b2c3d4e5f6g7h8', 'Instance ID')}
                  >
                    {copiedField === 'Instance ID' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-text-tertiary">VPC ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">vpc-0a1b2c3d4e5f6g7h8</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => onCopyField('vpc-0a1b2c3d4e5f6g7h8', 'VPC ID')}
                  >
                    {copiedField === 'VPC ID' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-text-tertiary">Subnet ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">subnet-0a1b2c3d4e5f6g7h8</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => onCopyField('subnet-0a1b2c3d4e5f6g7h8', 'Subnet ID')}
                  >
                    {copiedField === 'Subnet ID' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-text-tertiary">Security Group ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">sg-0a1b2c3d4e5f6g7h8</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => onCopyField('sg-0a1b2c3d4e5f6g7h8', 'Security Group ID')}
                  >
                    {copiedField === 'Security Group ID' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="script" className="space-y-4 mt-4">
          <Card className="bg-muted border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileCode className="w-4 h-4 text-primary" />
                User Data / Startup Script
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopyField('#!/bin/bash\necho "Hello World"', 'Startup Script')}
              >
                {copiedField === 'Startup Script' ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Script
                  </>
                )}
              </Button>
            </div>
            <pre className="bg-black p-4 rounded text-xs font-mono overflow-x-auto border border-border">
              <code className="text-gray-300">{`#!/bin/bash
# Startup script for ${instance.name}
echo "Initializing instance..."

# Update system packages
apt-get update -y
apt-get upgrade -y

# Install required packages
apt-get install -y curl wget git

echo "Instance initialization complete!"`}</code>
            </pre>
          </Card>
        </TabsContent>
      </Tabs>
    </DetailsWizard>
  );
}