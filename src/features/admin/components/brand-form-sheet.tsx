"use client";

import { useForm } from "@tanstack/react-form";
import type { Id } from "convex/_generated/dataModel";
import { Loader2, Tag } from "lucide-react";
import * as React from "react";
import slugify from "slugify";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Textarea } from "~/components/ui/textarea";
import { useCreateBrand, useUpdateBrand } from "../hooks/use-catalog";

// =============================================================================
// Types
// =============================================================================

export interface BrandData {
  _id: Id<"brands">;
  name: string;
  slug: string;
  description?: string;
}

export interface BrandFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: BrandData | null;
  onSuccess?: () => void;
}

// =============================================================================
// Schema
// =============================================================================

const brandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  description: z.string(),
});

// =============================================================================
// Helpers
// =============================================================================

function generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true });
}

// =============================================================================
// Component
// =============================================================================

export function BrandFormSheet({
  open,
  onOpenChange,
  brand,
  onSuccess,
}: BrandFormSheetProps) {
  const isEditing = !!brand;
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();

  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: brand?.name ?? "",
      description: brand?.description ?? "",
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = brandSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(", ");
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null);

      try {
        const slug = generateSlug(value.name);

        if (isEditing) {
          await updateBrand({
            id: brand._id,
            name: value.name,
            slug,
            description: value.description || undefined,
          });
        } else {
          await createBrand({
            name: value.name,
            slug,
            description: value.description || undefined,
          });
        }

        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to save brand:", error);
        setServerError(
          error instanceof Error ? error.message : "Failed to save brand"
        );
      }
    },
  });

  // Reset form when brand changes
  React.useEffect(() => {
    if (brand) {
      form.setFieldValue("name", brand.name);
      form.setFieldValue("description", brand.description ?? "");
    } else {
      form.reset();
    }
  }, [brand]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Tag className="size-5" />
            {brand ? `Edit ${brand.name}` : "Add New Brand"}
          </SheetTitle>
          <SheetDescription>
            {brand
              ? "Update the brand information below."
              : "Fill in the details to create a new brand."}
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          id="brand-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <FieldGroup>
                <form.Field
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Brand Name *
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="e.g., Coca-Cola"
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
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                      <Textarea
                        id={field.name}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Describe this brand..."
                        rows={3}
                        value={field.state.value}
                      />
                      <FieldDescription>
                        Optional description for internal reference.
                      </FieldDescription>
                    </Field>
                  )}
                  name="description"
                />
              </FieldGroup>

              {serverError && (
                <p className="text-destructive text-sm">{serverError}</p>
              )}
            </div>
          </div>

          <SheetFooter>
            <div className="ml-auto flex gap-2">
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
                  <Button disabled={!canSubmit || isSubmitting} type="submit">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : brand ? (
                      "Save Changes"
                    ) : (
                      "Create Brand"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default BrandFormSheet;
