/**
 * Wizard State Management Hook
 * 
 * Provides standardized state and navigation for multi-step wizards.
 * Handles step progression, validation gates, and completion/cancellation.
 */

import { useState, useCallback } from 'react';

interface UseWizardOptions {
  totalSteps: number;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function useWizard({ 
  totalSteps, 
  onComplete, 
  onCancel 
}: UseWizardOptions) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Last step - complete wizard
      onComplete?.();
      close();
    }
  }, [currentStep, totalSteps, onComplete]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const open = useCallback(() => {
    setIsOpen(true);
    setCurrentStep(1);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCurrentStep(1);
  }, []);

  const cancel = useCallback(() => {
    onCancel?.();
    close();
  }, [onCancel, close]);

  return {
    // State
    currentStep,
    isOpen,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === totalSteps,
    
    // Actions
    nextStep,
    previousStep,
    goToStep,
    open,
    close,
    cancel,
    setIsOpen,
  };
}