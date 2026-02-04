"use client";

import type { Id } from "convex/_generated/dataModel";
import {
  Box,
  Calendar,
  FolderTree,
  ImageIcon,
  Package,
  Tag,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";

// =============================================================================
// Types
// =============================================================================

export interface ProductImage {
  _id: Id<"productImages">;
  url: string;
  alt?: string;
  isPrimary: boolean;
}

export interface ProductDetailData {
  _id: Id<"products">;
  name: string;
  slug: string;
  description?: string;
  brandId?: Id<"brands">;
  brandName?: string;
  categoryId: Id<"categories">;
  categoryName?: string;
  isActive: boolean;
  tags?: Array<string>;
  images?: Array<ProductImage>;
  _creationTime: number;
  // Variant summary
  variantCount?: number;
  totalStock?: number;
  priceRange?: { min: number; max: number };
}

export interface ProductDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDetailData | null;
  onEdit?: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(amount: number, currency = "UGX"): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// =============================================================================
// Component
// =============================================================================

export function ProductDetailSheet({
  open,
  onOpenChange,
  product,
  onEdit,
}: ProductDetailSheetProps) {
  if (!product) return null;

  const primaryImage =
    product.images?.find((img) => img.isPrimary) ?? product.images?.[0];

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex flex-col p-0 sm:max-w-xl">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                {primaryImage ? (
                  <img
                    alt={primaryImage.alt || product.name}
                    className="size-12 rounded-lg object-cover"
                    src={primaryImage.url}
                  />
                ) : (
                  <Package className="size-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <SheetTitle className="text-lg">{product.name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {product.slug}
                  </code>
                  <Badge variant={product.isActive ? "default" : "secondary"}>
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 pb-6">
            {/* Description */}
            {product.description && (
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground text-sm">
                  Description
                </h3>
                <p className="text-sm">{product.description}</p>
              </div>
            )}

            <Separator />

            {/* Category & Brand */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 font-medium text-muted-foreground text-sm">
                  <FolderTree className="size-4" />
                  Category
                </h3>
                <p className="font-medium text-sm">
                  {product.categoryName ?? "Unknown"}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 font-medium text-muted-foreground text-sm">
                  <Tag className="size-4" />
                  Brand
                </h3>
                <p className="font-medium text-sm">
                  {product.brandName ?? "No brand"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <>
                <div className="space-y-2">
                  <h3 className="font-medium text-muted-foreground text-sm">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Variant Summary */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-1.5 font-medium text-muted-foreground text-sm">
                <Box className="size-4" />
                Variant Summary
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Variants</p>
                  <p className="font-semibold text-lg">
                    {product.variantCount ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Total Stock</p>
                  <p className="font-semibold text-lg">
                    {product.totalStock ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Price Range</p>
                  <p className="font-semibold text-lg">
                    {product.priceRange
                      ? `${formatPrice(product.priceRange.min)} - ${formatPrice(product.priceRange.max)}`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Images Gallery */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-1.5 font-medium text-muted-foreground text-sm">
                <ImageIcon className="size-4" />
                Images ({product.images?.length ?? 0})
              </h3>
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {product.images.map((image) => (
                    <div
                      className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                      key={image._id}
                    >
                      <img
                        alt={image.alt || product.name}
                        className="size-full object-cover"
                        src={image.url}
                      />
                      {image.isPrimary && (
                        <Badge
                          className="absolute top-1 left-1 px-1.5 py-0 text-[10px]"
                          variant="default"
                        >
                          Primary
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30">
                  <ImageIcon className="mb-1 size-6 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs">No images</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Metadata */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 font-medium text-muted-foreground text-sm">
                <Calendar className="size-4" />
                Metadata
              </h3>
              <div className="divide-y rounded-lg border">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground text-sm">ID</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {product._id}
                  </code>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground text-sm">Created</span>
                  <span className="text-sm">
                    {formatDate(product._creationTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <SheetFooter>
          <div className="ml-auto flex gap-2">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
            {onEdit && <Button onClick={onEdit}>Edit Product</Button>}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default ProductDetailSheet;
