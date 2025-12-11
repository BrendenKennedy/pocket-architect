# Refactoring Architecture

## Overview
This document outlines the standardized architecture for Pocket Architect components, focusing on reusability, consistency, and maintainability.

## Core Principles

### 1. **Single Responsibility**
- Each component should have one clear purpose
- Hooks should handle one specific concern
- Utilities should perform one well-defined task

### 2. **Composition Over Duplication**
- Build complex UIs from simple, reusable components
- Share logic through custom hooks
- Use utility functions for common operations

### 3. **Consistent Patterns**
- All pages follow the same structural pattern
- All wizards use the same state management
- All tables use the same data handling

## Reusable Components

### Layout Components

#### `PageLayout`
**Purpose:** Provides consistent page wrapper with padding
**Usage:**
```tsx
<PageLayout>
  {/* Page content */}
</PageLayout>
```

#### `PageHeader`
**Purpose:** Standardized page header with title, subtitle, icon, and refresh button
**Usage:**
```tsx
<PageHeader
  title="Instances"
  subtitle="Manage your compute instances"
  icon={Server}
  onRefresh={handleRefresh}
  actions={<Button>Custom Action</Button>}
/>
```

#### `ActionBar`
**Purpose:** Standardized action bar with create button, search, and filter
**Usage:**
```tsx
<ActionBar
  onCreateClick={handleCreate}
  createLabel="Create Instance"
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  searchPlaceholder="Search instances..."
  filterValue={filterValue}
  onFilterChange={setFilterValue}
  filterOptions={[
    { value: 'all', label: 'All Status' },
    { value: 'running', label: 'Running' },
  ]}
/>
```

## Custom Hooks

### Data Management Hooks

#### `useDataFilters`
**Purpose:** Combined search and filter functionality
**Usage:**
```tsx
const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = useDataFilters({
  data: items,
  searchFields: ['name', 'description'],
  filterFn: (item, filter) => item.status === filter,
});
```

#### `useSearch`
**Purpose:** Search functionality only
**Usage:**
```tsx
const { searchQuery, setSearchQuery, filteredData } = useSearch({
  data: items,
  searchFields: ['name', 'email'],
});
```

#### `useFilter`
**Purpose:** Filter functionality only
**Usage:**
```tsx
const { filterValue, setFilterValue, filteredData } = useFilter({
  data: items,
  filterFn: (item, filter) => item.category === filter,
});
```

### UI State Hooks

#### `useWizard`
**Purpose:** Wizard/multi-step form state management
**Usage:**
```tsx
const wizard = useWizard({
  totalSteps: 3,
  onComplete: () => toast.success('Completed!'),
  onCancel: () => console.log('Cancelled'),
});

// Use wizard.isOpen, wizard.currentStep, wizard.nextStep, etc.
```

#### `useDialog`
**Purpose:** Dialog state management with optional data
**Usage:**
```tsx
const dialog = useDialog<ItemType>();

// Open with data
dialog.open(item);

// In dialog
<Dialog open={dialog.isOpen} onOpenChange={dialog.setIsOpen}>
  {dialog.data && <div>{dialog.data.name}</div>}
</Dialog>
```

#### `useSelection`
**Purpose:** Multi-select state management
**Usage:**
```tsx
const selection = useSelection<number>();

// Use selection.selectedItems, selection.toggleSelection, etc.
```

### Utility Hooks

#### `useCopyToClipboard`
**Purpose:** Copy to clipboard with toast notification
**Usage:**
```tsx
const { copyToClipboard, isCopied } = useCopyToClipboard();

copyToClipboard('text', 'Custom success message');
```

## Standard Component Structure

### Page Component Pattern

```tsx
export function MyPage() {
  // 1. Data state
  const [data] = useState(mockData);
  
  // 2. Custom hooks
  const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = 
    useDataFilters({ data, searchFields: ['name'], filterFn: ... });
  
  const wizard = useWizard({ totalSteps: 3, onComplete: ... });
  const dialog = useDialog<DataType>();
  
  // 3. Local state
  const [formField, setFormField] = useState('');
  
  // 4. Event handlers
  const handleRefresh = () => { ... };
  const handleCreate = () => wizard.open();
  
  // 5. Table configuration
  const columns: TableColumn<DataType>[] = [ ... ];
  const actions: TableAction<DataType>[] = [ ... ];
  
  // 6. Render helper functions
  const renderWizardStep = () => { ... };
  
  // 7. Main render
  return (
    <PageLayout>
      <PageHeader title="My Page" onRefresh={handleRefresh} />
      <ActionBar ... />
      <DataTable data={filteredData} columns={columns} actions={actions} />
      {/* Dialogs and wizards */}
    </PageLayout>
  );
}
```

## Benefits of This Architecture

### 1. **Reduced Code Duplication**
- Common UI patterns are extracted into reusable components
- Shared logic lives in custom hooks
- No more copy-paste of action bars, headers, etc.

### 2. **Improved Consistency**
- All pages look and behave the same way
- Predictable patterns make the codebase easier to navigate
- New features can be added consistently across all pages

### 3. **Better Maintainability**
- Changes to common components affect all pages automatically
- Bug fixes in hooks benefit all consumers
- Clear separation of concerns makes debugging easier

### 4. **Enhanced Testability**
- Hooks can be tested independently
- Components have clear inputs and outputs
- Easier to write unit and integration tests

### 5. **Improved Developer Experience**
- Less boilerplate code to write
- Clear patterns to follow
- Self-documenting code structure

## Migration Guide

### Converting Existing Components

1. **Replace page wrapper:**
   ```tsx
   // Before
   <div className="p-8">...</div>
   
   // After
   <PageLayout>...</PageLayout>
   ```

2. **Replace header:**
   ```tsx
   // Before
   <div className="flex items-center justify-between mb-4">
     <h2>Title</h2>
     <Button onClick={refresh}><RefreshCw /></Button>
   </div>
   
   // After
   <PageHeader title="Title" onRefresh={refresh} />
   ```

3. **Replace action bar:**
   ```tsx
   // Before
   <div className="flex items-center justify-between mb-6 gap-4">
     <Button onClick={create}><Plus /></Button>
     <Input placeholder="Search..." />
     <Select>...</Select>
   </div>
   
   // After
   <ActionBar
     onCreateClick={create}
     searchValue={query}
     onSearchChange={setQuery}
     filterValue={filter}
     onFilterChange={setFilter}
     filterOptions={options}
   />
   ```

4. **Replace search/filter logic:**
   ```tsx
   // Before
   const [searchQuery, setSearchQuery] = useState('');
   const [filterValue, setFilterValue] = useState('all');
   const filteredData = data.filter(...).filter(...);
   
   // After
   const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = 
     useDataFilters({ data, searchFields: ['name'], filterFn: ... });
   ```

5. **Replace wizard state:**
   ```tsx
   // Before
   const [wizardOpen, setWizardOpen] = useState(false);
   const [currentStep, setCurrentStep] = useState(1);
   const handleNext = () => { ... };
   
   // After
   const wizard = useWizard({ totalSteps: 3, onComplete: ... });
   ```

## Next Steps

1. Refactor remaining components (Projects, Blueprints, Images, Security)
2. Create additional specialized hooks as patterns emerge
3. Document component props and hook return values
4. Add TypeScript documentation comments
5. Create Storybook stories for reusable components
