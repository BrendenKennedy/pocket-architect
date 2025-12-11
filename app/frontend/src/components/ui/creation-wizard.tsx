import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './dialog';
import { Button } from './button';
import { Check } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { theme, cn } from '@/lib/theme-factory';

interface CreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  currentStep?: number;
  totalSteps?: number;
  stepLabels?: string[];
  onNext?: () => void;
  onPrevious?: () => void;
  onCancel?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  cancelLabel?: string;
  nextDisabled?: boolean;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  noContentWrapper?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl max-h-[80vh] overflow-y-auto',
  lg: 'max-w-4xl max-h-[80vh] overflow-y-auto',
  xl: 'max-w-6xl max-h-[80vh] overflow-y-auto',
};

export function CreationWizard({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  currentStep,
  totalSteps,
  stepLabels,
  onNext,
  onPrevious,
  onCancel,
  nextLabel = 'Next',
  previousLabel = 'Previous',
  cancelLabel = 'Cancel',
  nextDisabled = false,
  children,
  size = 'md',
  noContentWrapper = false,
}: CreationWizardProps) {
  const showProgress = currentStep !== undefined && totalSteps !== undefined && totalSteps > 1;
  const showPrevious = currentStep !== undefined && currentStep > 1 && onPrevious;
  
  // Format description to match "Basic Info - Step 1 of 5" pattern
  const formattedDescription = showProgress && description
    ? `${description} - Step ${currentStep} of ${totalSteps}`
    : description;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(theme.wizard.content(), sizeClasses[size])}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className={cn(theme.icon.primary(), "w-5 h-5")} />}
            {title}
          </DialogTitle>
          <DialogDescription className={theme.text.secondary()}>
            {formattedDescription || ' '}
          </DialogDescription>
        </DialogHeader>

        {showProgress && (
          <div className={theme.wizard.step.container()}>
            {Array.from({ length: totalSteps }).map((_, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;
              
              // Use smaller circles and spacing for wizards with many steps
              const isCompact = totalSteps > 6;
              const circleSize = isCompact ? 'w-6 h-6' : 'w-8 h-8';
              const iconSize = isCompact ? 'w-3 h-3' : 'w-4 h-4';
              const textSize = isCompact ? 'text-xs' : 'text-sm';
              const lineWidth = isCompact ? 'w-4' : 'w-8';
              
              return (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={cn(
                      circleSize,
                      isCompleted ? theme.wizard.step.circle.completed() : 
                      isCurrent ? theme.wizard.step.circle.current() : 
                      theme.wizard.step.circle.upcoming()
                    )}
                  >
                    {isCompleted ? (
                      <Check className={`${iconSize} text-[#0F0F0F]`} />
                    ) : (
                      <span className={textSize}>{stepNumber}</span>
                    )}
                  </div>
                  {stepNumber < totalSteps && (
                    <div
                      className={cn(
                        lineWidth,
                        isCompleted ? theme.wizard.step.line.completed() : theme.wizard.step.line.upcoming()
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {noContentWrapper ? (
          children
        ) : (
          <div className="space-y-4">
            {children}
          </div>
        )}

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
          {showPrevious && (
            <Button 
              variant="outline" 
              onClick={onPrevious} 
              className="border-input"
            >
              {previousLabel}
            </Button>
          )}
          {onNext && (
            <Button 
              onClick={onNext}
              disabled={nextDisabled}
            >
              {nextLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}