'use client'

import * as React from 'react'
import { useOrganization } from '@clerk/tanstack-react-start'
import { useQuery } from 'convex/react'
import { Package, Search } from 'lucide-react'

import { api } from 'convex/_generated/api'
import { ProductCard } from './product-card'

import type { Id } from 'convex/_generated/dataModel'
import type { ProductCardProduct } from './product-card'

import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'

// =============================================================================
// Constants
// =============================================================================

const SKELETON_COUNT = 8

// =============================================================================
// Component
// =============================================================================

export interface ProductsBrowserProps {
  /** Called when user wants to add a variant for a product */
  onAddVariant?: (productId: Id<'products'>, productName: string) => void
}

export function ProductsBrowser({ onAddVariant }: ProductsBrowserProps) {
  // Get current organization from Clerk
  const { organization: clerkOrg, isLoaded: clerkLoaded } = useOrganization()

  // State
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')

  // Queries - only show active products for vendors
  const categories = useQuery(api.categories.list, { isActive: true })
  const brands = useQuery(api.brands.list, {})

  const productsResult = useQuery(api.products.list, {
    search: search.trim() || undefined,
    categoryId: categoryFilter !== 'all' ? (categoryFilter as Id<'categories'>) : undefined,
    isActive: true, // Vendors only see active products
    limit: 50,
  })

  const products = productsResult?.products ?? []
  const isLoading = !clerkLoaded || productsResult === undefined

  // Build category and brand maps for display
  const categoryMap = React.useMemo(() => {
    const map = new Map<string, string>()
    if (categories) {
      for (const cat of categories) {
        map.set(cat._id, cat.name)
      }
    }
    return map
  }, [categories])

  const brandMap = React.useMemo(() => {
    const map = new Map<string, string>()
    if (brands) {
      for (const brand of brands) {
        map.set(brand._id, brand.name)
      }
    }
    return map
  }, [brands])

  // Transform products to ProductCardProduct format
  const productCards: Array<ProductCardProduct> = React.useMemo(() => {
    return products.map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      isActive: p.isActive,
      images: p.imageUrl
        ? [{ _id: p._id as unknown as Id<'productImages'>, url: p.imageUrl, isPrimary: true }]
        : undefined,
      categoryName: categoryMap.get(p.categoryId),
      brandName: p.brandId ? brandMap.get(p.brandId) : undefined,
    }))
  }, [products, categoryMap, brandMap])

  // Handlers
  const handleAddVariant = (product: ProductCardProduct) => {
    onAddVariant?.(product._id, product.name)
  }

  // Render loading skeletons
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card">
          <Skeleton className="aspect-4/3 w-full rounded-t-lg" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )

  // Render empty state
  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="size-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">No products found</h3>
      <p className="text-muted-foreground text-sm mt-1">
        {search || categoryFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Products will appear here once added by administrators'}
      </p>
    </div>
  )

  // Show message if no organization
  if (clerkLoaded && !clerkOrg) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No organization selected</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Please select or create an organization to browse products.
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground text-sm">
            Browse products and add them to your store as variants
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat._id} value={cat._id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        renderSkeletons()
      ) : productCards.length === 0 ? (
        renderEmpty()
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {productCards.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onAddVariant={onAddVariant ? handleAddVariant : undefined}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && productCards.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {productCards.length} product{productCards.length !== 1 ? 's' : ''}
        </p>
      )}
    </section>
  )
}

export default ProductsBrowser
