import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import EmptyState from './EmptyState';

type Align = 'left' | 'right' | 'center';

export interface GroupedMiniTableColumn<T> {
  key: string;
  label: ReactNode;
  align?: Align;
  className?: string;
  headerClassName?: string;
  render: (item: T, index: number) => ReactNode;
}

export interface GroupedMiniTableFooterCell {
  key?: string;
  content?: ReactNode;
  colSpan?: number;
  align?: Align;
  className?: string;
}

interface GroupedMiniTableProps<T> {
  columns: GroupedMiniTableColumn<T>[];
  data: T[];
  getRowKey: (item: T, index: number) => string;
  emptyMessage: string;
  footerCells?: GroupedMiniTableFooterCell[];
  minWidthClassName?: string;
  className?: string;
  tableClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string | undefined);
}

function alignClass(align: Align | undefined) {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

export default function GroupedMiniTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage,
  footerCells,
  minWidthClassName,
  className,
  tableClassName,
  rowClassName,
}: GroupedMiniTableProps<T>) {
  if (data.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div className={cn('rounded-md border overflow-x-auto', className)}>
      <table className={cn('w-full text-xs', minWidthClassName, tableClassName)}>
        <thead>
          <tr className="border-b bg-muted/20">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-3 py-1.5 font-medium text-muted-foreground',
                  alignClass(column.align),
                  column.headerClassName,
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const resolvedRowClassName = typeof rowClassName === 'function'
              ? rowClassName(item, index)
              : rowClassName;
            return (
              <tr key={getRowKey(item, index)} className={cn('border-t hover:bg-muted/10', resolvedRowClassName)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('px-3 py-2', alignClass(column.align), column.className)}
                  >
                    {column.render(item, index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        {footerCells && footerCells.length > 0 && (
          <tfoot>
            <tr className="border-t bg-muted/20">
              {footerCells.map((cell, index) => (
                <td
                  key={cell.key ?? index}
                  colSpan={cell.colSpan}
                  className={cn('px-3 py-1.5', alignClass(cell.align), cell.className)}
                >
                  {cell.content}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
