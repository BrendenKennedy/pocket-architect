# Uniform Table Standards for Pocket Architect

## Standard Table Row Height
- All table rows: `h-14` (56px)
- Provides consistent vertical rhythm across all tables

## Standard Table Cell Padding
- All cells: `p-4` (16px padding)
- Provides comfortable spacing and click targets

## Standard Typography
- Header text: `text-sm text-muted-foreground uppercase tracking-wider`
- Body text: Base size (no explicit class)
- Muted text: `text-muted-foreground`
- Mono text (IDs, IPs): `font-mono text-sm`

## Standard Colors
- Background: `bg-card`
- Border: `border-border`
- Hover: `hover:bg-muted/50`
- Selected: `bg-primary/10`

## Components to Standardize
- [x] Projects (uses cards, not tables)
- [ ] Instances
- [ ] Blueprints
- [ ] Security
- [ ] Images
- [ ] Snapshots
- [ ] Networks

## Example Standard Table Row

```tsx
<tr className="border-b border-border hover:bg-muted/50 transition-colors h-14">
  <td className="p-4">
    <Checkbox />
  </td>
  <td className="p-4">
    Content
  </td>
</tr>
```
