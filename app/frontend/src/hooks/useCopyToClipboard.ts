/**
 * Copy to Clipboard Hook
 * 
 * Provides clipboard functionality with fallback support for older browsers.
 * Includes success/error toast notifications.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';

export function useCopyToClipboard() {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const copyToClipboard = useCallback(
    async (text: string, successMessage?: string) => {
      try {
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          setCopiedValue(text);
          toast.success(successMessage || 'Copied to clipboard!');
          setTimeout(() => setCopiedValue(null), 2000);
          return true;
        }

        // Fallback method for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (success) {
          setCopiedValue(text);
          toast.success(successMessage || 'Copied to clipboard!');
          setTimeout(() => setCopiedValue(null), 2000);
          return true;
        }

        throw new Error('Copy command failed');
      } catch (err) {
        toast.error('Failed to copy to clipboard');
        console.error('Failed to copy:', err);
        return false;
      }
    },
    []
  );

  return {
    copyToClipboard,
    copiedValue,
    isCopied: (value: string) => copiedValue === value,
  };
}