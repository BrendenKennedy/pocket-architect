import { Search, LayoutDashboard, FolderKanban, Box, Camera, DollarSign, Settings as SettingsIcon, User } from 'lucide-react';
import { Input } from './ui/input';
import type { Page } from '../App';

interface SidebarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
}

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects' as Page, label: 'Projects', icon: FolderKanban },
    { id: 'blueprints' as Page, label: 'Blueprints', icon: Box },
    { id: 'snapshots' as Page, label: 'Snapshots', icon: Camera },
    { id: 'cost' as Page, label: 'Cost Management', icon: DollarSign },
    { id: 'settings' as Page, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-[260px] bg-[#1E1E1E] border-r border-gray-800 flex flex-col">
      {/* Logo & Branding */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] rounded-lg flex items-center justify-center">
            <Box className="w-6 h-6" />
          </div>
          <span className="text-lg">Pocket Architect</span>
        </div>
      </div>

      {/* Global Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search..."
            className="pl-10 bg-[#0F0F0F] border-gray-700 focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                isActive
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0F0F0F] hover:bg-[#2A2A2A] transition-colors cursor-pointer">
          <div className="w-8 h-8 bg-[#8B5CF6] rounded-full flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm">Architect</div>
            <div className="text-xs text-gray-400">admin@aws.local</div>
          </div>
        </div>
      </div>
    </div>
  );
}
