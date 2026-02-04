import { useMutation, useQuery } from 'convex/react'

import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

// =============================================================================
// Product Image Queries
// =============================================================================

/**
 * Get images for a product.
 */
export function useProductImages(productId: Id<'products'> | undefined) {
  return useQuery(
    api.productImages.listByProduct,
    productId ? { productId } : 'skip'
  )
}

/**
 * Get the primary image for a product.
 */
export function usePrimaryProductImage(productId: Id<'products'> | undefined) {
  return useQuery(
    api.productImages.getPrimary,
    productId ? { productId } : 'skip'
  )
}

// =============================================================================
// Category Queries
// =============================================================================

/**
 * Get a single category by ID with parent and children.
 */
export function useCategory(categoryId: Id<'categories'> | undefined) {
  return useQuery(api.categories.get, categoryId ? { id: categoryId } : 'skip')
}

/**
 * Get a category by slug.
 */
export function useCategoryBySlug(slug: string | undefined) {
  return useQuery(api.categories.getBySlug, slug ? { slug } : 'skip')
}

/**
 * List all categories (flat list).
 */
export function useCategories(options?: { isActive?: boolean; limit?: number }) {
  return useQuery(api.categories.list, {
    isActive: options?.isActive,
    limit: options?.limit,
  })
}

/**
 * List root categories (no parent).
 */
export function useRootCategories(isActive?: boolean) {
  return useQuery(api.categories.listRoots, { isActive })
}

/**
 * List child categories of a parent.
 */
export function useCategoriesByParent(
  parentId: Id<'categories'> | undefined,
  isActive?: boolean
) {
  return useQuery(
    api.categories.listByParent,
    parentId ? { parentId, isActive } : 'skip'
  )
}

/**
 * List categories as a tree structure.
 */
export function useCategoryTree(isActive?: boolean) {
  return useQuery(api.categories.listTree, { isActive })
}

/**
 * List active categories (for customer-facing).
 */
export function useActiveCategories() {
  return useQuery(api.categories.listActive, {})
}

// =============================================================================
// Category Mutations
// =============================================================================

/**
 * Create a new category.
 */
export function useCreateCategory() {
  return useMutation(api.categories.create)
}

/**
 * Update a category.
 */
export function useUpdateCategory() {
  return useMutation(api.categories.update)
}

/**
 * Delete a category.
 */
export function useDeleteCategory() {
  return useMutation(api.categories.remove)
}

/**
 * Toggle category active status.
 */
export function useToggleCategoryActive() {
  return useMutation(api.categories.toggleActive)
}

// =============================================================================
// Category Image Mutations
// =============================================================================

/**
 * Set category thumbnail image (after R2 upload).
 */
export function useSetCategoryThumbnail() {
  return useMutation(api.categoryImages.setThumbnail)
}

/**
 * Set category banner image (after R2 upload).
 */
export function useSetCategoryBanner() {
  return useMutation(api.categoryImages.setBanner)
}

/**
 * Remove category thumbnail image.
 */
export function useRemoveCategoryThumbnail() {
  return useMutation(api.categoryImages.removeThumbnail)
}

/**
 * Remove category banner image.
 */
export function useRemoveCategoryBanner() {
  return useMutation(api.categoryImages.removeBanner)
}

// =============================================================================
// Brand Queries
// =============================================================================

/**
 * Get a single brand by ID.
 */
export function useBrand(brandId: Id<'brands'> | undefined) {
  return useQuery(api.brands.get, brandId ? { id: brandId } : 'skip')
}

/**
 * Get a brand by slug.
 */
export function useBrandBySlug(slug: string | undefined) {
  return useQuery(api.brands.getBySlug, slug ? { slug } : 'skip')
}

/**
 * List all brands.
 */
export function useBrands(options?: { search?: string; limit?: number }) {
  return useQuery(api.brands.list, {
    search: options?.search,
    limit: options?.limit,
  })
}

/**
 * List brands with product counts.
 */
export function useBrandsWithProductCounts(limit?: number) {
  return useQuery(api.brands.listWithProductCounts, { limit })
}

// =============================================================================
// Brand Mutations
// =============================================================================

/**
 * Create a new brand.
 */
export function useCreateBrand() {
  return useMutation(api.brands.create)
}

/**
 * Update a brand.
 */
export function useUpdateBrand() {
  return useMutation(api.brands.update)
}

/**
 * Delete a brand.
 */
export function useDeleteBrand() {
  return useMutation(api.brands.remove)
}
