"use client";

import { useForm } from "@tanstack/react-form";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { DollarSign, Loader2, Package, Tag } from "lucide-react";
import * as React from "react";
import slugify from "slugify";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
import { useProductImages } from "../hooks/use-catalog";
import { ProductImageUpload } from "./product-image-upload";

// =============================================================================
// Types
// =============================================================================

export interface ProductData {
  _id: Id<"products">;
  name: string;
  slug: string;
  description?: string;
  brandId?: Id<"brands">;
  categoryId: Id<"categories">;
  isActive: boolean;
  tags?: Array<string>;
}

export interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductData | null;
  onSuccess?: () => void;
}

// =============================================================================
// Schema
// =============================================================================

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  brandId: z.string(),
  categoryId: z.string().min(1, "Category is required"),
  isActive: z.boolean(),
  tags: z.string(),
});

// =============================================================================
// Helpers
// =============================================================================

function generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true });
}

function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    return (error as { message: string }).message;
  }
  return String(error);
}

// =============================================================================
// Component
// =============================================================================

export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormSheetProps) {
  const isEditing = !!product;

  // Queries
  const categories = useQuery(api.categories.list, { isActive: undefined });
  const brands = useQuery(api.brands.list, {});
  const productImages = useProductImages(product?._id);

  // Mutations
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);

  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      brandId: product?.brandId ? product.brandId.toString() : "",
      categoryId: product ? product.categoryId.toString() : "",
      isActive: product?.isActive ?? true,
      tags: product?.tags ? product.tags.join(", ") : "",
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = productSchema.safeParse(value);
        if (!result.success) {
          const issue = result.error.issues[0];
          const fieldName =
            issue.path.length > 0 ? String(issue.path[0]) : "name";
          return { [fieldName]: issue.message };
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null);

      try {
        const slug = generateSlug(value.name);
        const tags = value.tags
          ? value.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined;

        if (product) {
          await updateProduct({
            id: product._id,
            name: value.name.trim(),
            slug,
            description: value.description.trim() || undefined,
            brandId: value.brandId
              ? (value.brandId as Id<"brands">)
              : undefined,
            categoryId: value.categoryId as Id<"categories">,
            isActive: value.isActive,
            tags,
          });
          toast.success("Product updated");
        } else {
          await createProduct({
            name: value.name.trim(),
            slug,
            description: value.description.trim() || undefined,
            brandId: value.brandId
              ? (value.brandId as Id<"brands">)
              : undefined,
            categoryId: value.categoryId as Id<"categories">,
            isActive: value.isActive,
            tags,
          });
          toast.success("Product created");
        }

        onSuccess?.();
        handleOpenChange(false);
      } catch (error) {
        console.error("Failed to save product:", error);
        const message =
          error instanceof Error ? error.message : "Failed to save product";
        setServerError(message);
        toast.error(message);
      }
    },
  });

  // Reset form when product changes
  React.useEffect(() => {
    if (product) {
      form.setFieldValue("name", product.name);
      form.setFieldValue("description", product.description ?? "");
      form.setFieldValue("brandId", product.brandId?.toString() ?? "");
      form.setFieldValue("categoryId", product.categoryId.toString());
      form.setFieldValue("isActive", product.isActive);
      form.setFieldValue("tags", product.tags ? product.tags.join(", ") : "");
    } else {
      form.reset();
    }
  }, [product]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent
        aria-describedby={undefined}
        className="flex flex-col sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="size-5" />
            {isEditing ? `Edit ${product.name}` : "Create product"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the product information below."
              : "Fill in the details to create a new product."}
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* Product Images - Only show when editing */}
            {isEditing && (
              <>
                <ProductImageUpload
                  images={productImages ?? []}
                  maxImages={5}
                  productId={product._id}
                  productName={product.name}
                />
                <Separator />
              </>
            )}

            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-medium text-sm">
                <Package className="size-4" />
                Basic Information
              </h3>

              <form.Field name="categoryId">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor="product-category">Category *</Label>
                    <Select
                      onValueChange={field.handleChange}
                      value={field.state.value}
                    >
                      <SelectTrigger id="product-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          ?.slice()
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.isTouched &&
                    field.state.meta.errors[0] ? (
                      <div className="text-destructive text-sm" role="alert">
                        {getErrorMessage(field.state.meta.errors[0])}
                      </div>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field name="brandId">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor="product-brand">Brand</Label>
                    <Select
                      onValueChange={(val) =>
                        field.handleChange(val === "none" ? "" : val)
                      }
                      value={field.state.value || "none"}
                    >
                      <SelectTrigger id="product-brand">
                        <SelectValue placeholder="No brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No brand</SelectItem>
                        {brands?.map((b) => (
                          <SelectItem key={b._id} value={b._id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>

              <form.Field name="name">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor="product-name">Name *</Label>
                    <Input
                      id="product-name"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., Fresh Milk, Bread, Bananas"
                      type="text"
                      value={field.state.value}
                    />
                    {field.state.meta.isTouched &&
                    field.state.meta.errors[0] ? (
                      <div className="text-destructive text-sm" role="alert">
                        {getErrorMessage(field.state.meta.errors[0])}
                      </div>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field name="description">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor="product-description">Description</Label>
                    <Textarea
                      id="product-description"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., Fresh organic produce, dairy, etc."
                      rows={3}
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <Separator />

            {/* Tags */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-medium text-sm">
                <Tag className="size-4" />
                Tags
              </h3>
              <form.Field name="tags">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor="product-tags">Product Tags</Label>
                    <Input
                      id="product-tags"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="organic, fresh, local (comma-separated)"
                      type="text"
                      value={field.state.value}
                    />
                    <p className="text-muted-foreground text-xs">
                      Separate tags with commas
                    </p>
                  </div>
                )}
              </form.Field>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-medium text-sm">
                <DollarSign className="size-4" />
                Status
              </h3>
              <form.Field name="isActive">
                {(field) => (
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <div>
                      <Label className="font-medium" htmlFor="product-active">
                        Active
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        Active products are visible to customers
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      id="product-active"
                      onCheckedChange={field.handleChange}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            {serverError && (
              <div className="text-destructive text-sm" role="alert">
                {serverError}
              </div>
            )}
          </div>

          <SheetFooter>
            <form.Subscribe
              selector={(state) =>
                [state.canSubmit, state.isSubmitting, state.values] as const
              }
            >
              {([canSubmit, isSubmitting, values]) => (
                <div className="ml-auto flex gap-2">
                  <Button
                    onClick={() => handleOpenChange(false)}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      !canSubmit ||
                      isSubmitting ||
                      !values.name.trim() ||
                      !values.categoryId
                    }
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : isEditing ? (
                      "Save Changes"
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              )}
            </form.Subscribe>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default ProductFormSheet;
