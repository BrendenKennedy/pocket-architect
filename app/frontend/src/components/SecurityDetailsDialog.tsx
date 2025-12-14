import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Copy, Check, Shield, Key, Lock, Award } from 'lucide-react';
import { Card } from './ui/card';
import { DetailsWizard } from './ui/details-wizard';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface SecurityDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
}

export function SecurityDetailsDialog({
  open,
  onOpenChange,
  item
}: SecurityDetailsDialogProps) {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  if (!item || !item.data) return null;

  const getIcon = () => {
    switch (item.type) {
      case 'config': return Shield;
      case 'keypair': return Key;
      case 'securitygroup': return Lock;
      case 'iamrole': return Award;
      case 'certificate': return Shield;
      default: return Shield;
    }
  };

  const getTitle = () => {
    if (item.type === 'config') return item.data.name;
    if (item.type === 'keypair') return item.data.name;
    if (item.type === 'securitygroup') return item.data.name;
    if (item.type === 'iamrole') return item.data.name;
    if (item.type === 'certificate') return item.data.domain;
    return 'Details';
  };

  return (
    <DetailsWizard
      open={open}
      onOpenChange={onOpenChange}
      title={getTitle()}
      description={`Detailed information about ${getTitle()}`}
      icon={getIcon()}
      showFooter={false}
      size="lg"
    >
      <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto pr-2 space-y-4">
          <Card className="bg-muted border-border p-4">
            <div className="space-y-3 text-sm">
              {/* Security Configuration */}
              {item.type === 'config' && (
                <>
                  <div>
                    <div className="text-gray-400 mb-1">Configuration Name</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{item.data.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(item.data.name, 'Config Name copied!')}
                      >
                        {isCopied(item.data.name) ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Description</div>
                    <div>{item.data.description}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Key Pair</div>
                    <div className="font-mono">{item.data.keyPair}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Certificate Type</div>
                    <Badge variant="outline">{item.data.certificateType}</Badge>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Security Groups</div>
                    <div className="flex flex-wrap gap-2">
                      {item.data.securityGroups?.map((sg: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {sg}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Key Pair */}
              {item.type === 'keypair' && (
                <>
                  <div>
                    <div className="text-gray-400 mb-1">Key Pair Name</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{item.data.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(item.data.name, 'Key Name copied!')}
                      >
                        {isCopied(item.data.name) ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Type</div>
                    <Badge variant="outline">{item.data.type}</Badge>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Fingerprint</div>
                    <div className="font-mono text-xs">{item.data.fingerprint}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Created</div>
                    <div>{item.data.created}</div>
                  </div>
                </>
              )}

              {/* Security Group */}
              {item.type === 'securitygroup' && (
                <>
                  <div>
                    <div className="text-gray-400 mb-1">Security Group Name</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{item.data.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(item.data.name, 'SG Name copied!')}
                      >
                        {isCopied(item.data.name) ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Description</div>
                    <div>{item.data.description}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">VPC ID</div>
                    <div className="font-mono">{item.data.vpcId}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Inbound Rules</div>
                    <div className="text-primary">{item.data.inboundRules} rules</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Outbound Rules</div>
                    <div className="text-primary">{item.data.outboundRules} rules</div>
                  </div>
                </>
              )}

              {/* IAM Role */}
              {item.type === 'iamrole' && (
                <>
                  <div>
                    <div className="text-gray-400 mb-1">Role Name</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{item.data.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(item.data.name, 'Role Name copied!')}
                      >
                        {isCopied(item.data.name) ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Description</div>
                    <div>{item.data.description}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Trust Policy</div>
                    <Badge variant="outline">{item.data.trustPolicy}</Badge>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Managed Policies</div>
                    <div className="flex flex-wrap gap-2">
                      {item.data.managedPolicies?.map((policy: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {policy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Certificate */}
              {item.type === 'certificate' && (
                <>
                  <div>
                    <div className="text-gray-400 mb-1">Domain</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{item.data.domain}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(item.data.domain, 'Domain copied!')}
                      >
                        {isCopied(item.data.domain) ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Status</div>
                    <Badge 
                      variant="outline"
                      className={
                        item.data.status === 'Issued' 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-yellow-500/20 text-yellow-500'
                      }
                    >
                      {item.data.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Type</div>
                    <Badge variant="outline">{item.data.type}</Badge>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Expiration</div>
                    <div>{item.data.expiration}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">ARN</div>
                    <div className="font-mono text-xs break-all">{item.data.arn}</div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="flex-1 overflow-y-auto pr-2 space-y-4">
          <Card className="bg-muted border-border p-4">
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-400 mb-1">Type</div>
                <Badge variant="outline" className="capitalize">{item.type}</Badge>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Raw Data</div>
                <div className="bg-background/30 border border-border rounded p-3">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(item.data, null, 2)}
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