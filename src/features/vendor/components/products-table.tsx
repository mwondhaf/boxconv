'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Edit,
  MoreHorizontal,
  Package,
  Trash2,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react'

import { DataTable, SortableHeader } from '~/shared/components/data-table'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'
import type { Id } from 'convex/_generated/dataModel'

// =============================================================================
// Types
// =============================================================================

export interface Product {
  _id: Id<'products'>
  name: string
  slug: string
  description?: string
  categoryId: Id<'categories'>
  brandId?: Id<'brands'>
  isActive: boolean
  _creationTime: number
  // Enriched fields from list query
  imageUrl?: string
  sku?: string
  price?: number
  compareAtPrice?: number
  quantity?: number
}

interface ProductsTableProps {
  data: Array<Product>
  isLoading?: boolean
  onView?: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onToggleActive?: (product: Product) => void
  onDuplicate?: (product: Product) => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatPrice(amount: number | undefined, currency = 'UGX'): string {
  if (amount === undefined || amount === null) return '—'
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// =============================================================================
// Column Definitions
// =============================================================================

function createColumns(
  onView: ((product: Product) => void) | undefined,
  onEdit: (product: Product) => void,
  onDelete: (product: Product) => void,
  onToggleActive: ((product: Product) => void) | undefined,
  onDuplicate: ((product: Product) => void) | undefined
): Array<ColumnDef<Product>> {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Product</SortableHeader>
      ),
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="flex items-center gap-3">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="size-10 rounded-lg object-cover bg-muted"
              />
            ) : (
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                <Package className="size-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-medium">{product.name}</span>
              {product.description && (
                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                  {product.description}
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => {
        const sku = row.getValue('sku') as string | undefined
        return sku ? (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{sku}</code>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'price',
      header: ({ column }) => (
        <SortableHeader column={column}>Price</SortableHeader>
      ),
      cell: ({ row }) => {
        const product = row.original
        const price = product.price
        const compareAtPrice = product.compareAtPrice

        return (
          <div className="flex flex-col">
            <span className="font-medium">{formatPrice(price)}</span>
            {compareAtPrice && compareAtPrice > (price ?? 0) && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(compareAtPrice)}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => (
        <SortableHeader column={column}>Stock</SortableHeader>
      ),
      cell: ({ row }) => {
        const quantity = row.getValue('quantity') as number | undefined
        if (quantity === undefined) {
          return <span className="text-muted-foreground">—</span>
        }

        return (
          <span
            className={cn(
              'font-medium',
              quantity === 0
                ? 'text-destructive'
                : quantity < 10
                  ? 'text-amber-600'
                  : 'text-foreground'
            )}
          >
            {quantity}
          </span>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      accessorKey: '_creationTime',
      header: ({ column }) => (
        <SortableHeader column={column}>Created</SortableHeader>
      ),
      cell: ({ row }) => {
        const timestamp = row.getValue('_creationTime') as number
        return (
          <span className="text-muted-foreground">{formatDate(timestamp)}</span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(product)}>
                  <Eye className="mr-2 size-4" />
                  View
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(product)}>
                  <Copy className="mr-2 size-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onToggleActive && (
                <DropdownMenuItem onClick={() => onToggleActive(product)}>
                  {product.isActive ? (
                    <>
                      <EyeOff className="mr-2 size-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 size-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(product)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

// =============================================================================
// ProductsTable Component
// =============================================================================

export function ProductsTable({
  data,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  onDuplicate,
}: ProductsTableProps) {
  const columns = React.useMemo(
    () => createColumns(onView, onEdit, onDelete, onToggleActive, onDuplicate),
    [onView, onEdit, onDelete, onToggleActive, onDuplicate]
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      searchColumn="name"
      searchPlaceholder="Search products..."
      showSearch={true}
      showPagination={true}
      showColumnToggle={true}
      pageSize={10}
      getRowId={(row) => row._id}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <Package className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No products found.</p>
          <p className="text-sm text-muted-foreground">
            Add your first product to get started.
          </p>
        </div>
      }
      loadingState={
        <div className="flex items-center justify-center gap-2">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Loading products...</span>
        </div>
      }
    />
  )
}

export default ProductsTable
