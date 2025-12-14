import { Shield } from 'lucide-react';
import { CrudPageConfig } from '../types/crud';
import { securityConfigsTab } from './security-configs';
import { keyPairsTab } from './security-keypairs';
import { firewallRulesTab } from './security-firewall';
import { iamRolesTab } from './security-iam';
import { certificatesTab } from './security-certificates';

// ============================================================================
// MAIN SECURITY PAGE CONFIGURATION
// ============================================================================

export const securityPageConfig: CrudPageConfig = {
  title: 'Security',
  icon: Shield,
  description: 'Manage security configurations, keys, firewall rules, IAM roles, and certificates',
  tabs: [
    securityConfigsTab,
    keyPairsTab,
    firewallRulesTab,
    iamRolesTab,
    certificatesTab,
  ],
  defaultTab: 'configurations',
};