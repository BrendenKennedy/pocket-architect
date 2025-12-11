/**
 * Pocket Architect Neon Dot Component
 * 
 * Single source of truth for all glowing circle indicators in the application.
 * Used for: project color dots, status indicators, badge icons, etc.
 * 
 * Ensures visual consistency across:
 * - Dashboard status badges
 * - Project color indicators
 * - Cost management warnings
 * - Account status
 * - Table row indicators
 */

import { Circle } from 'lucide-react';
import { useNeon } from '../../contexts/NeonContext';

export interface NeonDotProps {
  /** Color of the dot (hex, rgb, or CSS color name) */
  color: string;
  
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  
  /** Whether the dot is filled */
  filled?: boolean;
  
  /** Additional CSS class names */
  className?: string;
  
  /** Optional tooltip text */
  tooltip?: string;
  
  /** Glow intensity multiplier (0-2, default 1) */
  glowIntensity?: number;
  
  /** Whether to animate on hover */
  animateOnHover?: boolean;
}

const sizeClasses = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

/**
 * NeonDot - Universal glowing circle indicator
 * 
 * @example
 * // Status badge
 * <NeonDot color="#22C55E" size="sm" />
 * 
 * @example
 * // Project color with tooltip
 * <NeonDot color={project.color} size="md" tooltip={project.name} animateOnHover />
 * 
 * @example
 * // Warning indicator
 * <NeonDot color="#EAB308" size="xs" glowIntensity={1.5} />
 */
export function NeonDot({
  color,
  size = 'md',
  filled = true,
  className = '',
  tooltip,
  glowIntensity = 1,
  animateOnHover = false,
}: NeonDotProps) {
  const { neonIntensity } = useNeon();
  const sizeClass = sizeClasses[size];
  const hoverClass = animateOnHover ? 'transition-all duration-200 group-hover/dot:scale-125' : '';
  
  // Calculate glow filter based on intensity - now responds to global neon setting
  const effectiveIntensity = glowIntensity * neonIntensity;
  const glowFilter = filled && neonIntensity > 0
    ? `drop-shadow(0 0 ${6 * effectiveIntensity}px ${color}CC) drop-shadow(0 0 ${12 * effectiveIntensity}px ${color}99)`
    : 'none';
  
  const dot = (
    <Circle
      className={`${sizeClass} ${hoverClass} ${filled ? 'fill-current' : 'fill-transparent'} ${className}`}
      style={{
        color: color,
        stroke: filled ? color : '#3F3F46',
        strokeWidth: filled ? 0 : 1,
        filter: glowFilter,
      }}
    />
  );
  
  // If tooltip is provided, wrap in a tooltip container
  if (tooltip) {
    return (
      <div className="relative group/dot inline-flex">
        {dot}
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none z-50 backdrop-blur-sm border border-primary/20"
          style={{
            boxShadow: neonIntensity > 0 ? `0 0 ${10 * neonIntensity}px ${color}40` : 'none',
          }}
        >
          {tooltip}
        </div>
      </div>
    );
  }
  
  return dot;
}

/**
 * StatusNeonDot - Pre-configured dot for status indicators
 * Automatically applies the correct color based on status type
 */
export interface StatusNeonDotProps {
  status: 'success' | 'active' | 'operational' | 'connected' | 'warning' | 'error' | 'stopped' | 'info' | 'neutral';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const statusColors = {
  success: '#22C55E',
  active: '#22C55E',
  operational: '#22C55E',
  connected: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  stopped: '#EF4444',
  info: '#3B82F6',
  neutral: '#6B7280',
};

export function StatusNeonDot({ status, size = 'sm', className }: StatusNeonDotProps) {
  return <NeonDot color={statusColors[status]} size={size} className={className} />;
}

/**
 * ProjectColorDot - Pre-configured dot for project color indicators
 * Includes tooltip and hover animation by default
 */
export interface ProjectColorDotProps {
  color: string;
  projectName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProjectColorDot({ color, projectName, size = 'md', className }: ProjectColorDotProps) {
  return (
    <NeonDot 
      color={color} 
      size={size} 
      tooltip={projectName} 
      animateOnHover 
      className={className}
    />
  );
}