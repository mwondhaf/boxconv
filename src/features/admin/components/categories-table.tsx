'use client'

import * as React from 'react'
import {
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  FolderTree,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'

import type { ColumnDef } from '@tanstack/react-table'
import type { Id } from 'convex/_generated/dataModel'

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

// =============================================================================
// Types
// =============================================================================

export interface Category {
  _id: Id<'categories'>
  name: string
  slug: string
  description?: string
  parentId?: Id<'categories'>
  thumbnailUrl?: string
  bannerUrl?: string
  isActive: boolean
  _creationTime: number
  // Enriched fields
  parentName?: string
  childrenCount?: number
  productCount?: number
}

interface CategoriesTableProps {
  data: Array<Category>
  isLoading?: boolean
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onToggleActive: (category: Category) => void
  onViewChildren?: (category: Category) => void
}

// =============================================================================
// Helper Functions
// =============================================================================

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
  onEdit: (category: Category) => void,
  onDelete: (category: Category) => void,
  onToggleActive: (category: Category) => void,
  onViewChildren: ((category: Category) => void) | undefined
): Array<ColumnDef<Category>> {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Category</SortableHeader>
      ),
      cell: ({ row }) => {
        const category = row.original
        return (
          <div className="flex items-center gap-3">
            {category.thumbnailUrl ? (
              <img
                src={category.thumbnailUrl}
                alt={category.name}
                className="size-10 rounded-lg object-cover bg-muted"
              />
            ) : (
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                <FolderTree className="size-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-medium">{category.name}</span>
              {category.description && (
                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                  {category.description}
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => {
        const slug = row.original.slug
        return (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{slug}</code>
        )
      },
    },
    {
      accessorKey: 'parentName',
      header: 'Parent',
      cell: ({ row }) => {
        const parentName = row.original.parentName
        return parentName ? (
          <span className="text-sm">{parentName}</span>
        ) : (
          <span className="text-muted-foreground text-sm">Root</span>
        )
      },
    },
    {
      accessorKey: 'childrenCount',
      header: ({ column }) => (
        <SortableHeader column={column}>Children</SortableHeader>
      ),
      cell: ({ row }) => {
        const count = row.original.childrenCount
        return (
          <span className={cn(count && count > 0 ? 'font-medium' : 'text-muted-foreground')}>
            {count ?? 0}
          </span>
        )
      },
    },
    {
      accessorKey: 'productCount',
      header: ({ column }) => (
        <SortableHeader column={column}>Products</SortableHeader>
      ),
      cell: ({ row }) => {
        const count = row.original.productCount
        return (
          <span className={cn(count && count > 0 ? 'font-medium' : 'text-muted-foreground')}>
            {count ?? 0}
          </span>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.isActive
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
        const timestamp = row.original._creationTime
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
        const category = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewChildren && category.childrenCount && category.childrenCount > 0 && (
                <DropdownMenuItem onClick={() => onViewChildren(category)}>
                  <ChevronRight className="mr-2 size-4" />
                  View Children ({category.childrenCount})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Edit className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(category)}>
                {category.isActive ? (
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(category)}
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
// CategoriesTable Component
// =============================================================================

export function CategoriesTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
  onViewChildren,
}: CategoriesTableProps) {
  const columns = React.useMemo(
    () => createColumns(onEdit, onDelete, onToggleActive, onViewChildren),
    [onEdit, onDelete, onToggleActive, onViewChildren]
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      searchColumn="name"
      searchPlaceholder="Search categories..."
      showSearch={true}
      showPagination={true}
      showColumnToggle={true}
      pageSize={10}
      getRowId={(row) => row._id}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <FolderTree className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No categories found.</p>
          <p className="text-sm text-muted-foreground">
            Add your first category to organize products.
          </p>
        </div>
      }
      loadingState={
        <div className="flex items-center justify-center gap-2">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Loading categories...</span>
        </div>
      }
    />
  )
}

export default CategoriesTable
