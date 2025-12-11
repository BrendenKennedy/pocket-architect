# Quick Reference - Reusable Components & Hooks

## 🎯 Most Common Patterns

### Standard Page Structure
```tsx
import { PageLayout, PageHeader, ActionBar } from './ui';
import { useDataFilters, useWizard, useDialog } from '../hooks';

export function MyPage() {
  const [data] = useState(mockData);
  
  const filters = useDataFilters({
    data,
    searchFields: ['name'],
    filterFn: (item, filter) => item.status === filter,
  });
  
  const wizard = useWizard({ totalSteps: 3, onComplete: handleComplete });
  const dialog = useDialog<DataType>();
  
  return (
    <PageLayout>
      <PageHeader title="My Page" onRefresh={refresh} />
      <ActionBar
        onCreateClick={wizard.open}
        searchValue={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        filterValue={filters.filterValue}
        onFilterChange={filters.setFilterValue}
        filterOptions={options}
      />
      <DataTable data={filters.filteredData} columns={columns} actions={actions} />
    </PageLayout>
  );
}
```

## 📦 Component Imports

```tsx
// Layout components
import { PageLayout } from './ui/page-layout';
import { PageHeader } from './ui/page-header';
import { ActionBar } from './ui/action-bar';

// Or import from hooks index
import { useDataFilters, useWizard, useDialog, useCopyToClipboard } from '../hooks';
```

## 🪝 Hooks Quick Reference

### useDataFilters (Most Common)
```tsx
const { searchQuery, setSearchQuery, filterValue, setFilterValue, filteredData, resetFilters } = 
  useDataFilters({
    data: items,
    searchFields: ['name', 'description', 'category'],
    filterFn: (item, filter) => item.status === filter,
    defaultFilterValue: 'all',
  });
```

### useWizard
```tsx
const wizard = useWizard({
  totalSteps: 3,
  onComplete: () => toast.success('Done!'),
  onCancel: () => console.log('Cancelled'),
});

// Available properties:
wizard.isOpen
wizard.currentStep
wizard.isFirstStep
wizard.isLastStep
wizard.open()
wizard.close()
wizard.nextStep()
wizard.previousStep()
wizard.cancel()
```

### useDialog
```tsx
const dialog = useDialog<ItemType>();

// Open with data
dialog.open(item);

// Use in JSX
<Dialog open={dialog.isOpen} onOpenChange={dialog.setIsOpen}>
  {dialog.data && <div>{dialog.data.name}</div>}
</Dialog>
```

### useCopyToClipboard
```tsx
const { copyToClipboard, isCopied } = useCopyToClipboard();

// Copy with custom message
copyToClipboard('text to copy', 'Copied successfully!');

// Check if copied
{isCopied(value) && <Check />}
```

### useSelection
```tsx
const selection = useSelection<number>();

// Available properties:
selection.selectedItems          // number[]
selection.toggleSelection(id)    // Toggle single item
selection.selectAll(ids)          // Select all items
selection.clearSelection()        // Clear all
selection.isSelected(id)          // Check if selected
selection.hasSelection            // boolean
selection.selectionCount          // number
```

## 🎨 Component Props

### PageHeader
```tsx
<PageHeader
  title="Page Title"                    // Required
  subtitle="Optional description"        // Optional
  icon={ServerIcon}                      // Optional
  onRefresh={handleRefresh}              // Optional
  actions={<Button>Custom</Button>}      // Optional
/>
```

### ActionBar
```tsx
<ActionBar
  // Create button
  onCreateClick={handleCreate}           // Optional
  createLabel="Create Item"              // Optional
  showCreateButton={true}                // Optional
  
  // Search
  searchValue={searchQuery}              // Optional
  onSearchChange={setSearchQuery}        // Optional
  searchPlaceholder="Search..."          // Optional
  showSearch={true}                      // Optional
  
  // Filter
  filterValue={filterValue}              // Optional
  onFilterChange={setFilterValue}        // Optional
  filterOptions={[                       // Optional
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
  ]}
  filterPlaceholder="Filter"             // Optional
  showFilter={true}                      // Optional
  
  // Additional
  additionalActions={<Button />}         // Optional
/>
```

### PageLayout
```tsx
<PageLayout className="custom-class">
  {children}
</PageLayout>
```

## 📋 Common Filter Options Patterns

### Status Filter
```tsx
const filterOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
];
```

### Category Filter
```tsx
const filterOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'security', label: 'Security' },
  { value: 'monitoring', label: 'Monitoring' },
];
```

### Time Range Filter
```tsx
const filterOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];
```

## 🔄 Wizard Pattern

```tsx
// Setup
const wizard = useWizard({
  totalSteps: 3,
  onComplete: () => {
    toast.success('Created!');
    resetForm();
  },
});

// Render helper
const renderWizardStep = () => {
  switch (wizard.currentStep) {
    case 1: return <Step1Form />;
    case 2: return <Step2Form />;
    case 3: return <Step3Review />;
  }
};

// Use in CreationWizard
<CreationWizard
  open={wizard.isOpen}
  onOpenChange={wizard.setIsOpen}
  title="Create Item"
  currentStep={wizard.currentStep}
  totalSteps={3}
  onNext={wizard.nextStep}
  onPrevious={!wizard.isFirstStep ? wizard.previousStep : undefined}
  onCancel={wizard.cancel}
  nextLabel={wizard.isLastStep ? 'Create' : 'Next'}
>
  {renderWizardStep()}
</CreationWizard>
```

## 📊 DataTable Integration

```tsx
// Filter data with useDataFilters
const { filteredData } = useDataFilters({
  data: items,
  searchFields: ['name'],
  filterFn: (item, filter) => item.status === filter,
});

// Pass to DataTable
<DataTable
  data={filteredData}
  columns={columns}
  actions={actions}
  getRowId={(item) => item.id}
/>
```

## 🎯 Common Patterns by Feature

### Search Only (No Filter)
```tsx
import { useSearch } from '../hooks';

const { searchQuery, setSearchQuery, filteredData } = useSearch({
  data: items,
  searchFields: ['name', 'email'],
});

<ActionBar
  showCreateButton={false}
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  showFilter={false}
/>
```

### Filter Only (No Search)
```tsx
import { useFilter } from '../hooks';

const { filterValue, setFilterValue, filteredData } = useFilter({
  data: items,
  filterFn: (item, filter) => item.category === filter,
});

<ActionBar
  showCreateButton={false}
  showSearch={false}
  filterValue={filterValue}
  onFilterChange={setFilterValue}
  filterOptions={options}
/>
```

### No Search or Filter (Create Only)
```tsx
<ActionBar
  onCreateClick={handleCreate}
  showSearch={false}
  showFilter={false}
/>
```

## 💡 Tips & Tricks

### Combine Multiple Filters
```tsx
const { filteredData } = useDataFilters({
  data: items,
  searchFields: ['name'],
  filterFn: (item, filter) => {
    if (filter === 'all') return true;
    if (filter === 'active') return item.status === 'running';
    if (filter === 'inactive') return item.status === 'stopped';
    return item.category === filter;
  },
});
```

### Custom Search Logic
```tsx
const { filteredData } = useDataFilters({
  data: items,
  searchFields: ['name'],
  filterFn: (item, filter) => {
    // Custom filter logic
    const matchesFilter = filter === 'all' || item.status === filter;
    const matchesSearch = /* custom search */;
    return matchesFilter && matchesSearch;
  },
});
```

### Dialog with Complex Data
```tsx
const dialog = useDialog<{ item: Item; mode: 'view' | 'edit' }>();

dialog.open({ item: selectedItem, mode: 'edit' });

// In dialog
{dialog.data && (
  <div>
    <h3>{dialog.data.item.name}</h3>
    {dialog.data.mode === 'edit' && <EditForm />}
  </div>
)}
```

### Multiple Dialogs
```tsx
const createDialog = useDialog();
const editDialog = useDialog<Item>();
const deleteDialog = useDialog<Item>();

// Each manages its own state independently
```

## 🚀 Performance Tips

1. **Memoize filter functions:**
```tsx
const filterFn = useCallback(
  (item: Item, filter: string) => item.status === filter,
  []
);
```

2. **Memoize filter options:**
```tsx
const filterOptions = useMemo(() => [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
], []);
```

3. **Use getRowId for stable keys:**
```tsx
<DataTable
  data={filteredData}
  getRowId={(item) => item.id}  // Better than index
/>
```

## ❌ Common Mistakes to Avoid

### Don't mix old and new patterns
```tsx
// ❌ Bad
<div className="p-8">
  <PageHeader title="Title" />
  // Mixed patterns
</div>

// ✅ Good
<PageLayout>
  <PageHeader title="Title" />
</PageLayout>
```

### Don't duplicate logic
```tsx
// ❌ Bad
const [query, setQuery] = useState('');
const filtered = data.filter(item => item.name.includes(query));

// ✅ Good
const { filteredData } = useDataFilters({ data, searchFields: ['name'] });
```

### Don't forget to pass all required props
```tsx
// ❌ Bad - missing onSearchChange
<ActionBar searchValue={query} />

// ✅ Good - complete props
<ActionBar
  searchValue={query}
  onSearchChange={setQuery}
/>
```
