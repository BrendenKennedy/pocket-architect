import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Card } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { theme, cn } from '@/lib/theme-factory';

export interface DetailsField {
  label: string;
  value: string | React.ReactNode;
  copyable?: boolean;
  type?: 'text' | 'code' | 'badge' | 'status';
  status?: 'active' | 'inactive' | 'warning' | 'error';
}

export interface DetailsSection {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  fields: DetailsField[];
}

export interface DetailsTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export interface DetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  tabs?: DetailsTab[];
  sections?: DetailsSection[];
  children?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  onClose?: () => void;
}

export function DetailsDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  tabs,
  sections,
  children,
  maxWidth = 'xl',
  onClose,
}: DetailsDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (value: string, label: string) => {
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
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const renderFieldValue = (field: DetailsField) => {
    if (typeof field.value !== 'string') {
      return field.value;
    }

    switch (field.type) {
      case 'code':
        return (
          <code className="text-xs bg-black px-2 py-1 rounded border border-border text-primary font-mono">
            {field.value}
          </code>
        );
      case 'badge':
        return <Badge variant="outline">{field.value}</Badge>;
      case 'status':
        const statusColors = {
          active: 'border-green-500/50 text-green-500',
          inactive: 'border-gray-500/50 text-gray-500',
          warning: 'border-yellow-500/50 text-yellow-500',
          error: 'border-red-500/50 text-red-500',
        };
        return (
          <Badge variant="outline" className={statusColors[field.status || 'inactive']}>
            {field.value}
          </Badge>
        );
      default:
        return <span className="text-sm">{field.value}</span>;
    }
  };

  const renderSection = (section: DetailsSection, index: number) => {
    const SectionIcon = section.icon;

    return (
      <Card key={index} className="bg-muted border-border p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          {SectionIcon && <SectionIcon className="w-4 h-4 text-primary" />}
          {section.title}
        </h3>
        <div className="space-y-2">
          {section.fields.map((field, fieldIdx) => (
            <div key={fieldIdx} className="flex justify-between items-center py-1 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{field.label}</span>
              <div className="flex items-center gap-2">
                {renderFieldValue(field)}
                {field.copyable && typeof field.value === 'string' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopy(field.value as string, field.label)}
                  >
                    {copiedField === field.label ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(theme.dialog.content(maxWidth))} aria-describedby={subtitle ? undefined : "no-description"}>
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle>{title}</DialogTitle>
              {subtitle && <DialogDescription className={cn(theme.text.small(), "mt-1")}>{subtitle}</DialogDescription>}
              {!subtitle && <DialogDescription id="no-description" className="sr-only">No description available</DialogDescription>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                onClose?.();
                onOpenChange(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {tabs ? (
          <Tabs defaultValue={tabs[0]?.id} className="w-full">
            <TabsList className={theme.dialog.tabs()}>
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                    {TabIcon && <TabIcon className="w-4 h-4" />}
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="space-y-4 mt-4">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        ) : sections ? (
          <div className="space-y-4">{sections.map(renderSection)}</div>
        ) : (
          children
        )}
      </DialogContent>
    </Dialog>
  );
}

// Utility components for common details dialog patterns
export const DetailsDialogComponents = {
  CodeBlock: ({ title, code, language = 'bash' }: { title?: string; code: string; language?: string }) => (
    <Card className="bg-muted border-input p-4">
      {title && (
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-semibold text-primary">{title}</h4>
        </div>
      )}
      <pre className="bg-black p-4 rounded text-xs font-mono overflow-x-auto border border-border">
        <code className="text-gray-300">{code}</code>
      </pre>
    </Card>
  ),

  KeyValueGrid: ({ items }: { items: Record<string, string> }) => (
    <div className="grid grid-cols-2 gap-3 text-sm">
      {Object.entries(items).map(([key, value]) => (
        <div key={key} className="bg-card p-3 rounded border border-border">
          <div className="text-muted-foreground text-xs mb-1">{key}</div>
          <div className="font-medium">{value}</div>
        </div>
      ))}
    </div>
  ),

  InfoCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="bg-muted border-input p-4">
      <h4 className="text-sm font-semibold mb-3 text-primary">{title}</h4>
      {children}
    </Card>
  ),
};