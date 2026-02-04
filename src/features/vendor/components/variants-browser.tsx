'use client'

import * as React from 'react'
import { useOrganization } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { Package, Plus, Search } from 'lucide-react'

import { useOrganizationVariants } from '../hooks/use-products'
import { VariantCard } from './variant-card'
import { VariantEditSheet } from './variant-edit-sheet'

import type { Id } from 'convex/_generated/dataModel'
import type { VariantCardVariant } from './variant-card'

import { useOrganizationByClerkId } from '~/features/admin'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import { Button } from '~/components/ui/button'

// =============================================================================
// Constants
// =============================================================================

const SKELETON_COUNT = 10

// =============================================================================
// Component
// =============================================================================

export function VariantsBrowser() {
  // Get current organization from Clerk
  const { organization: clerkOrg, isLoaded: clerkLoaded } = useOrganization()
  const convexOrg = useOrganizationByClerkId(clerkOrg?.id)

  // State
  const [search, setSearch] = React.useState('')
  const [searchField, setSearchField] = React.useState<'product' | 'sku'>('product')
  const [availabilityFilter, setAvailabilityFilter] = React.useState<string>('all')

  // Edit sheet state
  const [editSheet, setEditSheet] = React.useState<{
    open: boolean
    variantId: Id<'productVariants'> | null
  }>({ open: false, variantId: null })

  // Query variants for this organization
  const variantsResult = useOrganizationVariants(convexOrg?._id, {
    isAvailable: availabilityFilter === 'all' ? undefined : availabilityFilter === 'available',
    limit: 100,
  })

  const variants = variantsResult ?? []
  const isLoading = !clerkLoaded || convexOrg === undefined || variantsResult === undefined

  // Transform and filter variants
  const filteredVariants: Array<VariantCardVariant> = React.useMemo(() => {
    let result = variants.map((v) => ({
      _id: v._id,
      productId: v.productId,
      organizationId: v.organizationId,
      sku: v.sku,
      unit: v.unit,
      stockQuantity: v.stockQuantity,
      isAvailable: v.isAvailable,
      isApproved: v.isApproved,
      product: v.product
        ? {
            _id: v.product._id,
            name: v.product.name,
            slug: v.product.slug,
            imageUrl: v.product.imageUrl,
          }
        : null,
      price: v.price,
      salePrice: v.salePrice,
      currency: v.currency,
      priceAmounts: v.priceAmounts,
    }))

    // Client-side search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (searchField === 'product') {
        result = result.filter((v) =>
          (v.product?.name ?? '').toLowerCase().includes(q)
        )
      } else {
        result = result.filter((v) => v.sku.toLowerCase().includes(q))
      }
    }

    return result
  }, [variants, search, searchField])

  // Handlers
  const handleSelectVariant = (variant: VariantCardVariant) => {
    setEditSheet({ open: true, variantId: variant._id })
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
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )

  // Render empty state
  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="size-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">No variants found</h3>
      <p className="text-muted-foreground text-sm mt-1">
        {search || availabilityFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Create product variants to see them here'}
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
          Please select or create an organization to view your variants.
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Variants</h1>
          <p className="text-muted-foreground text-sm">
            View and manage your product variants and pricing
          </p>
        </div>
        <Button asChild>
          <Link to="/v/products">
            <Plus className="size-4 mr-2" />
            Add New Variant
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={
              searchField === 'product'
                ? 'Search by product name...'
                : 'Search by SKU...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={searchField} onValueChange={(v) => setSearchField(v as 'product' | 'sku')}>
          <SelectTrigger>
            <SelectValue placeholder="Search field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product">Product name</SelectItem>
            <SelectItem value="sku">SKU</SelectItem>
          </SelectContent>
        </Select>

        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All availability</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Variants Grid */}
      {isLoading ? (
        renderSkeletons()
      ) : filteredVariants.length === 0 ? (
        renderEmpty()
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredVariants.map((variant) => (
            <VariantCard
              key={variant._id}
              variant={variant}
              onSelect={handleSelectVariant}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredVariants.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredVariants.length} variant{filteredVariants.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Edit Sheet */}
      <VariantEditSheet
        open={editSheet.open}
        onOpenChange={(open: boolean) => setEditSheet((prev) => ({ ...prev, open }))}
        variantId={editSheet.variantId}
        title="Edit Variant"
      />
    </section>
  )
}

export default VariantsBrowser
