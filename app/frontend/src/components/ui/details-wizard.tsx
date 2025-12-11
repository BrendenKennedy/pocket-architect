import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './dialog';
import { Button } from './button';
import { LucideIcon } from 'lucide-react';
import { theme, cn } from '@/lib/theme-factory';

interface DetailsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  saveDisabled?: boolean;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showFooter?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl max-h-[80vh] overflow-y-auto',
  lg: 'max-w-4xl max-h-[80vh] overflow-y-auto',
  xl: 'max-w-6xl max-h-[80vh] overflow-y-auto',
};

export function DetailsWizard({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  onSave,
  onCancel,
  saveLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  saveDisabled = false,
  children,
  size = 'lg',
  showFooter = true,
}: DetailsWizardProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(theme.wizard.content(), sizeClasses[size])} aria-describedby={description ? undefined : "no-description"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className={cn(theme.icon.primary(), "w-5 h-5")} />}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className={theme.text.secondary()}>
              {description}
            </DialogDescription>
          )}
          {!description && <DialogDescription id="no-description" className="sr-only">No description available</DialogDescription>}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {showFooter && (
          <DialogFooter>
            {onCancel && (
              <Button 
                variant="outline" 
                onClick={onCancel} 
                className="border-input"
              >
                {cancelLabel}
              </Button>
            )}
            {onSave && (
              <Button 
                onClick={onSave}
                disabled={saveDisabled}
              >
                {saveLabel}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}