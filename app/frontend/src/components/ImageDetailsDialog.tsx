import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Copy, Check, HardDrive } from 'lucide-react';
import { Card } from './ui/card';
import { DetailsWizard } from './ui/details-wizard';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface ImageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: any;
}

export function ImageDetailsDialog({
  open,
  onOpenChange,
  image
}: ImageDetailsDialogProps) {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  if (!image) return null;

  return (
    <DetailsWizard
      open={open}
      onOpenChange={onOpenChange}
      title={image.name}
      description={`Detailed information about the ${image.name} image`}
      icon={HardDrive}
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
              <div>
                <div className="text-text-tertiary mb-1">Image Name</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{image.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(image.name, 'Image Name copied!')}
                  >
                    {isCopied(image.name) ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-text-tertiary mb-1">AMI ID</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{image.amiId}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(image.amiId, 'AMI ID copied!')}
                  >
                    {isCopied(image.amiId) ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-text-tertiary mb-1">Description</div>
                <div>{image.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-text-tertiary mb-1">Architecture</div>
                  <Badge variant="outline">{image.architecture}</Badge>
                </div>
                <div>
                  <div className="text-text-tertiary mb-1">Size</div>
                  <div>{image.size}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-text-tertiary mb-1">Root Device</div>
                  <Badge variant="outline" className="uppercase">{image.rootDevice}</Badge>
                </div>
                <div>
                  <div className="text-text-tertiary mb-1">Virtualization</div>
                  <Badge variant="outline" className="uppercase">{image.virtualization}</Badge>
                </div>
              </div>

              <div>
                <div className="text-text-tertiary mb-1">Created</div>
                <div>{image.created}</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="flex-1 overflow-y-auto pr-2 space-y-4">
          <Card className="bg-muted border-border p-4">
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-text-tertiary mb-1">Technical Details</div>
                <div className="bg-background/30 border border-border rounded p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">Architecture:</span>
                    <span className="font-mono">{image.architecture}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">Root Device Type:</span>
                    <span className="uppercase">{image.rootDevice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">Virtualization:</span>
                    <span className="uppercase">{image.virtualization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">Image Size:</span>
                    <span>{image.size}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-text-tertiary mb-1">AMI Details</div>
                <div className="bg-background/30 border border-border rounded p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">AMI ID:</span>
                    <span className="font-mono">{image.amiId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-quaternary">Name:</span>
                    <span className="font-mono">{image.name}</span>
                  </div>
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
                <div className="text-text-tertiary mb-1">Image ID</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{image.id}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(image.id.toString(), 'Image ID copied!')}
                  >
                    {isCopied(image.id.toString()) ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-text-tertiary mb-1">Creation Date</div>
                <div>{image.created}</div>
              </div>

              <div>
                <div className="text-text-tertiary mb-1">Full Specification</div>
                <div className="bg-background/30 border border-border rounded p-3">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify({
                      id: image.id,
                      name: image.name,
                      amiId: image.amiId,
                      architecture: image.architecture,
                      rootDevice: image.rootDevice,
                      virtualization: image.virtualization,
                      size: image.size,
                      created: image.created,
                      description: image.description
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </DetailsWizard>
  );
}