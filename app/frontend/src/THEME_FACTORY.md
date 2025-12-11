# Pocket Architect - Theme Factory System 🏭

## The Factory Pattern

**Every UI element gets its styling from a centralized factory.**

Instead of manually writing className strings, components call factory methods that return pre-configured, theme-stamped class strings.

## How It Works

```tsx
// ❌ OLD WAY - Manual class strings (inconsistent)
<Card className="bg-card border-border hover:border-primary/50">

// ❌ OLD WAY - Hardcoded colors (breaks theme)
<Card className="bg-gray-900/50 border-gray-800">

// ✅ NEW WAY - Factory pattern (consistent + themed)
import { theme } from '@/lib/theme-factory';
<Card className={theme.card.hoverable()}>
```

## The Factory (`/lib/theme-factory.ts`)

The theme factory is a single object that exports every styling pattern used in Pocket Architect.

### Example: Cards

```tsx
export const theme = {
  card: {
    base: () => "bg-card border-border shadow-lg shadow-primary/5",
    hoverable: () => "bg-card border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer",
    selected: () => "bg-card border-primary shadow-lg shadow-primary/20",
  },
  // ... more patterns
};
```

**Usage:**
```tsx
// Non-interactive card
<Card className={theme.card.base()}>

// Interactive card (hover effects)
<Card className={theme.card.hoverable()}>

// Selected state
<Card className={theme.card.selected()}>
```

## Complete Factory API

### 📦 Cards & Containers

```tsx
theme.card.base()          // Static cards
theme.card.hoverable()     // Interactive cards with hover
theme.card.selected()      // Selected state

theme.container.page()     // Page-level wrapper
theme.container.section()  // Section spacing
```

### 📊 Tables

```tsx
theme.table.wrapper()              // Card wrapper around table
theme.table.container()            // Scrollable container
theme.table.table()                // Table element itself

theme.table.header.row()           // Header row
theme.table.header.cell()          // Header cell

theme.table.body.row()             // Body row with hover
theme.table.body.cell()            // Body cell
```

**Example:**
```tsx
<Card className={theme.table.wrapper()}>
  <div className={theme.table.container()}>
    <table className={theme.table.table()}>
      <thead>
        <tr className={theme.table.header.row()}>
          <th className={theme.table.header.cell()}>Name</th>
        </tr>
      </thead>
      <tbody>
        <tr className={theme.table.body.row()}>
          <td className={theme.table.body.cell()}>Value</td>
        </tr>
      </tbody>
    </table>
  </div>
</Card>
```

### 🔘 Dialogs & Modals

```tsx
theme.dialog.content(size)    // Dialog content (sm, md, lg, xl, 2xl, 3xl, 4xl)
theme.dialog.section()        // Section within dialog
theme.dialog.tabs()           // Tab list in dialog
```

**Example:**
```tsx
<DialogContent className={theme.dialog.content('2xl')}>
  <Card className={theme.dialog.section()}>
    Content here
  </Card>
</DialogContent>
```

### 🧙 Wizards

```tsx
theme.wizard.content()                  // Wizard dialog content
theme.wizard.step.container()           // Step progress container

theme.wizard.step.circle.completed()    // Completed step circle
theme.wizard.step.circle.current()      // Current step circle  
theme.wizard.step.circle.upcoming()     // Upcoming step circle

theme.wizard.step.line.completed()      // Completed connector line
theme.wizard.step.line.upcoming()       // Upcoming connector line
```

### 📝 Inputs & Forms

```tsx
theme.input.base()      // Standard input
theme.input.search()    // Search input
theme.input.select()    // Select dropdown
```

### 🔲 Buttons

```tsx
theme.button.icon()          // Icon-only button
theme.button.iconAction()    // Icon button with action hover
```

### 🏷️ Badges & Status

```tsx
// Status badges (Learning-style with Circle icons)
theme.badge.status.success()      // Green border/bg/text
theme.badge.status.active()       // Green (alias for success)
theme.badge.status.operational()  // Green (alias for success)

theme.badge.status.error()        // Red border/bg/text
theme.badge.status.stopped()      // Red (alias for error)
theme.badge.status.failed()       // Red (alias for error)

theme.badge.status.warning()      // Yellow border/bg/text
theme.badge.status.pending()      // Yellow (alias for warning)

theme.badge.status.info()         // Blue border/bg/text
theme.badge.status.inProgress()   // Blue (alias for info)

theme.badge.status.neutral()      // Gray border/bg/text
theme.badge.status.inactive()     // Gray (alias for neutral)

// Standard badges
theme.badge.standard()    // Default badge
theme.badge.outline()     // Outline variant
```

**Example:**
```tsx
<Badge className={theme.badge.status.active()}>
  <Circle className={theme.icon.status.active()} />
  Operational
</Badge>
```

### 🎨 Icons & Indicators

```tsx
// Status icons (filled circles)
theme.icon.status.active()
theme.icon.status.success()
theme.icon.status.stopped()
theme.icon.status.error()
theme.icon.status.warning()
theme.icon.status.info()
theme.icon.status.inProgress()
theme.icon.status.neutral()
theme.icon.status.inactive()

// General icons
theme.icon.primary()    // Purple accent
theme.icon.muted()      // Muted gray
theme.icon.action()     // Action button icon
```

### 📄 Text & Typography

```tsx
theme.text.primary()      // Primary text color
theme.text.secondary()    // Secondary text
theme.text.muted()        // Muted text
theme.text.accent()       // Purple accent text
theme.text.code()         // Monospace code text

theme.text.heading()      // Heading text
theme.text.body()         // Body text
theme.text.small()        // Small text
```

### 💻 Code Blocks

```tsx
theme.code.block()     // Code block container
theme.code.inline()    // Inline code
theme.code.wrapper()   // Code block wrapper card
```

### 📐 Grids & Layouts

```tsx
theme.grid.cards()    // Card grid (responsive 1-2-3 columns)
theme.grid.form()     // Form grid (2 columns)
theme.grid.info()     // Info grid (2 columns)
```

### 📊 Progress Bars

```tsx
theme.progress.track()    // Progress track background
theme.progress.bar()      // Progress bar fill
```

### 💬 Tooltips

```tsx
theme.tooltip.content()   // Tooltip content styling
```

### 🎯 Headers & Page Structure

```tsx
theme.header.wrapper()      // Header container
theme.header.title()        // Title section
theme.header.titleIcon()    // Title icon
theme.header.titleText()    // Title text

theme.actionBar.wrapper()        // Action bar container
theme.actionBar.leftActions()    // Left action buttons
theme.actionBar.searchWrapper()  // Search input wrapper
theme.actionBar.searchIcon()     // Search icon
theme.actionBar.rightActions()   // Right filters/actions
```

### 🚫 Empty States

```tsx
theme.empty.wrapper()    // Empty state container
theme.empty.icon()       // Empty state icon
theme.empty.text()       // Empty state text
```

## Utility: `cn()` Function

Combine factory classes with custom classes:

```tsx
import { theme, cn } from '@/lib/theme-factory';

<Card className={cn(theme.card.base(), "mb-4", customClass)}>
```

The `cn()` function filters out falsy values:

```tsx
cn(
  theme.card.base(),
  isSelected && theme.card.selected(),  // Only adds if true
  "custom-class"
)
```

## Real-World Examples

### Example 1: Data Table

```tsx
import { theme, cn } from '@/lib/theme-factory';

<Card className={theme.table.wrapper()}>
  <div className={theme.table.container()}>
    <table className={theme.table.table()}>
      <thead>
        <tr className={theme.table.header.row()}>
          <th className={cn(theme.table.header.cell(), "w-[20%]")}>
            Name
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className={theme.table.body.row()}>
          <td className={theme.table.body.cell()}>
            <Circle className={theme.icon.status.active()} />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</Card>
```

### Example 2: Status Badge (Learning Style)

```tsx
<Badge className={theme.badge.status.operational()}>
  <Circle className={theme.icon.status.active()} />
  Operational
</Badge>
```

### Example 3: Dialog

```tsx
<DialogContent className={theme.dialog.content('2xl')}>
  <Card className={theme.dialog.section()}>
    <h3 className={theme.text.primary()}>Section Title</h3>
    <p className={theme.text.secondary()}>Description text</p>
  </Card>
</DialogContent>
```

### Example 4: Page Layout

```tsx
<div className={theme.container.page()}>
  <div className={theme.header.wrapper()}>
    <div className={theme.header.title()}>
      <BookOpen className={theme.header.titleIcon()} />
      <h1 className={theme.header.titleText()}>Page Title</h1>
    </div>
  </div>
  
  <div className={theme.actionBar.wrapper()}>
    <div className={theme.actionBar.searchWrapper()}>
      <Search className={theme.actionBar.searchIcon()} />
      <Input className={theme.input.search()} />
    </div>
  </div>
  
  <div className={theme.grid.cards()}>
    <Card className={theme.card.hoverable()}>
      Content
    </Card>
  </div>
</div>
```

## Why This Works

### 1. **Single Source of Truth**
Change styling in ONE place (`theme-factory.ts`), update EVERYWHERE.

```tsx
// Change all table headers instantly:
header: {
  row: () => "border-b border-primary/60 bg-[var(--table-header-accent)]",
  //                         ^^^^^ Changed from /40 to /60
}
```

### 2. **Impossible to Be Inconsistent**
Components CAN'T use different styles because they all call the same factory methods.

### 3. **Theme-Aware by Design**
All factory methods use theme tokens (`bg-card`, `border-border`) which automatically respond to theme changes.

### 4. **Type-Safe**
TypeScript knows all available factory methods. Autocomplete guides you.

### 5. **Easy to Extend**
Add a new pattern once, use it everywhere:

```tsx
export const theme = {
  // ... existing patterns
  
  // Add new pattern
  notification: {
    success: () => "bg-green-500/10 border-green-500/30 text-green-500",
    error: () => "bg-red-500/10 border-red-500/30 text-red-500",
  },
};
```

## Migration Guide

### Step 1: Import the Factory

```tsx
import { theme, cn } from '@/lib/theme-factory';
```

### Step 2: Replace Hardcoded Classes

**Before:**
```tsx
<Card className="bg-card border-border hover:border-primary/50">
```

**After:**
```tsx
<Card className={theme.card.hoverable()}>
```

### Step 3: Combine When Needed

**Before:**
```tsx
<Card className="bg-card border-border mb-4 w-full">
```

**After:**
```tsx
<Card className={cn(theme.card.base(), "mb-4 w-full")}>
```

## Best Practices

### DO ✅
- Always import and use `theme` from `/lib/theme-factory`
- Use `cn()` to combine factory classes with custom classes
- Add new patterns to the factory for reuse
- Keep factory methods simple and focused

### DON'T ❌
- Hardcode `bg-card border-border` strings
- Mix factory and manual className construction
- Create one-off custom styles without factory methods
- Use inline hex colors

## The Result

**Every component gets stamped by the same factory.**

Same colors. Same borders. Same hover effects. Same spacing. Perfect consistency. Zero effort.

🏭 **One factory. Perfect uniformity.**
