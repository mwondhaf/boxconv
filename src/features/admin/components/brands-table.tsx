"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Id } from "convex/_generated/dataModel";
import { Edit, MoreHorizontal, Tag, Trash2 } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { DataTable, SortableHeader } from "~/shared/components/data-table";

// =============================================================================
// Types
// =============================================================================

export interface Brand {
  _id: Id<"brands">;
  name: string;
  slug: string;
  description?: string;
  _creationTime: number;
  // Enriched fields
  productCount?: number;
}

interface BrandsTableProps {
  data: Array<Brand>;
  isLoading?: boolean;
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// =============================================================================
// Column Definitions
// =============================================================================

function createColumns(
  onEdit: (brand: Brand) => void,
  onDelete: (brand: Brand) => void
): Array<ColumnDef<Brand>> {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column}>Brand</SortableHeader>
      ),
      cell: ({ row }) => {
        const brand = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Tag className="size-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{brand.name}</span>
              {brand.description && (
                <span className="line-clamp-1 max-w-[200px] text-muted-foreground text-xs">
                  {brand.description}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => {
        const slug = row.original.slug;
        return (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{slug}</code>
        );
      },
    },
    {
      accessorKey: "productCount",
      header: ({ column }) => (
        <SortableHeader column={column}>Products</SortableHeader>
      ),
      cell: ({ row }) => {
        const count = row.original.productCount;
        return (
          <span
            className={cn(
              count && count > 0 ? "font-medium" : "text-muted-foreground"
            )}
          >
            {count ?? 0}
          </span>
        );
      },
    },
    {
      accessorKey: "_creationTime",
      header: ({ column }) => (
        <SortableHeader column={column}>Created</SortableHeader>
      ),
      cell: ({ row }) => {
        const timestamp = row.original._creationTime;
        return (
          <span className="text-muted-foreground">{formatDate(timestamp)}</span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => {
        const brand = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(brand)}>
                <Edit className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(brand)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

// =============================================================================
// BrandsTable Component
// =============================================================================

export function BrandsTable({
  data,
  isLoading,
  onEdit,
  onDelete,
}: BrandsTableProps) {
  const columns = React.useMemo(
    () => createColumns(onEdit, onDelete),
    [onEdit, onDelete]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <Tag className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No brands found.</p>
          <p className="text-muted-foreground text-sm">
            Add your first brand to organize products.
          </p>
        </div>
      }
      getRowId={(row) => row._id}
      isLoading={isLoading}
      loadingState={
        <div className="flex items-center justify-center gap-2">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Loading brands...</span>
        </div>
      }
      pageSize={10}
      searchColumn="name"
      searchPlaceholder="Search brands..."
      showColumnToggle={false}
      showPagination={true}
      showSearch={true}
    />
  );
}

export default BrandsTable;
