# Pocket Architect - Universal Theme System ✅

## 🎨 Learning-Inspired Aesthetic

**Every page in Pocket Architect now follows the same sleek, semi-transparent aesthetic as the Learning page.**

## Design Philosophy: Layered Semi-Transparency

The theme uses **semi-transparent gray layers** (`rgba(17, 24, 39, 0.5)`) instead of solid colors, creating:
- **Depth perception** through layered transparency
- **Modern glassmorphism** aesthetic
- **Visual consistency** across ALL pages
- **Smooth hover transitions** with purple accents

## Color Palette (Dark Mode)

```css
/* Core Backgrounds - Semi-transparent layers */
--background: #0A0A0A;           /* Deep black base */
--card: rgba(17, 24, 39, 0.5);   /* gray-900/50 - Semi-transparent cards */
--muted: rgba(17, 24, 39, 0.5);  /* gray-900/50 - Code blocks, inputs */
--accent: rgba(31, 41, 55, 0.8); /* gray-800/80 - Elevated surfaces */

/* Borders - Consistent gray */
--border: #1F2937;  /* gray-800 */
--input: #1F2937;   /* gray-800 */

/* Brand Color - Vibrant purple */
--primary: #A78BFA;  /* Bright purple accent */
--ring: #A78BFA;     /* Focus rings */

/* Typography - Gray scale */
--foreground: #E5E7EB;         /* gray-200 - Primary text */
--muted-foreground: #9CA3AF;   /* gray-400 - Secondary text */

/* Status Colors - Keep vibrant */
--green-500: #22C55E;   /* Success/operational */
--red-500: #EF4444;     /* Error/danger */
--blue-500: #3B82F6;    /* Info/in-progress */
--yellow-500: #EAB308;  /* Warning */
```

## The One Theme Rule

**🎯 Every component uses the SAME theme classes:**

### Backgrounds
- `bg-card` → Semi-transparent card surfaces (Learning-style)
- `bg-muted` → Dark inputs, code blocks
- `bg-accent` → Hover states, elevated surfaces
- `bg-background` → Absolute black background

### Borders
- `border-border` → Consistent gray-800 borders everywhere
- `border-input` → Same as border-border (unified!)

### Text
- `text-foreground` → Primary text (gray-200)
- `text-muted-foreground` → Secondary text (gray-400)
- `text-primary` → Purple accent text

### Status Colors (Use Tailwind directly)
- `bg-green-500`, `text-green-500`, `border-green-500`
- `bg-red-500`, `text-red-500`, `border-red-500`
- `bg-blue-500`, `text-blue-500`, `border-blue-500`
- `bg-yellow-500`, `text-yellow-500`, `border-yellow-500`

## Migration from Old Theme

| Old (Purple-tinted) | New (Learning-style) | Result |
|---------------------|----------------------|---------|
| `bg-[#1A1625]` | `bg-card` | Semi-transparent gray-900/50 |
| `bg-[#0F0F0F]` | `bg-muted` | Semi-transparent gray-900/50 |
| `bg-[#221C31]` | `bg-accent` | Semi-transparent gray-800/80 |
| `border-gray-800` | `border-border` | Consistent gray-800 |
| `border-gray-700` | `border-input` | Consistent gray-800 |
| `text-gray-300` | `text-foreground` | gray-200 |
| `text-gray-400` | `text-muted-foreground` | gray-400 |

## Learning Page Pattern Applied Everywhere

### Before (Inconsistent)
```tsx
// Instances.tsx - Purple-tinted
<Card className="bg-[#1A1625] border-[#3D3252]">

// Learning.tsx - Semi-transparent grays
<Card className="bg-gray-900/50 border-gray-800">

// Result: Different aesthetics! ❌
```

### After (Consistent)
```tsx
// All pages use theme classes
<Card className="bg-card border-border">

// Theme system outputs Learning's semi-transparent style
// bg-card → rgba(17, 24, 39, 0.5)  ✅
```

## Status Badges - Learning Style

All status badges now follow Learning's pattern:

```tsx
// Operational/Success
<Badge className="border-green-500/30 bg-green-500/10">
  <Circle className="w-3 h-3 fill-green-500 text-green-500" />
  Operational
</Badge>

// In Progress
<Badge className="border-blue-500/30 bg-blue-500/10">
  <Circle className="w-3 h-3 fill-blue-500 text-blue-500" />
  In Progress
</Badge>

// Not Started / Stopped
<Badge className="border-gray-500/30 bg-gray-500/10">
  <Circle className="w-3 h-3 fill-gray-500 text-gray-500" />
  Stopped
</Badge>
```

## Hover Effects - Learning Style

```tsx
<Card className="bg-card border-border hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
```

**Key pattern:**
1. Default: `border-border` (gray-800)
2. Hover: `border-purple-500/50` (semi-transparent purple)
3. Glow: `shadow-purple-500/10` (subtle purple glow)

## Implementation Complete 🎉

### ✅ Theme System Updated
- Semi-transparent grays match Learning
- Consistent borders across all pages
- Unified text colors (gray-200, gray-400)

### ✅ All Components Updated
1. **Dashboard** - Status badges with neon glows
2. **Instances** - Tables, cards, dialogs
3. **Projects** - Instance lists, SSH blocks
4. **Blueprints** - Platform selectors, review cards
5. **Images** - Delete dialogs, tooltips
6. **Accounts** - Connection cards
7. **Learning** - Already perfect! (our reference)
8. **Cost Management** - Charts and graphs

### ✅ Foundational Components
- **DataTable** - Uses `bg-card`, `border-border`
- **CreationWizard** - Uses `bg-card`, `border-border`
- **DetailsDialog** - Uses `bg-card`, `border-border`

## Why This Works

### 1. **Single Source of Truth**
Change `--card` in `globals.css` → All 8 pages update instantly

### 2. **Learning-Quality Everywhere**
Every page now has the sleek, modern, semi-transparent look you love

### 3. **Zero Hardcoded Colors**
No more `#1A1625` or `#3D3252` scattered across files

### 4. **Consistent Hover Effects**
Purple accent borders with glows on every interactive element

### 5. **Easy Customization**
Want blue instead of purple? Change 1 variable, done.

## To Customize Theme

```css
/* /styles/globals.css */
.dark {
  /* Change card transparency */
  --card: rgba(17, 24, 39, 0.7);  /* More opaque */
  
  /* Change accent color */
  --primary: #60A5FA;  /* Blue instead of purple */
  
  /* Change border color */
  --border: #374151;  /* Lighter gray */
}
```

**Result:** Entire app updates automatically.

## Best Practices

### DO ✅
- Use `bg-card` for all cards
- Use `border-border` for all borders
- Use `text-muted-foreground` for secondary text
- Use `hover:border-primary/50` for hover states
- Follow Learning page patterns

### DON'T ❌
- Hardcode `bg-[#1A1625]`
- Use `border-gray-700` or `border-gray-800`
- Mix old purple-tinted classes with new theme
- Create custom transparent backgrounds
- Use inline hex colors

## Visual Consistency Checklist

- [ ] All cards use `bg-card` (semi-transparent gray-900/50)
- [ ] All borders use `border-border` (gray-800)
- [ ] All hover states use `hover:border-primary/50`
- [ ] All status badges follow Learning pattern (Circle icon + fill)
- [ ] All text uses `text-foreground` or `text-muted-foreground`
- [ ] All inputs use `bg-muted` and `border-input`
- [ ] All dialogs use `bg-card border-border`

## The Result

**Every single page looks like the Learning page.** 

Same semi-transparent cards. Same gray-800 borders. Same purple hover effects. Same status badge styling. Same typography. One unified, beautiful aesthetic.

🎨 **One theme. Infinite consistency.**
