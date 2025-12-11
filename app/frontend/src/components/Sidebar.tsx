/**
 * Sidebar Navigation Component
 * 
 * Left sidebar navigation for main application pages.
 * Includes collapsible state and active page highlighting.
 */

import { LayoutDashboard, FolderKanban, Box, HardDrive, DollarSign, Settings as SettingsIcon, User, Shield, BookOpen } from 'lucide-react';
import type { Page } from '../App';
import { useState } from 'react';

interface SidebarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
}

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects' as Page, label: 'Projects', icon: FolderKanban },
    { id: 'blueprints' as Page, label: 'Blueprints', icon: Box },
    { id: 'security' as Page, label: 'Security', icon: Shield },
    { id: 'images' as Page, label: 'Images', icon: HardDrive },
    { id: 'cost' as Page, label: 'Costs', icon: DollarSign },
    { id: 'learning' as Page, label: 'Learning', icon: BookOpen },
  ];

  const handleSidebarClick = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleButtonClick = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  return (
    <div 
      onClick={handleSidebarClick}
      className={`${isCollapsed ? 'w-[72px]' : 'w-[180px]'} bg-card border-r border-border flex flex-col h-full overflow-y-auto flex-shrink-0 transition-all duration-300 relative cursor-pointer`}
    >
      {/* Navigation - Top */}
      <nav className="px-2 py-2 pt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={(e) => handleButtonClick(e, () => onPageChange(item.id))}
              className={`w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg mb-1 transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
              {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Settings and User Profile */}
      <div className="p-3 border-t border-border">
        {/* Settings Button */}
        <button
          onClick={(e) => handleButtonClick(e, () => onPageChange('settings'))}
          className={`w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg transition-all ${
            activePage === 'settings'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <SettingsIcon className="w-6 h-6 flex-shrink-0" />
          {!isCollapsed && <span className="text-[14px]">Settings</span>}
        </button>
      </div>
    </div>
  );
}