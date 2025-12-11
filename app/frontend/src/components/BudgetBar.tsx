import { useState } from 'react';
import { Circle } from 'lucide-react';
import { useNeon } from '../contexts/NeonContext';

interface BudgetSegment {
  id: number | string;
  name: string;
  value: number;
  color: string;
  isRemaining?: boolean;
  onClick?: () => void;
}

interface BudgetBarProps {
  segments: BudgetSegment[];
  totalBudget: number;
  height?: string;
  showLegend?: boolean;
}

export function BudgetBar({ segments, totalBudget, height = 'h-12', showLegend = true }: BudgetBarProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | string | null>(null);
  const { neonIntensity } = useNeon();

  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  return (
    <div className="space-y-3">
      {/* Stacked Bar */}
      <div 
        className={`relative ${height} bg-muted rounded-lg overflow-visible flex border border-border`}
        style={{
          filter: neonIntensity > 0 
            ? `drop-shadow(0 0 ${8 * neonIntensity}px rgba(255, 255, 255, ${0.15 * neonIntensity})) drop-shadow(0 0 ${16 * neonIntensity}px rgba(255, 255, 255, ${0.08 * neonIntensity}))`
            : 'none'
        }}
      >
        {segments.map((segment, index) => {
          const percentage = (segment.value / total) * 100;
          const isHovered = hoveredSegment === segment.id;
          const isFirst = index === 0;
          const isLast = index === segments.length - 1;
          
          return (
            <div
              key={segment.id}
              className={`relative transition-all duration-200 ${segment.onClick && !segment.isRemaining ? 'cursor-pointer' : ''} ${isFirst ? 'rounded-l-lg' : ''} ${isLast ? 'rounded-r-lg' : ''}`}
              style={{
                width: `${percentage}%`,
                backgroundColor: segment.color,
                boxShadow: isHovered && neonIntensity > 0 
                  ? `0 0 ${8 * neonIntensity}px ${segment.color}, inset 0 0 ${10 * neonIntensity}px ${segment.color}60` 
                  : 'none',
                filter: isHovered ? 'brightness(125%)' : 'brightness(100%)',
              }}
              onMouseEnter={() => setHoveredSegment(segment.id)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={segment.onClick}
            >
              {/* Segment border between slices */}
              {index > 0 && (
                <div 
                  className="absolute left-0 top-0 bottom-0 w-[1px]"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  }}
                />
              )}

              {/* Hover tooltip - positioned above the segment */}
              {isHovered && (
                <div 
                  className="absolute left-1/2 bottom-full mb-2 pointer-events-none z-[9999] transition-all duration-200"
                  style={{ 
                    transform: 'translateX(-50%) scale(1)',
                    opacity: 1,
                  }}
                >
                  <div 
                    className="bg-card border rounded-lg px-4 py-3 shadow-xl whitespace-nowrap"
                    style={{ 
                      borderColor: segment.color,
                      boxShadow: neonIntensity > 0
                        ? `0 0 ${30 * neonIntensity}px ${segment.color}80, 0 10px 40px rgba(0,0,0,0.5)`
                        : '0 10px 40px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div className="text-sm font-medium mb-2" style={{ color: segment.color }}>
                      {segment.name}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium" style={{ color: segment.color }}>
                          ${segment.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Of Limit:</span>
                        <span className="text-foreground">{((segment.value / totalBudget) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    {segment.onClick && !segment.isRemaining && (
                      <div className="text-xs text-primary mt-3 pt-2 border-t border-primary/30 text-center">
                        Click for more details
                      </div>
                    )}
                  </div>
                  
                  {/* Arrow pointer */}
                  <div 
                    className="absolute left-1/2 top-full transform -translate-x-1/2"
                    style={{
                      marginTop: '-1px',
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderTop: `8px solid ${segment.color}`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Minimal Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {segments.map((segment) => (
            <div 
              key={segment.id} 
              className={`flex items-center gap-1.5 ${segment.onClick && !segment.isRemaining ? 'cursor-pointer hover:text-foreground transition-colors' : ''}`}
              onClick={segment.onClick}
              onMouseEnter={() => setHoveredSegment(segment.id)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <Circle 
                className="w-2.5 h-2.5 flex-shrink-0"
                style={{ fill: segment.color, color: segment.color }}
              />
              <span className="truncate">
                {segment.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}