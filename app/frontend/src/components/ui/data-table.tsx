import React, { useRef, useEffect, useState } from 'react';
import { Card } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { theme, cn } from '@/lib/theme-factory';
import { ProjectColorDot } from './neon-dot';
import { StatusBadge } from './status-badge';

export interface TableColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index?: number) => React.ReactNode;
  sortable?: boolean;
}

export interface TableAction<T> {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (item: T, e: React.MouseEvent, index?: number) => void;
  variant?: 'default' | 'destructive' | 'ghost';
  tooltip?: string;
  condition?: (item: T) => boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  selectable?: boolean;
  selectedItems?: any[];
  onSelectionChange?: (selected: any[]) => void;
  onRowClick?: (item: T) => void;
  getRowId: (item: T) => any;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  actions = [],
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  onRowClick,
  getRowId,
  className = '',
}: DataTableProps<T>) {
  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? data.map(getRowId) : []);
    }
  };

  const handleSelectRow = (item: T, checked: boolean) => {
    if (onSelectionChange) {
      const id = getRowId(item);
      onSelectionChange(
        checked
          ? [...selectedItems, id]
          : selectedItems.filter((selectedId) => selectedId !== id)
      );
    }
  };

  const isSelected = (item: T) => selectedItems.includes(getRowId(item));
  const allSelected = data.length > 0 && selectedItems.length === data.length;

  return (
    <Card className={cn(theme.table.wrapper(), className)}>
      <div className={theme.table.container()}>
        <table className={theme.table.table()}>
          <colgroup>
            {selectable && <col className="w-[60px]" />}
            {columns.map((column) => (
              <col key={column.key} className={column.width} />
            ))}
            {actions.length > 0 && <col className="w-[120px]" />}
          </colgroup>
          <thead>
            <tr className={theme.table.header.row()}>
              {selectable && (
                <th className={theme.table.header.cell()}>
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    theme.table.header.cell(),
                    `text-${column.align || 'left'}`,
                    "border-r border-transparent"
                  )}
                >
                  <TruncatedHeader align={column.align}>{column.header}</TruncatedHeader>
                </th>
              ))}
              {actions.length > 0 && (
                <th className={cn(theme.table.header.cell(), "text-center")}>
                  <TruncatedHeader align="center">Actions</TruncatedHeader>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIndex) => {
              const rowId = getRowId(item);
              const selected = isSelected(item);

              return (
                <tr
                  key={rowId}
                  className={theme.table.body.row()}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <td className={theme.table.body.cell()} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={selected}
                        onChange={(e) => handleSelectRow(item, e.target.checked)}
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const cellContent = column.render 
                      ? column.render(item, rowIndex) 
                      : (item as any)[column.key];
                    
                    // For simple text cells without custom render, use TruncatedCell
                    const shouldUseTruncation = !column.render && typeof cellContent === 'string';
                    
                    const alignmentClass = column.align === 'center' 
                      ? 'text-center' 
                      : column.align === 'right'
                      ? 'text-right'
                      : 'text-left';
                    
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          theme.table.body.cell(), 
                          alignmentClass,
                          "border-r border-transparent"
                        )}
                      >
                        {shouldUseTruncation ? (
                          <TruncatedCell align={column.align}>
                            {cellContent}
                          </TruncatedCell>
                        ) : column.align === 'center' ? (
                          <div className="flex justify-center">
                            {cellContent}
                          </div>
                        ) : (
                          cellContent
                        )}
                      </td>
                    );
                  })}
                  {actions.length > 0 && (
                    <td className={cn(theme.table.body.cell(), "text-center")} onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-1 w-fit mx-auto">
                        {actions.map((action, idx) => {
                          const shouldShow = action.condition ? action.condition(item) : true;
                          if (!shouldShow) return null;

                          const ActionIcon = action.icon;
                          const button = (
                            <Button
                              key={idx}
                              size="sm"
                              variant={action.variant || 'ghost'}
                              className={theme.button.iconAction()}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(item, e, rowIndex);
                              }}
                            >
                              <ActionIcon className={theme.icon.action()} />
                            </Button>
                          );

                          if (action.tooltip) {
                            return (
                              <TooltipProvider key={idx}>
                                <Tooltip delayDuration={0}>
                                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                                  <TooltipContent side="left" className={theme.tooltip.content()}>
                                    <div className="text-xs">{action.tooltip}</div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }

                          return button;
                        })}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Helper component for truncated cell with tooltip
function TruncatedCell({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'center' | 'right' }) {
  const cellRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = cellRef.current;
    if (element) {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    }
  }, [children]);

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  const content = (
    <div 
      ref={cellRef} 
      className={cn(
        "truncate overflow-hidden max-w-full",
        alignClass
      )}
    >
      {children}
    </div>
  );

  if (isTruncated && typeof children === 'string') {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="top" className={theme.tooltip.content()}>
            <div className="max-w-xs text-xs">{children}</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// Helper component for truncated header with tooltip
function TruncatedHeader({ children, align = 'left' }: { children: string; align?: 'left' | 'center' | 'right' }) {
  const headerRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = headerRef.current;
    if (element) {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    }
  }, [children]);

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  const content = (
    <span 
      ref={headerRef} 
      className={cn("block truncate overflow-hidden", alignClass)}
    >
      {children}
    </span>
  );

  if (isTruncated) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="top" className={theme.tooltip.content()}>
            <div className="text-xs">{children}</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// Specialized cell renderers for common patterns
export const TableRenderers = {
  badge: (text: string, variant: 'default' | 'outline' | 'secondary' = 'outline') => (
    <Badge variant={variant}>{text}</Badge>
  ),

  statusBadge: (status: string, size: 'sm' | 'md' | 'lg' = 'sm') => (
    <StatusBadge
      status={status}
      size={size}
    />
  ),

  colorDot: (color: string, projectName: string) => (
    <div className="relative group/dot inline-flex">
      <ProjectColorDot
        color={color}
        projectName={projectName}
      />
    </div>
  ),

  truncated: (text: string) => <TruncatedCell>{text}</TruncatedCell>,

  muted: (text: string) => <span className="text-muted-foreground truncate block">{text}</span>,

  code: (text: string) => <span className="font-mono text-sm text-muted-foreground truncate block">{text}</span>,

  withIcon: (icon: React.ReactNode, text: string) => (
    <div className="flex gap-2 min-w-0">
      {icon}
      <span className="truncate">{text}</span>
    </div>
  ),
};