'use client'

import * as React from 'react'
import { useQuery } from 'convex/react'
import { Package, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { api } from 'convex/_generated/api'
import { ProductCard } from './product-card'
import { ProductDetailSheet } from './product-detail-sheet'
import { ProductFormSheet } from './product-form-sheet'

import type { Id } from 'convex/_generated/dataModel'
import type { ProductCardProduct } from './product-card'
import type { ProductDetailData } from './product-detail-sheet'
import type { ProductData } from './product-form-sheet'

import { Button } from '~/components/ui/button'
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

export function ProductsBrowser() {
  // State
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')

  // Sheet states
  const [formSheet, setFormSheet] = React.useState<{
    open: boolean
    product: ProductData | null
  }>({ open: false, product: null })

  const [detailSheet, setDetailSheet] = React.useState<{
    open: boolean
    product: ProductDetailData | null
  }>({ open: false, product: null })

  // Queries
  const categories = useQuery(api.categories.list, { isActive: undefined })
  const brands = useQuery(api.brands.list, {})

  const productsResult = useQuery(api.products.list, {
    search: search.trim() || undefined,
    categoryId: categoryFilter !== 'all' ? (categoryFilter as Id<'categories'>) : undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    limit: 50,
  })

  const products = productsResult?.products ?? []
  const isLoading = productsResult === undefined

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
  const handleAddProduct = () => {
    setFormSheet({ open: true, product: null })
  }

  const handleEditProduct = (product: ProductCardProduct) => {
    // Find the full product data
    const fullProduct = products.find((p) => p._id === product._id)
    if (!fullProduct) return

    setFormSheet({
      open: true,
      product: {
        _id: fullProduct._id,
        name: fullProduct.name,
        slug: fullProduct.slug,
        description: fullProduct.description,
        brandId: fullProduct.brandId,
        categoryId: fullProduct.categoryId,
        isActive: fullProduct.isActive,
        tags: undefined,
      },
    })
  }

  const handleFormSuccess = () => {
    toast.success(
      formSheet.product ? 'Product updated successfully' : 'Product created successfully'
    )
  }

  const handleDetailEdit = () => {
    if (detailSheet.product) {
      setDetailSheet({ open: false, product: null })
      const fullProduct = products.find((p) => p._id === detailSheet.product?._id)
      if (fullProduct) {
        setFormSheet({
          open: true,
          product: {
            _id: fullProduct._id,
            name: fullProduct.name,
            slug: fullProduct.slug,
            description: fullProduct.description,
            brandId: fullProduct.brandId,
            categoryId: fullProduct.categoryId,
            isActive: fullProduct.isActive,
            tags: undefined,
          },
        })
      }
    }
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
        {search || categoryFilter !== 'all' || statusFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Add your first product to get started'}
      </p>
      {!search && categoryFilter === 'all' && statusFilter === 'all' && (
        <Button onClick={handleAddProduct} className="mt-4">
          <Plus className="size-4 mr-1.5" />
          Add Product
        </Button>
      )}
    </div>
  )

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm">
            Manage your product catalog
          </p>
        </div>
        <Button onClick={handleAddProduct}>
          <Plus className="size-4 mr-1.5" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
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
              onEdit={handleEditProduct}
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

      {/* Form Sheet */}
      <ProductFormSheet
        open={formSheet.open}
        onOpenChange={(open: boolean) => setFormSheet((prev) => ({ ...prev, open }))}
        product={formSheet.product}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Sheet */}
      <ProductDetailSheet
        open={detailSheet.open}
        onOpenChange={(open: boolean) => setDetailSheet((prev) => ({ ...prev, open }))}
        product={detailSheet.product}
        onEdit={handleDetailEdit}
      />
    </section>
  )
}

export default ProductsBrowser
