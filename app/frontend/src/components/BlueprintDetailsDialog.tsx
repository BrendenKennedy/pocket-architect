import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Copy, Check, FileText } from 'lucide-react';
import { Card } from './ui/card';
import { DetailsWizard } from './ui/details-wizard';

interface BlueprintDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blueprint: any;
}

export function BlueprintDetailsDialog({
  open,
  onOpenChange,
  blueprint
}: BlueprintDetailsDialogProps) {
  if (!blueprint) return null;

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyField = (value: string, label: string) => {
    // Use fallback method for copying that doesn't require clipboard permissions
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <DetailsWizard
      open={open}
      onOpenChange={onOpenChange}
      title={blueprint.name}
      description={`Detailed information about the ${blueprint.name} blueprint`}
      icon={FileText}
      showFooter={false}
      size="lg"
    >
      <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto pr-2 space-y-4">
          <Card className="bg-muted border-border p-4">
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-text-tertiary mb-1">Blueprint Name</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{blueprint.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCopyField(blueprint.name, 'Blueprint Name')}
                    >
                      {copiedField === 'Blueprint Name' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-1">Type</div>
                  <Badge 
                    variant={blueprint.type === 'built-in' ? 'default' : 'secondary'}
                    className={
                      blueprint.type === 'built-in' 
                        ? 'bg-primary/20 text-primary hover:bg-primary/20' 
                        : 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/20'
                    }
                  >
                    {blueprint.type === 'built-in' ? 'Built-in' : 'User Created'}
                  </Badge>
                </div>
              </div>

              <div>
                <div className="text-text-tertiary mb-1">Description</div>
                <div>{blueprint.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-text-tertiary mb-1">Platform</div>
                  <div className="font-mono uppercase">{blueprint.platform}</div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-1">Instance Type</div>
                  <div className="font-mono">{blueprint.instanceType}</div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="flex-1 overflow-y-auto pr-2 space-y-4">
          <Card className="bg-muted border-border p-4">
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-text-tertiary mb-1">Instance Type</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{blueprint.instanceType}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopyField(blueprint.instanceType, 'Instance Type')}
                  >
                    {copiedField === 'Instance Type' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-text-tertiary mb-1">Platform</div>
                <div className="bg-background/30 border border-border rounded p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">Provider:</span>
                    <span className="uppercase font-mono">{blueprint.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">Type:</span>
                    <span>{blueprint.type === 'built-in' ? 'Built-in Template' : 'User Created'}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-text-tertiary mb-1">Description</div>
                <div className="bg-background/30 border border-border rounded p-3">
                  {blueprint.description}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="flex-1 overflow-y-auto pr-2 space-y-4">
          <Card className="bg-muted border-border p-4">
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-text-tertiary mb-1">Blueprint ID</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{blueprint.id}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopyField(blueprint.id.toString(), 'Blueprint ID')}
                  >
                    {copiedField === 'Blueprint ID' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-text-tertiary mb-1">Platform Details</div>
                <div className="bg-background/30 border border-border rounded p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">Provider:</span>
                    <span className="uppercase font-mono">{blueprint.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">Instance Type:</span>
                    <span className="font-mono">{blueprint.instanceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">Blueprint Type:</span>
                    <span>{blueprint.type === 'built-in' ? 'Built-in' : 'User Created'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </DetailsWizard>
  );
}