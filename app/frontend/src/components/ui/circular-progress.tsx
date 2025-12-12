import { useNeon } from '../../contexts/NeonContext';
import { getResourceColor } from '../../lib/colors';
import { resolveColor } from '../../services/themeService';

interface CircularProgressProps {
  value: number;
  threshold?: number;
  name?: string;
  showThreshold?: boolean;
  size?: number;
  strokeWidth?: number;
  customColor?: string;
  showLabel?: boolean;
  label?: string;
  sublabel?: string;
  onClick?: () => void;
  className?: string;
  id?: string | number;
}

export function CircularProgress({
  value,
  threshold = 100,
  name,
  showThreshold = true,
  size = 144,
  strokeWidth = 16,
  customColor,
  showLabel = true,
  label,
  sublabel,
  onClick,
  className = '',
  id = 'default',
}: CircularProgressProps) {
  const { neonIntensity } = useNeon();

  // Calculate color based on proximity to threshold (if customColor not provided)
  const color = customColor
    ? customColor
    : resolveColor(getResourceColor(value, threshold));
  
  // Circle parameters
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  // Calculate center
  const center = size / 2;
  
  // Scale text size based on circle size
  const getTextSize = () => {
    if (size <= 60) return 'text-base';
    if (size <= 100) return 'text-2xl';
    if (size <= 150) return 'text-4xl';
    return 'text-5xl';
  };
  
  const getNameSize = () => {
    if (size <= 60) return 'text-[9px]';
    if (size <= 100) return 'text-xs';
    if (size <= 150) return 'text-sm';
    return 'text-base';
  };

  return (
    <div 
      className={`flex flex-col items-center ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* SVG circles for progress */}
        <svg 
          className="absolute -inset-4 w-full h-full -rotate-90" 
          viewBox={`0 0 ${size} ${size}`}
          style={{ 
            width: size + 32, 
            height: size + 32,
            left: -16,
            top: -16,
            overflow: 'visible'
          }}
        >
          <defs>
            {/* Radial gradient for center glow that bleeds outward */}
            <radialGradient id={`center-glow-${id}`}>
              <stop offset="0%" stopColor={color} stopOpacity={0.06 * neonIntensity} />
              <stop offset="20%" stopColor={color} stopOpacity={0.04 * neonIntensity} />
              <stop offset="40%" stopColor={color} stopOpacity={0.03 * neonIntensity} />
              <stop offset="60%" stopColor={color} stopOpacity={0.02 * neonIntensity} />
              <stop offset="80%" stopColor={color} stopOpacity={0.01 * neonIntensity} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </radialGradient>
            
            {/* Subtle glow filter for the progress circle line */}
            <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={2 * neonIntensity} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Radial glow from center that extends beyond circle */}
          <circle
            cx={center}
            cy={center}
            r={radius + 8}
            fill={`url(#center-glow-${id})`}
            opacity={neonIntensity > 0 ? 1 : 0}
          />
          
          {/* Static background circle (guideline) - dark gray */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          
          {/* Animated progress circle - colored with rounded ends and subtle glow */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={neonIntensity > 0 ? `url(#glow-${id})` : 'none'}
            style={{
              transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s ease'
            }}
          />
        </svg>
        
        {/* Center value */}
        {showLabel && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center gap-0.5"
            style={{
              filter: neonIntensity > 0
                ? `drop-shadow(0 0 ${4 * neonIntensity}px ${color}20) drop-shadow(0 0 ${2 * neonIntensity}px ${color}30)`
                : 'none',
            }}
          >
            <div 
              className={`${getTextSize()} tracking-wide`} 
              style={{ 
                color, 
                fontFamily: 'Nunito, ui-rounded, system-ui, sans-serif', 
                fontWeight: 900,
                WebkitTextStroke: `1px ${color}`,
                textStroke: `1px ${color}`,
                paintOrder: 'stroke fill',
              }}
            >
              {label || `${value}%`}
            </div>
            {name && (
              <span 
                className={`${getNameSize()} uppercase tracking-wider`} 
                style={{ 
                  color, 
                  fontFamily: 'Nunito, ui-rounded, system-ui, sans-serif', 
                  fontWeight: 900,
                  WebkitTextStroke: `0.75px ${color}`,
                  textStroke: `0.75px ${color}`,
                  paintOrder: 'stroke fill',
                }}
              >
                {name}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Sublabel below circle */}
      {sublabel && (
        <span className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: 'ui-rounded, system-ui, sans-serif' }}>
          {sublabel}
        </span>
      )}
      
      {showThreshold && threshold !== 100 && (
        <div className="mt-3 text-xs text-muted-foreground" style={{ fontFamily: 'ui-rounded, system-ui, sans-serif' }}>
          Threshold at {threshold}%
        </div>
      )}
    </div>
  );
}