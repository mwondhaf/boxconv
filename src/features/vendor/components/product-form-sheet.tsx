"use client";

import { useForm } from "@tanstack/react-form";
import type { Id } from "convex/_generated/dataModel";
import { DollarSign, Layers, Loader2, Package, Tag } from "lucide-react";
import * as React from "react";
import slugify from "slugify";
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
import {
  useBrands,
  useCategories,
  useCreateProduct,
  useProductImages,
  useUpdateProduct,
} from "../hooks/use-products";
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
  name: z.string().min(1, "Product name is required"),
  description: z.string(),
  brandId: z.string(),
  categoryId: z.string().min(1, "Category is required"),
  isActive: z.boolean(),
  tags: z.string(), // Comma-separated tags
});

// Helper to extract error message from TanStack Form errors
function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    return (error as { message: string }).message;
  }
  return String(error);
}

// =============================================================================
// Helpers
// =============================================================================

function generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true });
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
  const categories = useCategories({ isActive: true });
  const brands = useBrands({});
  const productImages = useProductImages(product?._id);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      brandId: product?.brandId?.toString() ?? "",
      categoryId: product?.categoryId.toString() ?? "",
      isActive: product?.isActive ?? false,
      tags: product?.tags ? product.tags.join(", ") : "",
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = productSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(", ");
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null);

      try {
        const tags = value.tags
          ? value.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined;

        // Auto-generate slug from name
        const slug = generateSlug(value.name);

        if (isEditing) {
          await updateProduct({
            id: product._id,
            name: value.name,
            slug,
            description: value.description || undefined,
            brandId: value.brandId
              ? (value.brandId as Id<"brands">)
              : undefined,
            categoryId: value.categoryId as Id<"categories">,
            isActive: value.isActive,
            tags,
          });
        } else {
          await createProduct({
            name: value.name,
            slug,
            description: value.description || undefined,
            brandId: value.brandId
              ? (value.brandId as Id<"brands">)
              : undefined,
            categoryId: value.categoryId as Id<"categories">,
            isActive: value.isActive,
            tags,
          });
        }

        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to save product:", error);
        setServerError(
          error instanceof Error ? error.message : "Failed to save product"
        );
      }
    },
  });

  // Reset form when product changes
  React.useEffect(() => {
    if (product) {
      form.setFieldValue("name", product.name);
      form.setFieldValue("description", product.description ?? "");
      form.setFieldValue(
        "brandId",
        product.brandId ? product.brandId.toString() : ""
      );
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
      <SheetContent className="flex flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="size-5" />
            {product ? `Edit ${product.name}` : "Add New Product"}
          </SheetTitle>
          <SheetDescription>
            {product
              ? "Update the product information below."
              : "Fill in the details to create a new product."}
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          id="product-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Product Image */}
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

              {/* Basic Info */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium text-sm">
                  <Package className="size-4" />
                  Basic Information
                </h3>
                <div className="grid gap-3">
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="e.g., Fresh Milk 1L"
                          value={field.state.value}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-destructive text-xs">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                    )}
                    name="name"
                  />
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Describe the product..."
                          rows={3}
                          value={field.state.value}
                        />
                      </div>
                    )}
                    name="description"
                  />
                </div>
              </div>

              <Separator />

              {/* Category & Brand */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium text-sm">
                  <Layers className="size-4" />
                  Category & Brand
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="categoryId">Category *</Label>
                        <Select
                          onValueChange={field.handleChange}
                          value={field.state.value}
                        >
                          <SelectTrigger id="categoryId">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat._id} value={cat._id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-destructive text-xs">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                    )}
                    name="categoryId"
                  />
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="brandId">Brand</Label>
                        <Select
                          onValueChange={(val) =>
                            field.handleChange(val === "none" ? "" : val)
                          }
                          value={field.state.value || "none"}
                        >
                          <SelectTrigger id="brandId">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No brand</SelectItem>
                            {brands?.map((brand) => (
                              <SelectItem key={brand._id} value={brand._id}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    name="brandId"
                  />
                </div>
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium text-sm">
                  <Tag className="size-4" />
                  Tags
                </h3>
                <form.Field
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="tags">Product Tags</Label>
                      <Input
                        id="tags"
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="organic, fresh, local (comma-separated)"
                        value={field.state.value}
                      />
                      <p className="text-muted-foreground text-xs">
                        Separate tags with commas
                      </p>
                    </div>
                  )}
                  name="tags"
                />
              </div>

              <Separator />

              {/* Status */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium text-sm">
                  <DollarSign className="size-4" />
                  Status
                </h3>
                <form.Field
                  children={(field) => (
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                      <div>
                        <Label className="font-medium" htmlFor="isActive">
                          Active
                        </Label>
                        <p className="text-muted-foreground text-xs">
                          Active products are visible to customers
                        </p>
                      </div>
                      <Switch
                        checked={field.state.value}
                        id="isActive"
                        onCheckedChange={field.handleChange}
                      />
                    </div>
                  )}
                  name="isActive"
                />
              </div>

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
                    ) : isEditing ? (
                      "Save Changes"
                    ) : (
                      "Create Product"
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

export default ProductFormSheet;
