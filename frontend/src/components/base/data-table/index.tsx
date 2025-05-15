import React, { useState } from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
  type OnChangeFn
} from '@tanstack/react-table';
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import SpinLoader from '../loader/spin-loader';
import {
  PaginationWithLinks,
  type PaginationWithLinksProps
} from '@/components/ui/pagination-with-links';
import { PAGE_DEFAULT, PAGE_SIZE_DEFAULT } from '@/lib/constants/common';
import EmptyState from '../empty-state';

interface RowSelection {
  selectedRowKeys: string[];
  onChange: (selectedRowKeys: string[]) => void;
  getCheckboxProps?: (record: any) => { disabled?: boolean; name?: string };
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
  loading?: boolean;
  rowSelection?: RowSelection;
  rowKey?: string | ((record: TData) => string);
  pagination?: PaginationWithLinksProps;
  showEmptyState?: boolean;
}

export function DataTable<TData, TValue>({
  columns = [],
  data = [],
  className,
  loading = false,
  rowSelection,
  rowKey = 'id',
  pagination,
  showEmptyState = true
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const getRowKey = React.useMemo(() => {
    return (record: TData): string => {
      if (typeof rowKey === 'function') return rowKey(record);
      return (record as any)[rowKey];
    };
  }, [rowKey]);

  const selectionColumn = React.useMemo(
    () =>
      rowSelection && data.length > 0
        ? {
            id: 'select',
            header: ({ table }: { table: any }) => (
              <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
              />
            ),
            cell: ({ row }: { row: any }) => {
              const checkboxProps = rowSelection.getCheckboxProps?.(row.original) || {};
              return (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Select row"
                  {...checkboxProps}
                />
              );
            },
            enableSorting: false,
            enableHiding: false
          }
        : null,
    [rowSelection, data.length]
  );

  const finalColumns = React.useMemo(
    () => (selectionColumn ? [selectionColumn, ...columns] : columns),
    [selectionColumn, columns]
  );

  const rowSelectionState = React.useMemo(
    () =>
      rowSelection
        ? Object.fromEntries(
            rowSelection.selectedRowKeys
              .filter((key) => data.some((item) => getRowKey(item) === key))
              .map((key) => [data.findIndex((item) => getRowKey(item) === key), true])
          )
        : {},
    [rowSelection?.selectedRowKeys, data, getRowKey]
  );

  const handleSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    if (!rowSelection?.onChange) return;

    const newSelection = typeof updater === 'function' ? updater(rowSelectionState) : updater;
    const selectedKeys = Object.keys(newSelection).filter((k) => newSelection[k]);
    const validKeys = selectedKeys.map((index) => getRowKey(data[Number(index)])).filter(Boolean);

    rowSelection.onChange(validKeys);
  };

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection: rowSelectionState,
      columnFilters
    },
    enableRowSelection: !!rowSelection,
    onRowSelectionChange: handleSelectionChange,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues()
  });

  const renderHeader = React.useCallback(
    (headerGroup: any) => (
      <TableRow key={headerGroup.id}>
        {headerGroup.headers.map((header: any) => (
          <TableHead key={header.id}>
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </TableHead>
        ))}
      </TableRow>
    ),
    []
  );

  return (
    <div className="space-y-4">
      <div className={cn('rounded-md border relative', className)}>
        <UITable>
          <TableHeader>{table.getHeaderGroups().map(renderHeader)}</TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="h-24 text-center"
                >
                  <div className="flex h-auto w-full">
                    <SpinLoader />
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 && showEmptyState ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + (rowSelection ? 1 : 0)}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </UITable>
      </div>
      {pagination && (
        <PaginationWithLinks
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          pageSizeSelectOptions={
            pagination.pageSizeSelectOptions && {
              ...pagination.pageSizeSelectOptions
            }
          }
        />
      )}
    </div>
  );
}
