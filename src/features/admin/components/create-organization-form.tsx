"use client";

import { useForm } from "@tanstack/react-form";
import * as React from "react";
import { z } from "zod";
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
import { createOrganization } from "../api/organizations";

// =============================================================================
// Schema
// =============================================================================

const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters.")
    .max(64, "Organization name must be at most 64 characters."),
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]*$/,
      "Slug can only contain lowercase letters, numbers, and hyphens."
    )
    .max(64, "Slug must be at most 64 characters.")
    .optional()
    .or(z.literal("")),
});

// =============================================================================
// Types
// =============================================================================

interface CreateOrganizationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function CreateOrganizationForm({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrganizationFormProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = createOrganizationSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(", ");
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await createOrganization({
          data: {
            name: value.name,
            slug: value.slug || undefined,
          },
        });
        form.reset();
        onSuccess();
        onOpenChange(false);
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : "Failed to create organization"
        );
      }
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization for a vendor. You can add members after
            creation.
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-organization-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Organization Name
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Acme Inc."
                      value={field.state.value}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
              name="name"
            />
            <form.Field
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Slug (optional)
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="acme-inc"
                      value={field.state.value}
                    />
                    <FieldDescription>
                      URL-friendly identifier. Auto-generated if left blank.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
              name="slug"
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
            children={([canSubmit, isSubmitting]) => (
              <Button
                disabled={!canSubmit || isSubmitting}
                form="create-organization-form"
                type="submit"
              >
                {isSubmitting ? "Creating..." : "Create Organization"}
              </Button>
            )}
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
