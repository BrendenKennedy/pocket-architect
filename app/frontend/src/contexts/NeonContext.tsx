/**
 * Neon Glow Context
 * 
 * Provides global neon glow intensity control for the application.
 * Used to create the signature purple neon aesthetic on status badges,
 * connection indicators, and interactive elements.
 * 
 * User-configurable intensity from Settings page (0-200%).
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

interface NeonContextType {
  neonIntensity: number;
  setNeonIntensity: (value: number) => void;
  getNeonGlow: (color: string) => string;
}

const NeonContext = createContext<NeonContextType | undefined>(undefined);

export function NeonProvider({ children }: { children: React.ReactNode }) {
  // Load from localStorage or default to 1.0 (100%)
  const [neonIntensity, setNeonIntensityState] = useState<number>(() => {
    const saved = localStorage.getItem('neonIntensity');
    return saved ? parseFloat(saved) : 1.0;
  });

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('neonIntensity', neonIntensity.toString());
  }, [neonIntensity]);

  const setNeonIntensity = (value: number) => {
    setNeonIntensityState(Math.max(0, Math.min(2, value))); // Clamp between 0 and 2
  };

  // Generate glow filter based on intensity and color
  const getNeonGlow = (color: string) => {
    if (neonIntensity === 0) return 'none';
    
    // Match the subtle glow of the Live/Operational badges
    const blur1 = 2 * neonIntensity;  // Reduced to match Live button
    const blur2 = 4 * neonIntensity;  // Reduced to match Live button
    
    // Lower opacity values to match the subtle Live button glow
    const opacity1 = Math.round(96 * neonIntensity).toString(16).padStart(2, '0'); // ~38% opacity
    const opacity2 = Math.round(64 * neonIntensity).toString(16).padStart(2, '0'); // ~25% opacity
    
    return `drop-shadow(0 0 ${blur1}px ${color}${opacity1}) drop-shadow(0 0 ${blur2}px ${color}${opacity2})`;
  };

  return (
    <NeonContext.Provider value={{ neonIntensity, setNeonIntensity, getNeonGlow }}>
      {children}
    </NeonContext.Provider>
  );
}

export function useNeon() {
  const context = useContext(NeonContext);
  if (context === undefined) {
    throw new Error('useNeon must be used within a NeonProvider');
  }
  return context;
}