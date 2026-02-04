'use client'

import {
  Box,
  Calendar,
  FolderTree,
  ImageIcon,
  Package,
  Tag,
} from 'lucide-react'

import type { Id } from 'convex/_generated/dataModel'

import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { Separator } from '~/components/ui/separator'

// =============================================================================
// Types
// =============================================================================

export interface ProductImage {
  _id: Id<'productImages'>
  url: string
  alt?: string
  isPrimary: boolean
}

export interface ProductDetailData {
  _id: Id<'products'>
  name: string
  slug: string
  description?: string
  brandId?: Id<'brands'>
  brandName?: string
  categoryId: Id<'categories'>
  categoryName?: string
  isActive: boolean
  tags?: Array<string>
  images?: Array<ProductImage>
  _creationTime: number
  // Variant summary
  variantCount?: number
  totalStock?: number
  priceRange?: { min: number; max: number }
}

export interface ProductDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductDetailData | null
  onEdit?: () => void
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(amount: number, currency = 'UGX'): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
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
  if (!product) return null

  const primaryImage = product.images?.find((img) => img.isPrimary) ?? product.images?.[0]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-xl">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
                {primaryImage ? (
                  <img
                    src={primaryImage.url}
                    alt={primaryImage.alt || product.name}
                    className="size-12 rounded-lg object-cover"
                  />
                ) : (
                  <Package className="size-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <SheetTitle className="text-lg">{product.name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {product.slug}
                  </code>
                  <Badge variant={product.isActive ? 'default' : 'secondary'}>
                    {product.isActive ? 'Active' : 'Inactive'}
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
                <h3 className="text-sm font-medium text-muted-foreground">
                  Description
                </h3>
                <p className="text-sm">{product.description}</p>
              </div>
            )}

            <Separator />

            {/* Category & Brand */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <FolderTree className="size-4" />
                  Category
                </h3>
                <p className="text-sm font-medium">
                  {product.categoryName ?? 'Unknown'}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Tag className="size-4" />
                  Brand
                </h3>
                <p className="text-sm font-medium">
                  {product.brandName ?? 'No brand'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
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
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Box className="size-4" />
                Variant Summary
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Variants</p>
                  <p className="text-lg font-semibold">
                    {product.variantCount ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Stock</p>
                  <p className="text-lg font-semibold">
                    {product.totalStock ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Price Range</p>
                  <p className="text-lg font-semibold">
                    {product.priceRange
                      ? `${formatPrice(product.priceRange.min)} - ${formatPrice(product.priceRange.max)}`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Images Gallery */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="size-4" />
                Images ({product.images?.length ?? 0})
              </h3>
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {product.images.map((image) => (
                    <div
                      key={image._id}
                      className="relative aspect-square rounded-lg overflow-hidden border bg-muted"
                    >
                      <img
                        src={image.url}
                        alt={image.alt || product.name}
                        className="size-full object-cover"
                      />
                      {image.isPrimary && (
                        <Badge
                          className="absolute top-1 left-1 text-[10px] px-1.5 py-0"
                          variant="default"
                        >
                          Primary
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 rounded-lg border border-dashed bg-muted/30">
                  <ImageIcon className="size-6 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">No images</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Metadata */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-4" />
                Metadata
              </h3>
              <div className="rounded-lg border divide-y">
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-sm text-muted-foreground">ID</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {product._id}
                  </code>
                </div>
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-sm text-muted-foreground">Created</span>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {onEdit && (
              <Button onClick={onEdit}>
                Edit Product
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default ProductDetailSheet
