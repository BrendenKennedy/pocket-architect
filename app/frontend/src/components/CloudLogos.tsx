/**
 * Cloud Provider Logo Components
 *
 * Using Lucide Cloud icons with brand colors
 */

import React from 'react';
import { Cloud } from 'lucide-react';

export const AWSLogo: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <Cloud className={className} style={{ color: '#FF9900' }} />
);

export const AzureLogo: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <Cloud className={className} style={{ color: '#0078D4' }} />
);

export const GCPLogo: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <Cloud className={className} style={{ color: '#FFFFFF' }} />
);