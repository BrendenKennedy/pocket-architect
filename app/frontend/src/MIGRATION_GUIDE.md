# Migration Guide - Before & After Comparison

## Overview
This guide shows the before-and-after transformation of components using the new refactored architecture.

## Code Comparison

### Before: Traditional Component Structure

```tsx
// OLD: Projects_new.tsx (simplified excerpt)
export function Projects() {
  // ~40 lines of state management
  const [projects, setProjects] = useState(mockProjects);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  // ... many more state variables

  // ~30 lines of filtering logic
  const filteredProjects = useMemo(() => {
    let result = projects;
    
    if (filterValue !== 'all') {
      result = result.filter(p => p.status === filterValue);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [projects, searchQuery, filterValue]);

  // ~40 lines of wizard management
  const handleNextStep = () => {
    if (createStep < 2) {
      setCreateStep(createStep + 1);
    } else {
      toast.success('Project created!');
      setCreateOpen(false);
      setCreateStep(0);
      resetForm();
    }
  };

  const handlePrevStep = () => {
    if (createStep > 0) {
      setCreateStep(createStep - 1);
    }
  };

  // ~80 lines of JSX layout
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <h2>Projects</h2>
        <Button variant="ghost" size="icon" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <Select value={filterValue} onValueChange={setFilterValue}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable data={filteredProjects} columns={columns} actions={actions} />
    </div>
  );
}
```

### After: Refactored Component Structure

```tsx
// NEW: Projects_refactored.tsx
export function Projects() {
  // ~10 lines of state management (75% reduction!)
  const [projects] = useState(mockProjects);
  
  // Replace ~30 lines with one hook
  const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = 
    useDataFilters({
      data: projects,
      searchFields: ['name', 'description', 'vpc'],
      filterFn: (item, filter) => item.status === filter,
    });

  // Replace ~40 lines with one hook
  const createWizard = useWizard({
    totalSteps: 3,
    onComplete: () => {
      toast.success('Project created!');
      resetForm();
    },
  });

  const detailsDialog = useDialog<Project>();

  // Form state (unchanged)
  const [projectName, setProjectName] = useState('');
  // ...

  // ~20 lines of JSX (75% reduction!)
  return (
    <PageLayout>
      <PageHeader title="Projects" icon={FolderOpen} onRefresh={handleRefresh} />
      
      <ActionBar
        onCreateClick={createWizard.open}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        filterOptions={filterOptions}
      />

      <DataTable data={filteredData} columns={columns} actions={actions} />
    </PageLayout>
  );
}
```

## Line Count Comparison

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| **State Management** | ~40 lines | ~10 lines | **75%** |
| **Filter Logic** | ~30 lines | 1 hook call | **97%** |
| **Wizard Management** | ~40 lines | 1 hook call | **98%** |
| **Layout JSX** | ~80 lines | ~20 lines | **75%** |
| **Total Boilerplate** | ~190 lines | ~30 lines | **84%** |

## Step-by-Step Migration Process

### Step 1: Add Imports

```tsx
// Add these imports at the top
import { PageLayout } from './ui/page-layout';
import { PageHeader } from './ui/page-header';
import { ActionBar } from './ui/action-bar';
import { useDataFilters, useWizard, useDialog } from '../hooks';
```

### Step 2: Replace State Management

**Before:**
```tsx
const [searchQuery, setSearchQuery] = useState('');
const [filterValue, setFilterValue] = useState('all');
const filteredData = useMemo(() => { /* complex logic */ }, [deps]);
```

**After:**
```tsx
const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData } = 
  useDataFilters({
    data: items,
    searchFields: ['name', 'description'],
    filterFn: (item, filter) => item.status === filter,
  });
```

### Step 3: Replace Wizard State

**Before:**
```tsx
const [wizardOpen, setWizardOpen] = useState(false);
const [currentStep, setCurrentStep] = useState(1);

const handleNext = () => {
  if (currentStep < totalSteps) {
    setCurrentStep(currentStep + 1);
  } else {
    // Complete logic
    toast.success('Done!');
    setWizardOpen(false);
    setCurrentStep(1);
  }
};

const handlePrev = () => {
  if (currentStep > 1) {
    setCurrentStep(currentStep - 1);
  }
};
```

**After:**
```tsx
const wizard = useWizard({
  totalSteps: 3,
  onComplete: () => toast.success('Done!'),
});

// Use: wizard.open(), wizard.nextStep(), wizard.previousStep(), etc.
```

### Step 4: Replace Dialog State

**Before:**
```tsx
const [dialogOpen, setDialogOpen] = useState(false);
const [dialogData, setDialogData] = useState<ItemType | null>(null);

const handleOpenDialog = (item: ItemType) => {
  setDialogData(item);
  setDialogOpen(true);
};
```

**After:**
```tsx
const dialog = useDialog<ItemType>();

// Use: dialog.open(item)
// In JSX: open={dialog.isOpen} data={dialog.data}
```

### Step 5: Replace Page Layout

**Before:**
```tsx
return (
  <div className="p-8">
    <div className="flex items-center justify-between mb-4">
      <h2>Page Title</h2>
      <Button variant="ghost" size="icon" onClick={handleRefresh}>
        <RefreshCw className="w-4 h-4" />
      </Button>
    </div>
    {/* ... */}
  </div>
);
```

**After:**
```tsx
return (
  <PageLayout>
    <PageHeader title="Page Title" onRefresh={handleRefresh} />
    {/* ... */}
  </PageLayout>
);
```

### Step 6: Replace Action Bar

**Before:**
```tsx
<div className="flex items-center justify-between mb-6 gap-4">
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="icon" onClick={handleCreate}>
      <Plus className="w-4 h-4" />
    </Button>
  </div>
  <div className="flex-1 max-w-md">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" />
      <Input 
        placeholder="Search..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  </div>
  <Select value={filterValue} onValueChange={setFilterValue}>
    {/* ... */}
  </Select>
</div>
```

**After:**
```tsx
<ActionBar
  onCreateClick={handleCreate}
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  filterValue={filterValue}
  onFilterChange={setFilterValue}
  filterOptions={options}
/>
```

## Common Patterns

### Pattern 1: Simple Page (Search + Filter)

```tsx
export function MyPage() {
  const [data] = useState(mockData);
  
  const filters = useDataFilters({
    data,
    searchFields: ['name', 'description'],
    filterFn: (item, filter) => item.category === filter,
  });

  return (
    <PageLayout>
      <PageHeader title="My Page" onRefresh={() => toast.success('Refreshed')} />
      <ActionBar {...filters} filterOptions={categoryOptions} />
      <DataTable data={filters.filteredData} columns={columns} actions={actions} />
    </PageLayout>
  );
}
```

### Pattern 2: Page with Creation Wizard

```tsx
export function MyPage() {
  const [data] = useState(mockData);
  const filters = useDataFilters({ /* ... */ });
  const wizard = useWizard({
    totalSteps: 3,
    onComplete: () => toast.success('Created!'),
  });

  return (
    <PageLayout>
      <PageHeader title="My Page" />
      <ActionBar onCreateClick={wizard.open} {...filters} />
      <DataTable data={filters.filteredData} columns={columns} />
      
      <CreationWizard
        open={wizard.isOpen}
        onOpenChange={wizard.setIsOpen}
        currentStep={wizard.currentStep}
        onNext={wizard.nextStep}
        onPrevious={wizard.previousStep}
        onCancel={wizard.cancel}
      >
        {renderStep()}
      </CreationWizard>
    </PageLayout>
  );
}
```

### Pattern 3: Page with Details Dialog

```tsx
export function MyPage() {
  const [data] = useState(mockData);
  const filters = useDataFilters({ /* ... */ });
  const dialog = useDialog<ItemType>();

  const actions: TableAction<ItemType>[] = [
    {
      icon: Eye,
      label: 'View',
      onClick: (item) => dialog.open(item),
    },
  ];

  return (
    <PageLayout>
      <PageHeader title="My Page" />
      <ActionBar {...filters} />
      <DataTable data={filters.filteredData} columns={columns} actions={actions} />
      
      <ItemDetailsDialog
        open={dialog.isOpen}
        onOpenChange={dialog.setIsOpen}
        item={dialog.data}
      />
    </PageLayout>
  );
}
```

## Migration Checklist

For each component:

- [ ] **Import new components and hooks**
  - [ ] PageLayout, PageHeader, ActionBar
  - [ ] useDataFilters, useWizard, useDialog

- [ ] **Replace state management**
  - [ ] Replace search/filter state with useDataFilters
  - [ ] Replace wizard state with useWizard
  - [ ] Replace dialog state with useDialog

- [ ] **Update JSX structure**
  - [ ] Wrap in PageLayout
  - [ ] Replace header with PageHeader
  - [ ] Replace action bar with ActionBar
  - [ ] Update wizard props to use wizard hook
  - [ ] Update dialog props to use dialog hook

- [ ] **Test functionality**
  - [ ] Search works
  - [ ] Filter works
  - [ ] Create/edit wizards work
  - [ ] Details dialogs work
  - [ ] All actions work

- [ ] **Clean up**
  - [ ] Remove old state variables
  - [ ] Remove old handler functions
  - [ ] Remove unused imports
  - [ ] Run linter

## Benefits Achieved

### 1. Consistency
✅ All pages have identical structure  
✅ Predictable patterns throughout codebase  
✅ Easy to navigate between components

### 2. Maintainability
✅ Fix bugs in one place, benefits all components  
✅ Update UI once, applies everywhere  
✅ Clear separation of concerns

### 3. Developer Experience
✅ Less code to write  
✅ Less code to read  
✅ Faster development

### 4. Performance
✅ Proper memoization in hooks  
✅ Optimized re-renders  
✅ Better React DevTools experience

## Troubleshooting

### Issue: "filteredData is undefined"
**Solution:** Make sure you're destructuring the correct property:
```tsx
const { filteredData } = useDataFilters({ ... });
// Not: const { filtered } = useDataFilters({ ... });
```

### Issue: "wizard.open is not a function"
**Solution:** Make sure you're using the wizard hook:
```tsx
const wizard = useWizard({ ... });
// Not: const { wizard } = useWizard({ ... });
```

### Issue: "Filter not working"
**Solution:** Make sure your filterFn returns a boolean:
```tsx
filterFn: (item, filter) => item.status === filter,
// Not: filterFn: (item, filter) => { item.status === filter }
```

## Next Steps

1. Start with Instances (already done - see Instances_refactored.tsx)
2. Migrate Projects (see Projects_refactored.tsx)
3. Migrate Blueprints (see Blueprints_refactored.tsx)
4. Migrate Images (see Images_refactored.tsx)
5. Migrate Security
6. Test thoroughly
7. Remove old files
