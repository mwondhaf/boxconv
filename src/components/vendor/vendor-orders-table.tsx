"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconEye,
  IconLayoutColumns,
  IconLoader,
  IconPackage,
  IconTruck,
  IconX,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"

export const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customer: z.object({
    name: z.string(),
    phone: z.string().optional(),
  }),
  status: z.enum(["pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"]),
  total: z.number(),
  items: z.number(),
  createdAt: z.string(),
  rider: z.string().optional(),
})

export type Order = z.infer<typeof orderSchema>

function getStatusBadge(status: Order["status"]) {
  const statusConfig = {
    pending: { icon: IconLoader, label: "Pending", variant: "outline" as const },
    confirmed: { icon: IconCircleCheckFilled, label: "Confirmed", variant: "secondary" as const },
    processing: { icon: IconPackage, label: "Processing", variant: "secondary" as const },
    out_for_delivery: { icon: IconTruck, label: "Out for Delivery", variant: "default" as const },
    delivered: { icon: IconCircleCheckFilled, label: "Delivered", variant: "default" as const },
    cancelled: { icon: IconX, label: "Cancelled", variant: "destructive" as const },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="gap-1 px-1.5">
      <Icon className={`size-3.5 ${status === "delivered" ? "fill-green-500 dark:fill-green-400" : ""}`} />
      {config.label}
    </Badge>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    cell: ({ row }) => (
      <span className="font-medium text-primary">{row.original.orderNumber}</span>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.customer.name}</span>
        {row.original.customer.phone && (
          <span className="text-xs text-muted-foreground">{row.original.customer.phone}</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => getStatusBadge(row.original.status),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "items",
    header: () => <div className="text-center">Items</div>,
    cell: ({ row }) => (
      <div className="text-center">
        <Badge variant="outline">{row.original.items}</Badge>
      </div>
    ),
  },
  {
    accessorKey: "total",
    header: () => <div className="text-end">Total</div>,
    cell: ({ row }) => (
      <div className="text-end font-medium tabular-nums">
        {formatCurrency(row.original.total)}
      </div>
    ),
  },
  {
    accessorKey: "rider",
    header: "Rider",
    cell: ({ row }) => (
      <span className={row.original.rider ? "" : "text-muted-foreground"}>
        {row.original.rider ?? "Unassigned"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>
            <IconEye className="size-4" />
            View Details
          </DropdownMenuItem>
          {row.original.status === "pending" && (
            <DropdownMenuItem>
              <IconCircleCheckFilled className="size-4" />
              Confirm Order
            </DropdownMenuItem>
          )}
          {(row.original.status === "confirmed" || row.original.status === "processing") && (
            <DropdownMenuItem>
              <IconTruck className="size-4" />
              Assign Rider
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {row.original.status !== "delivered" && row.original.status !== "cancelled" && (
            <DropdownMenuItem variant="destructive">
              <IconX className="size-4" />
              Cancel Order
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

// Demo data
const demoOrders: Order[] = [
  {
    id: "1",
    orderNumber: "ORD-001",
    customer: { name: "John Doe", phone: "+256 701 234 567" },
    status: "pending",
    total: 125000,
    items: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    rider: undefined,
  },
  {
    id: "2",
    orderNumber: "ORD-002",
    customer: { name: "Jane Smith", phone: "+256 702 345 678" },
    status: "confirmed",
    total: 89000,
    items: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    rider: undefined,
  },
  {
    id: "3",
    orderNumber: "ORD-003",
    customer: { name: "Mike Johnson", phone: "+256 703 456 789" },
    status: "delivered",
    total: 245000,
    items: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    rider: "Samuel K.",
  },
  {
    id: "4",
    orderNumber: "ORD-004",
    customer: { name: "Sarah Wilson", phone: "+256 704 567 890" },
    status: "processing",
    total: 67500,
    items: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    rider: undefined,
  },
  {
    id: "5",
    orderNumber: "ORD-005",
    customer: { name: "Peter Ochieng" },
    status: "out_for_delivery",
    total: 183000,
    items: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    rider: "Moses T.",
  },
  {
    id: "6",
    orderNumber: "ORD-006",
    customer: { name: "Grace Nakato", phone: "+256 706 789 012" },
    status: "cancelled",
    total: 52000,
    items: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    rider: undefined,
  },
  {
    id: "7",
    orderNumber: "ORD-007",
    customer: { name: "David Ssempa", phone: "+256 707 890 123" },
    status: "delivered",
    total: 312000,
    items: 6,
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    rider: "James M.",
  },
  {
    id: "8",
    orderNumber: "ORD-008",
    customer: { name: "Alice Nambi" },
    status: "pending",
    total: 95000,
    items: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    rider: undefined,
  },
]

interface VendorOrdersTableProps {
  data?: Order[]
}

export function VendorOrdersTable({ data: initialData = demoOrders }: VendorOrdersTableProps) {
  const [data] = React.useState(() => initialData)
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      {/* Filters Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Label htmlFor="search-orders" className="sr-only">
            Search orders
          </Label>
          <Input
            id="search-orders"
            placeholder="Search orders..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
          <Select
            value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) =>
              table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconLayoutColumns />
              <span className="hidden lg:inline">Columns</span>
              <IconChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" && column.getCanHide()
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden text-sm lg:block">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} orders
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <IconChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <IconChevronLeft />
          </Button>
          <span className="text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <IconChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <IconChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
