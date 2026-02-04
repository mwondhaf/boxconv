'use client'

import { Package } from 'lucide-react'

import type { Id } from 'convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import { Card } from '~/components/ui/card'

// =============================================================================
// Types
// =============================================================================

export interface ProductCardProduct {
  _id: Id<'products'>
  name: string
  slug: string
  description?: string
  isActive: boolean
  images?: Array<{
    _id: Id<'productImages'>
    url: string
    alt?: string
    isPrimary: boolean
  }>
  categoryName?: string
  brandName?: string
}

export interface ProductCardProps {
  product: ProductCardProduct
  onEdit?: (product: ProductCardProduct) => void
  onAddVariant?: (product: ProductCardProduct) => void
}

// =============================================================================
// Component
// =============================================================================

export function ProductCard({ product, onEdit, onAddVariant }: ProductCardProps) {
  const images = product.images
  const primaryImage = images ? (images.find((i) => i.isPrimary) || images[0] || null) : null

  const cardContent = (
    <>
      {primaryImage ? (
        <div
          aria-label={primaryImage.alt || product.name}
          className="aspect-4/3 w-full rounded-t-lg bg-center bg-contain bg-no-repeat bg-muted"
          role="img"
          style={{
            backgroundImage: `url(${primaryImage.url})`,
          }}
          title={primaryImage.alt || product.name}
        >
          <span className="sr-only">{primaryImage.alt || product.name}</span>
        </div>
      ) : (
        <div className="aspect-4/3 w-full bg-muted flex items-center justify-center rounded-t-lg">
          <Package className="size-8 text-muted-foreground" />
        </div>
      )}
      <div className="px-3 py-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3
            className="min-w-0 truncate text-sm font-medium"
            title={product.name}
          >
            {product.name}
          </h3>
          <Badge
            variant={product.isActive ? 'default' : 'secondary'}
            className="shrink-0 text-[10px] px-1.5 py-0"
          >
            {product.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        {(product.categoryName || product.brandName) && (
          <div className="text-xs text-muted-foreground truncate">
            {[product.categoryName, product.brandName].filter(Boolean).join(' · ')}
          </div>
        )}
        {product.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}
      </div>
    </>
  )

  return (
    <Card className="overflow-hidden py-0">
      <div>
        {onEdit ? (
          <button
            aria-label={`Edit ${product.name}`}
            className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            onClick={() => onEdit(product)}
            type="button"
          >
            {cardContent}
          </button>
        ) : (
          <div className="block w-full text-left">{cardContent}</div>
        )}
        {onAddVariant && (
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => onAddVariant(product)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Add to my store
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

export default ProductCard
