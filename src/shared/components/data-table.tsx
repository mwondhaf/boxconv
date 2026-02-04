'use client'

import * as React from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  Row,
  SortingState,
  Table as TanstackTable,
  VisibilityState,
} from '@tanstack/react-table'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { cn } from '~/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface DataTableProps<TData, TValue> {
  /** Column definitions for the table */
  columns: Array<ColumnDef<TData, TValue>>
  /** Data to display in the table */
  data: Array<TData>
  /** Whether the data is currently loading */
  isLoading?: boolean
  /** Column key to use for global search filter */
  searchColumn?: string
  /** Placeholder text for the search input */
  searchPlaceholder?: string
  /** Show/hide the search input */
  showSearch?: boolean
  /** Show/hide the column visibility toggle */
  showColumnToggle?: boolean
  /** Show/hide the pagination controls */
  showPagination?: boolean
  /** Custom empty state component or message */
  emptyState?: React.ReactNode
  /** Custom loading state component or message */
  loadingState?: React.ReactNode
  /** Initial page size */
  pageSize?: number
  /** Available page size options */
  pageSizeOptions?: Array<number>
  /** Get unique row ID for selection/keying */
  getRowId?: (row: TData) => string
  /** Callback when row selection changes */
  onRowSelectionChange?: (selectedRows: Array<TData>) => void
  /** Enable row selection */
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  /** Render function for toolbar actions (right side) */
  toolbarActions?: (table: TanstackTable<TData>) => React.ReactNode
  /** Render function for bulk actions when rows are selected */
  bulkActions?: (selectedRows: Array<TData>, table: TanstackTable<TData>) => React.ReactNode
  /** Additional class name for the container */
  className?: string
  /** Whether to show borders around the table */
  bordered?: boolean
  /** Whether to make rows striped */
  striped?: boolean
}

export interface SortableHeaderProps {
  column: {
    getIsSorted: () => false | 'asc' | 'desc'
    toggleSorting: (desc?: boolean) => void
    getCanSort: () => boolean
  }
  children: React.ReactNode
  className?: string
}

// =============================================================================
// Sortable Header Component
// =============================================================================

export function SortableHeader({ column, children, className }: SortableHeaderProps) {
  if (!column.getCanSort()) {
    return <span className={className}>{children}</span>
  }

  const sorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-3 h-8 data-[state=open]:bg-accent', className)}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {children}
      {sorted === 'asc' ? (
        <ArrowUp className="ml-2 size-4" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-2 size-4" />
      ) : (
        <ArrowUpDown className="ml-2 size-4 opacity-50" />
      )}
    </Button>
  )
}

// =============================================================================
// DataTable Component
// =============================================================================

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  searchColumn,
  searchPlaceholder = 'Search...',
  showSearch = true,
  showColumnToggle = false,
  showPagination = true,
  emptyState,
  loadingState,
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 50],
  getRowId,
  onRowSelectionChange,
  enableRowSelection = false,
  toolbarActions,
  bulkActions,
  className,
  bordered = true,
  striped = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    getRowId,
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Notify parent of row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original)
      onRowSelectionChange(selectedRows)
    }
  }, [rowSelection, table, onRowSelectionChange])

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length
  const hasSelectedRows = selectedRowCount > 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* Search */}
          {showSearch && searchColumn && (
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  table.getColumn(searchColumn)?.setFilterValue(event.target.value)
                }
                className="pl-8"
              />
            </div>
          )}

          {/* Bulk Actions */}
          {hasSelectedRows && bulkActions && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedRowCount} selected
              </span>
              {bulkActions(
                table.getFilteredSelectedRowModel().rows.map((row) => row.original),
                table
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Custom Toolbar Actions */}
          {toolbarActions && toolbarActions(table)}

          {/* Column Visibility Toggle */}
          {showColumnToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="mr-2 size-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Row Count */}
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {table.getFilteredRowModel().rows.length} row(s)
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={cn('overflow-hidden rounded-lg', bordered && 'border')}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={cn(striped && 'even:bg-muted/50')}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {loadingState ?? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(striped && 'even:bg-muted/30')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyState ?? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <p>No results found.</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </div>
          <div className="flex items-center gap-4 lg:gap-6">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium whitespace-nowrap">Rows per page</p>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { ColumnDef, Row, SortingState, ColumnFiltersState }
