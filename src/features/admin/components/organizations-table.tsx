"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Edit, MoreHorizontal, Trash2, Users } from "lucide-react";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "~/shared/components/data-table";

// =============================================================================
// Types
// =============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  membersCount: number;
  createdAt: number;
  updatedAt?: number;
}

interface OrganizationsTableProps {
  data: Array<Organization>;
  isLoading?: boolean;
  onViewMembers: (org: Organization) => void;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getOrgInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(timestamp: number) {
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
  onViewMembers: (org: Organization) => void,
  onEdit: (org: Organization) => void,
  onDelete: (org: Organization) => void
): Array<ColumnDef<Organization>> {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column}>Organization</SortableHeader>
      ),
      cell: ({ row }) => {
        const org = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage alt={org.name} src={org.imageUrl} />
              <AvatarFallback>{getOrgInitials(org.name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{org.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => {
        const slug = row.getValue("slug") as string | null;
        return (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {slug ?? "-"}
          </code>
        );
      },
    },
    {
      accessorKey: "membersCount",
      header: ({ column }) => (
        <SortableHeader column={column}>Members</SortableHeader>
      ),
      cell: ({ row }) => {
        const count = row.getValue("membersCount") as number;
        return (
          <div className="flex items-center gap-1">
            <Users className="size-4 text-muted-foreground" />
            {count}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <SortableHeader column={column}>Created</SortableHeader>
      ),
      cell: ({ row }) => {
        const timestamp = row.getValue("createdAt") as number;
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
        const org = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewMembers(org)}>
                <Users className="mr-2 size-4" />
                View Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(org)}>
                <Edit className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(org)}
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
// OrganizationsTable Component
// =============================================================================

export function OrganizationsTable({
  data,
  isLoading,
  onViewMembers,
  onEdit,
  onDelete,
}: OrganizationsTableProps) {
  const columns = React.useMemo(
    () => createColumns(onViewMembers, onEdit, onDelete),
    [onViewMembers, onEdit, onDelete]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <Building2 className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No organizations found.</p>
        </div>
      }
      getRowId={(row) => row.id}
      isLoading={isLoading}
      loadingState={
        <div className="flex items-center justify-center gap-2">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground">
            Loading organizations...
          </span>
        </div>
      }
      pageSize={10}
      searchColumn="name"
      searchPlaceholder="Search organizations..."
      showColumnToggle={false}
      showPagination={true}
      showSearch={true}
    />
  );
}
