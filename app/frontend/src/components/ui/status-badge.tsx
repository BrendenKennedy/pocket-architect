import { StatusNeonDot } from './neon-dot';
import { Badge } from './badge';

/**
 * StatusBadge Component - Centralized status badge with consistent styling
 * 
 * Provides pre-configured status badges with neon dots for consistent visual language
 * across the entire application.
 * 
 * @example
 * // Basic usage
 * <StatusBadge status="running" />
 * 
 * @example
 * // Custom label
 * <StatusBadge status="success" label="Healthy" />
 * 
 * @example
 * // Custom size
 * <StatusBadge status="error" size="lg" />
 */

export type StatusBadgeVariant = 
  // Instance states
  | 'running'
  | 'stopped'
  | 'pending'
  | 'terminated'
  
  // Health states
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  
  // Generic states
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'inactive'
  
  // Operational states
  | 'operational'
  | 'active'
  | 'connected'
  | 'disconnected'
  
  // Progress states
  | 'completed'
  | 'in-progress'
  | 'not-started'
  | 'failed';

export type StatusBadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  /**
   * The status variant to display
   */
  status: StatusBadgeVariant;
  
  /**
   * Optional custom label. If not provided, uses default label for status
   */
  label?: string;
  
  /**
   * Size of the badge
   * @default 'md'
   */
  size?: StatusBadgeSize;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Configuration for each status variant
 */
const statusConfig: Record<StatusBadgeVariant, {
  label: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  neonStatus: 'success' | 'warning' | 'error' | 'info' | 'inactive' | 'operational' | 'active' | 'connected';
}> = {
  // Instance states
  running: {
    label: 'Running',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    neonStatus: 'success',
  },
  stopped: {
    label: 'Stopped',
    borderColor: 'border-gray-500/50',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-500',
    neonStatus: 'inactive',
  },
  pending: {
    label: 'Pending',
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-500',
    neonStatus: 'warning',
  },
  terminated: {
    label: 'Terminated',
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    neonStatus: 'error',
  },
  
  // Health states
  healthy: {
    label: 'Healthy',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    neonStatus: 'success',
  },
  degraded: {
    label: 'Degraded',
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-500',
    neonStatus: 'warning',
  },
  unhealthy: {
    label: 'Unhealthy',
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    neonStatus: 'error',
  },
  
  // Generic states
  success: {
    label: 'Success',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    neonStatus: 'success',
  },
  warning: {
    label: 'Warning',
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-500',
    neonStatus: 'warning',
  },
  error: {
    label: 'Error',
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    neonStatus: 'error',
  },
  info: {
    label: 'Info',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    neonStatus: 'info',
  },
  inactive: {
    label: 'Inactive',
    borderColor: 'border-gray-500/50',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-500',
    neonStatus: 'inactive',
  },
  
  // Operational states
  operational: {
    label: 'Operational',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    neonStatus: 'operational',
  },
  active: {
    label: 'Active',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    neonStatus: 'active',
  },
  connected: {
    label: 'Connected',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    neonStatus: 'connected',
  },
  disconnected: {
    label: 'Disconnected',
    borderColor: 'border-gray-500/50',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-500',
    neonStatus: 'inactive',
  },
  
  // Progress states
  completed: {
    label: 'Completed',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    neonStatus: 'success',
  },
  'in-progress': {
    label: 'In Progress',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    neonStatus: 'info',
  },
  'not-started': {
    label: 'Not Started',
    borderColor: 'border-gray-500/50',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-500',
    neonStatus: 'inactive',
  },
  failed: {
    label: 'Failed',
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    neonStatus: 'error',
  },
};

/**
 * Size configurations
 */
const sizeConfig: Record<StatusBadgeSize, {
  padding: string;
  textSize: string;
  dotSize: 'xs' | 'sm' | 'md';
}> = {
  sm: {
    padding: 'px-1.5 py-0.5',
    textSize: 'text-xs',
    dotSize: 'xs',
  },
  md: {
    padding: 'px-2 py-1',
    textSize: 'text-sm',
    dotSize: 'sm',
  },
  lg: {
    padding: 'px-3 py-1.5',
    textSize: 'text-base',
    dotSize: 'md',
  },
};

export function StatusBadge({
  status,
  label,
  size = 'md',
  className = ''
}: StatusBadgeProps) {
  // Handle undefined or invalid status gracefully
  const validStatus = status && statusConfig[status] ? status : 'inactive';
  const config = statusConfig[validStatus];
  const sizeStyles = sizeConfig[size];

  if (!config) {
    console.warn(`Unknown status badge variant: ${status}`);
    return null;
  }
  
  const displayLabel = label || config.label;
  
  return (
    <div 
      className={`
        inline-flex items-center gap-1.5 rounded w-fit
        ${sizeStyles.padding}
        ${config.borderColor} 
        ${config.bgColor} 
        ${config.textColor}
        ${sizeStyles.textSize}
        border
        ${className}
      `}
    >
      <StatusNeonDot 
        status={config.neonStatus} 
        size={sizeStyles.dotSize}
      />
      <span>{displayLabel}</span>
    </div>
  );
}

/**
 * Convenience components for common status badges
 */
export const RunningBadge = () => <StatusBadge status="running" />;
export const StoppedBadge = () => <StatusBadge status="stopped" />;
export const HealthyBadge = () => <StatusBadge status="healthy" />;
export const CompletedBadge = () => <StatusBadge status="completed" />;
export const InProgressBadge = () => <StatusBadge status="in-progress" />;
export const NotStartedBadge = () => <StatusBadge status="not-started" />;