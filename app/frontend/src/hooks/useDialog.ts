/**
 * Dialog State Management Hook
 * 
 * Generic hook for managing dialog/modal open/close state with optional data.
 * Used across all detail dialogs and wizards in the application.
 */

import { useState, useCallback } from 'react';

export function useDialog<T = any>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((dialogData?: T) => {
    if (dialogData) {
      setData(dialogData);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Keep data until next open to prevent flashing
  }, []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    reset,
    setIsOpen,
  };
}