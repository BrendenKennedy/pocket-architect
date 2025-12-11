import { Plus, Search, Filter } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface FilterOption {
  value: string;
  label: string;
}

interface ActionBarProps {
  // Create button
  onCreateClick?: () => void;
  createLabel?: string;
  showCreateButton?: boolean;
  
  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  
  // Filter
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: FilterOption[];
  filterPlaceholder?: string;
  showFilter?: boolean;
  
  // Additional actions
  additionalActions?: React.ReactNode;
}

export function ActionBar({
  onCreateClick,
  createLabel = 'Create',
  showCreateButton = true,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showSearch = true,
  filterValue = 'all',
  onFilterChange,
  filterOptions = [],
  filterPlaceholder = 'Filter',
  showFilter = true,
  additionalActions,
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-between mb-6 gap-4">
      {/* Left side - Create button and additional actions */}
      <div className="flex items-center gap-2">
        {showCreateButton && onCreateClick && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCreateClick}
            title={createLabel}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
        {additionalActions}
      </div>

      {/* Middle - Search */}
      {showSearch && (
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-9"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Right side - Filter */}
      {showFilter && filterOptions.length > 0 && (
        <Select value={filterValue} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder={filterPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
