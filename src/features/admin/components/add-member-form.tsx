"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { addOrganizationMember, searchUsers } from "../api/organizations";

// =============================================================================
// Types
// =============================================================================

interface User {
  id: string;
  email: string | undefined;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  platformRole: string | undefined;
}

interface AddMemberFormProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// =============================================================================
// Schema
// =============================================================================

const addMemberSchema = z.object({
  userId: z.string().min(1, "Please select a user."),
  role: z.enum(["org:admin", "org:member"]),
});

// =============================================================================
// Component
// =============================================================================

export function AddMemberForm({
  organizationId,
  open,
  onOpenChange,
  onSuccess,
}: AddMemberFormProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["searchUsers", searchQuery],
    queryFn: () => searchUsers({ data: { query: searchQuery, limit: 10 } }),
    enabled: searchQuery.length >= 2,
  });

  const form = useForm({
    defaultValues: {
      userId: "",
      role: "org:member" as "org:admin" | "org:member",
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = addMemberSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(", ");
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await addOrganizationMember({
          data: {
            organizationId,
            userId: value.userId,
            role: value.role,
          },
        });
        handleReset();
        onSuccess();
        onOpenChange(false);
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : "Failed to add member"
        );
      }
    },
  });

  const handleReset = () => {
    form.reset();
    setSearchQuery("");
    setSelectedUser(null);
    setServerError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleReset();
    }
    onOpenChange(nextOpen);
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    form.setFieldValue("userId", user.id);
    setSearchQuery("");
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    form.setFieldValue("userId", "");
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Search for a user and add them to this organization.
          </DialogDescription>
        </DialogHeader>
        <form
          id="add-member-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            {/* User Search Field */}
            <Field>
              <FieldLabel>Search User</FieldLabel>
              {selectedUser ? (
                <div className="rounded-md border bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={selectedUser.imageUrl} />
                      <AvatarFallback>
                        {selectedUser.firstName?.[0]}
                        {selectedUser.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {selectedUser.email}
                      </p>
                    </div>
                    <Button
                      onClick={handleClearUser}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    autoComplete="off"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email or name..."
                    value={searchQuery}
                  />
                  <FieldDescription>
                    Type at least 2 characters to search.
                  </FieldDescription>

                  {isSearching && (
                    <p className="text-muted-foreground text-sm">
                      Searching...
                    </p>
                  )}

                  {searchResults?.users && searchResults.users.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-auto rounded-md border">
                      {searchResults.users.map((user) => (
                        <button
                          className="flex w-full items-center gap-3 p-2 text-left hover:bg-muted"
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          type="button"
                        >
                          <Avatar className="size-8">
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback>
                              {user.firstName?.[0]}
                              {user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="truncate text-muted-foreground text-xs">
                              {user.email}
                            </p>
                          </div>
                          {user.platformRole && (
                            <Badge variant="secondary">
                              {user.platformRole}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 2 &&
                    !isSearching &&
                    searchResults?.users.length === 0 && (
                      <p className="mt-2 text-muted-foreground text-sm">
                        No users found.
                      </p>
                    )}
                </>
              )}
            </Field>

            {/* Role Select Field */}
            <form.Field
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Role</FieldLabel>
                    <Select
                      name={field.name}
                      onValueChange={(value) => {
                        if (value === "org:admin" || value === "org:member") {
                          field.handleChange(value);
                        }
                      }}
                      value={field.state.value}
                    >
                      <SelectTrigger aria-invalid={isInvalid} id={field.name}>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="org:member">Member</SelectItem>
                        <SelectItem value="org:admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Admins can manage products, orders, and other members.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
              name="role"
            />
          </FieldGroup>

          {serverError && (
            <p className="mt-4 text-destructive text-sm">{serverError}</p>
          )}
        </form>
        <DialogFooter>
          <Button
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                disabled={!(selectedUser && canSubmit) || isSubmitting}
                form="add-member-form"
                type="submit"
              >
                {isSubmitting ? "Adding..." : "Add Member"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
