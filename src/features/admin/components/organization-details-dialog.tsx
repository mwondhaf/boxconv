"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Building2, Trash2, UserPlus } from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  getOrganization,
  removeOrganizationMember,
  updateMemberRole,
} from "../api/organizations";
import { AddMemberForm } from "./add-member-form";

// =============================================================================
// Types
// =============================================================================

interface OrganizationMember {
  id: string;
  role: string;
  userId: string | undefined;
  email: string;
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  imageUrl: string | undefined;
  createdAt: number;
}

interface OrganizationDetailsDialogProps {
  organizationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "org:owner":
      return "default";
    case "org:admin":
      return "secondary";
    default:
      return "outline";
  }
}

function formatRoleLabel(role: string) {
  return role.replace("org:", "");
}

// =============================================================================
// Members Table Component
// =============================================================================

interface MembersTableProps {
  members: Array<OrganizationMember>;
  organizationId: string;
  onRoleChange: (userId: string, role: string) => Promise<void>;
  onRemove: (userId: string) => void;
}

function MembersTable({ members, onRoleChange, onRemove }: MembersTableProps) {
  const columns: Array<ColumnDef<OrganizationMember>> = [
    {
      id: "user",
      header: "User",
      cell: ({ row }) => {
        const member = row.original;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarImage src={member.imageUrl} />
              <AvatarFallback>
                {member.firstName?.[0]}
                {member.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {member.firstName} {member.lastName}
              </p>
              <p className="text-muted-foreground text-xs">{member.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => {
        const member = row.original;
        return (
          <Select
            onValueChange={(value) =>
              member.userId ? onRoleChange(member.userId, value) : undefined
            }
            value={member.role}
          >
            <SelectTrigger className="w-32">
              <Badge variant={getRoleBadgeVariant(member.role)}>
                {formatRoleLabel(member.role)}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="org:owner">Owner</SelectItem>
              <SelectItem value="org:admin">Admin</SelectItem>
              <SelectItem value="org:member">Member</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const member = row.original;
        return (
          <Button
            className="text-destructive hover:text-destructive"
            onClick={() => member.userId && onRemove(member.userId)}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Remove member</span>
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center" colSpan={columns.length}>
                No members yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================================
// Organization Details Dialog Component
// =============================================================================

export function OrganizationDetailsDialog({
  organizationId,
  open,
  onOpenChange,
}: OrganizationDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [addMemberOpen, setAddMemberOpen] = React.useState(false);
  const [removingMember, setRemovingMember] = React.useState<string | null>(
    null
  );

  const { data: org, isLoading } = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: () =>
      getOrganization({ data: { organizationId: organizationId! } }),
    enabled: !!organizationId && open,
  });

  const invalidateOrg = () => {
    queryClient.invalidateQueries({
      queryKey: ["organization", organizationId],
    });
    queryClient.invalidateQueries({ queryKey: ["organizations"] });
  };

  const handleRemoveMember = async (userId: string) => {
    if (!organizationId) return;
    try {
      await removeOrganizationMember({
        data: { organizationId, userId },
      });
      invalidateOrg();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
    setRemovingMember(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!organizationId) return;
    try {
      await updateMemberRole({
        data: {
          organizationId,
          userId,
          role: newRole as "org:owner" | "org:admin" | "org:member",
        },
      });
      invalidateOrg();
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {org?.imageUrl ? (
                <Avatar className="size-8">
                  <AvatarImage src={org.imageUrl} />
                  <AvatarFallback>{org.name[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : (
                <Building2 className="size-5" />
              )}
              {org?.name ?? "Organization Details"}
            </DialogTitle>
            <DialogDescription>
              {org?.slug && `Slug: ${org.slug}`}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : org ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  Members ({org.members.length})
                </h4>
                <Button
                  onClick={() => setAddMemberOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <UserPlus className="mr-2 size-4" />
                  Add Member
                </Button>
              </div>

              <MembersTable
                members={org.members}
                onRemove={setRemovingMember}
                onRoleChange={handleRoleChange}
                organizationId={organizationId!}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {organizationId && (
        <AddMemberForm
          onOpenChange={setAddMemberOpen}
          onSuccess={invalidateOrg}
          open={addMemberOpen}
          organizationId={organizationId}
        />
      )}

      <AlertDialog
        onOpenChange={() => setRemovingMember(null)}
        open={!!removingMember}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the organization?
              They will lose access to all organization resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                removingMember && handleRemoveMember(removingMember)
              }
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
