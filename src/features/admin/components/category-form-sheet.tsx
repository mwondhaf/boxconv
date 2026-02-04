"use client";

import { useForm } from "@tanstack/react-form";
import type { Id } from "convex/_generated/dataModel";
import { FolderTree, Loader2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from "../hooks/use-catalog";
import { CategoryImageUpload } from "./category-image-upload";

// =============================================================================
// Types
// =============================================================================

export interface CategoryData {
  _id: Id<"categories">;
  name: string;
  slug: string;
  description?: string;
  parentId?: Id<"categories">;
  thumbnailUrl?: string;
  bannerUrl?: string;
  isActive: boolean;
}

export interface CategoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryData | null;
  onSuccess?: () => void;
}

// =============================================================================
// Schema
// =============================================================================

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string(),
  parentId: z.string(),
  isActive: z.boolean(),
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

export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormSheetProps) {
  const categories = useCategories({ isActive: undefined });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [serverError, setServerError] = React.useState<string | null>(null);

  // Track image URLs for display (updated after uploads)
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | undefined>(
    category?.thumbnailUrl
  );
  const [bannerUrl, setBannerUrl] = React.useState<string | undefined>(
    category?.bannerUrl
  );

  // Filter out the current category and its descendants from parent options
  const parentOptions = React.useMemo(() => {
    if (!categories) return [];
    // When editing, exclude self from parent options
    return categories.filter((cat) => cat._id !== category?._id);
  }, [categories, category?._id]);

  const form = useForm({
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
      parentId: category?.parentId?.toString() ?? "",
      isActive: category?.isActive ?? true,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = categorySchema.safeParse(value);
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

        if (category) {
          await updateCategory({
            id: category._id,
            name: value.name,
            slug,
            description: value.description || undefined,
            parentId: value.parentId
              ? (value.parentId as Id<"categories">)
              : undefined,
            isActive: value.isActive,
          });
        } else {
          await createCategory({
            name: value.name,
            slug,
            description: value.description || undefined,
            parentId: value.parentId
              ? (value.parentId as Id<"categories">)
              : undefined,
            isActive: value.isActive,
          });
        }

        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to save category:", error);
        setServerError(
          error instanceof Error ? error.message : "Failed to save category"
        );
      }
    },
  });

  // Reset form when category changes
  React.useEffect(() => {
    if (category) {
      form.setFieldValue("name", category.name);
      form.setFieldValue("description", category.description ?? "");
      form.setFieldValue("parentId", category.parentId?.toString() ?? "");
      form.setFieldValue("isActive", category.isActive);
      setThumbnailUrl(category.thumbnailUrl);
      setBannerUrl(category.bannerUrl);
    } else {
      form.reset();
      setThumbnailUrl(undefined);
      setBannerUrl(undefined);
    }
  }, [category]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="flex flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FolderTree className="size-5" />
            {category ? `Edit ${category.name}` : "Add New Category"}
          </SheetTitle>
          <SheetDescription>
            {category
              ? "Update the category information below."
              : "Fill in the details to create a new category."}
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          id="category-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Images - Only show for existing categories */}
              {category && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm">Images</h3>
                    <div className="grid min-w-0 grid-cols-2 gap-3">
                      <CategoryImageUpload
                        categoryId={category._id}
                        categoryName={category.name}
                        currentUrl={thumbnailUrl}
                        imageType="thumbnail"
                        onDeleted={() => {
                          setThumbnailUrl(undefined);
                        }}
                        onUploaded={() => {
                          // The component handles the upload, we just need to trigger a refetch
                          // For now, we'll rely on Convex reactivity
                        }}
                      />
                      <CategoryImageUpload
                        categoryId={category._id}
                        categoryName={category.name}
                        currentUrl={bannerUrl}
                        imageType="banner"
                        onDeleted={() => {
                          setBannerUrl(undefined);
                        }}
                        onUploaded={() => {
                          // The component handles the upload
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Upload images after creating the category.
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Basic Info */}
              <FieldGroup>
                <form.Field
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Category Name *
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="e.g., Beverages"
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
                        placeholder="Describe this category..."
                        rows={3}
                        value={field.state.value}
                      />
                    </Field>
                  )}
                  name="description"
                />
              </FieldGroup>

              <Separator />

              {/* Hierarchy */}
              <FieldGroup>
                <h3 className="font-medium text-sm">Hierarchy</h3>
                <form.Field
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Parent Category
                      </FieldLabel>
                      <Select
                        onValueChange={(val) =>
                          field.handleChange(val === "none" ? "" : val)
                        }
                        value={field.state.value || "none"}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue placeholder="Select parent category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No parent (Root)</SelectItem>
                          {parentOptions.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Leave empty for a top-level category.
                      </FieldDescription>
                    </Field>
                  )}
                  name="parentId"
                />
              </FieldGroup>

              <Separator />

              {/* Note for new categories about images */}
              {!category && (
                <>
                  <div className="rounded-lg border border-dashed bg-muted/30 p-4">
                    <p className="text-muted-foreground text-sm">
                      <strong>Note:</strong> You can upload thumbnail and banner
                      images after creating the category.
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Status */}
              <FieldGroup>
                <h3 className="font-medium text-sm">Status</h3>
                <form.Field
                  children={(field) => (
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                      <div>
                        <FieldLabel
                          className="font-medium"
                          htmlFor={field.name}
                        >
                          Active
                        </FieldLabel>
                        <p className="text-muted-foreground text-xs">
                          Active categories are visible to customers
                        </p>
                      </div>
                      <Switch
                        checked={field.state.value}
                        id={field.name}
                        onCheckedChange={field.handleChange}
                      />
                    </div>
                  )}
                  name="isActive"
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
                children={([canSubmit, isSubmitting]) => (
                  <Button disabled={!canSubmit || isSubmitting} type="submit">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : category ? (
                      "Save Changes"
                    ) : (
                      "Create Category"
                    )}
                  </Button>
                )}
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              />
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default CategoryFormSheet;
