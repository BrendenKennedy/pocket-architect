// ============================================================================
// POCKET ARCHITECT - CRUD CONFIGURATION TYPES
// ============================================================================
// TypeScript interfaces for configuration-driven CRUD components
// ============================================================================

import { LucideIcon } from 'lucide-react';

// ============================================================================
// TABLE CONFIGURATION
// ============================================================================

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableAction<T> {
  icon: LucideIcon;
  label: string;
  onClick: (item: T) => void;
  tooltip?: string;
  condition?: (item: T) => boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
}

// ============================================================================
// FORM CONFIGURATION
// ============================================================================

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number' | 'password' | 'email';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
  helpText?: string;
  disabled?: boolean;
  defaultValue?: any;
}

export interface FormSectionConfig {
  title?: string;
  fields: FormFieldConfig[];
  columns?: 1 | 2 | 3;
}

// ============================================================================
// WIZARD CONFIGURATION
// ============================================================================

export interface WizardStepConfig {
  title: string;
  description?: string;
  sections: FormSectionConfig[];
  validation?: (data: Record<string, any>) => string | null;
  onStepEnter?: (data: Record<string, any>) => void;
  onStepLeave?: (data: Record<string, any>) => void;
}

// ============================================================================
// CRUD PAGE CONFIGURATION
// ============================================================================

export interface CrudTabConfig<T = any> {
  key: string;
  label: string;
  icon?: LucideIcon;

  // Data management
  api: {
    list: () => Promise<T[]>;
    create: (data: any) => Promise<T>;
    update: (id: string | number, data: any) => Promise<T>;
    delete: (id: string | number) => Promise<void>;
  };

  // Table configuration
  table: {
    columns: TableColumn<T>[];
    actions: TableAction<T>[];
    getRowId: (item: T) => string | number;
    emptyState?: {
      title: string;
      description: string;
      action?: {
        label: string;
        onClick: () => void;
      };
    };
  };

  // Creation wizard
  wizard: {
    title: string;
    steps: WizardStepConfig[];
    initialData?: Record<string, any>;
    onComplete?: (data: Record<string, any>) => Promise<void>;
    onCancel?: () => void;
  };

  // Filtering and search
  filters?: {
    searchFields: (keyof T)[];
    filterOptions?: {
      key: string;
      label: string;
      options: { value: string; label: string }[];
    }[];
  };

  // Permissions
  permissions?: {
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
  };
}

export interface CrudPageConfig<T = any> {
  // Page metadata
  title: string;
  icon: LucideIcon;
  description?: string;

  // Single-tab configuration (backward compatibility)
  api?: {
    list: () => Promise<T[]>;
    create: (data: any) => Promise<T>;
    update: (id: string | number, data: any) => Promise<T>;
    delete: (id: string | number) => Promise<void>;
  };

  table?: {
    columns: TableColumn<T>[];
    actions: TableAction<T>[];
    getRowId: (item: T) => string | number;
    emptyState?: {
      title: string;
      description: string;
      action?: {
        label: string;
        onClick: () => void;
      };
    };
  };

  wizard?: {
    title: string;
    steps: WizardStepConfig[];
    initialData?: Record<string, any>;
    onComplete?: (data: Record<string, any>) => Promise<void>;
    onCancel?: () => void;
  };

  filters?: {
    searchFields: (keyof T)[];
    filterOptions?: {
      key: string;
      label: string;
      options: { value: string; label: string }[];
    }[];
  };

  permissions?: {
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
  };

  // Multi-tab configuration
  tabs?: CrudTabConfig[];
  defaultTab?: string;

  // Custom hooks
  hooks?: {
    useData?: () => { data: T[]; loading: boolean; refetch: () => void };
    useFilters?: () => any;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CrudOperation = 'create' | 'read' | 'update' | 'delete';

export interface CrudState<T> {
  data: T[];
  loading: boolean;
  selectedItem: T | null;
  operation: CrudOperation | null;
  wizardOpen: boolean;
  detailsOpen: boolean;
}