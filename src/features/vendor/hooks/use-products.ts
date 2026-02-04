import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

// =============================================================================
// PRODUCT QUERIES
// =============================================================================

/**
 * Get a single product by ID with all related data
 */
export function useProduct(productId: Id<"products"> | undefined) {
  return useQuery(api.products.get, productId ? { id: productId } : "skip");
}

/**
 * Get a product by slug
 */
export function useProductBySlug(slug: string | undefined) {
  return useQuery(api.products.getBySlug, slug ? { slug } : "skip");
}

/**
 * List products with optional filters
 */
export function useProducts(options?: {
  categoryId?: Id<"categories">;
  brandId?: Id<"brands">;
  isActive?: boolean;
  search?: string;
  limit?: number;
}) {
  return useQuery(api.products.list, {
    categoryId: options?.categoryId,
    brandId: options?.brandId,
    isActive: options?.isActive,
    search: options?.search,
    limit: options?.limit,
  });
}

/**
 * List products by category (active only, for customer-facing)
 */
export function useProductsByCategory(
  categoryId: Id<"categories"> | undefined,
  limit?: number
) {
  return useQuery(
    api.products.listByCategory,
    categoryId ? { categoryId, limit } : "skip"
  );
}

// =============================================================================
// PRODUCT MUTATIONS
// =============================================================================

/**
 * Create a new product
 */
export function useCreateProduct() {
  return useMutation(api.products.create);
}

/**
 * Update a product
 */
export function useUpdateProduct() {
  return useMutation(api.products.update);
}

/**
 * Delete a product
 */
export function useDeleteProduct() {
  return useMutation(api.products.remove);
}

/**
 * Toggle product active status
 */
export function useToggleProductActive() {
  return useMutation(api.products.toggleActive);
}

// =============================================================================
// PRODUCT IMAGE QUERIES
// =============================================================================

/**
 * Get all images for a product
 */
export function useProductImages(productId: Id<"products"> | undefined) {
  return useQuery(
    api.productImages.listByProduct,
    productId ? { productId } : "skip"
  );
}

/**
 * Get primary image for a product
 */
export function usePrimaryProductImage(productId: Id<"products"> | undefined) {
  return useQuery(
    api.productImages.getPrimary,
    productId ? { productId } : "skip"
  );
}

// =============================================================================
// PRODUCT IMAGE MUTATIONS
// =============================================================================

/**
 * Add an image to a product (after R2 upload).
 */
export function useAddProductImage() {
  return useMutation(api.productImages.add);
}

/**
 * Update image metadata
 */
export function useUpdateProductImage() {
  return useMutation(api.productImages.update);
}

/**
 * Set an image as primary
 */
export function useSetPrimaryImage() {
  return useMutation(api.productImages.setPrimary);
}

/**
 * Delete a product image
 */
export function useDeleteProductImage() {
  return useMutation(api.productImages.remove);
}

/**
 * Delete all images for a product
 */
export function useDeleteAllProductImages() {
  return useMutation(api.productImages.removeAllForProduct);
}

// =============================================================================
// CATEGORY QUERIES
// =============================================================================

/**
 * Get a single category by ID
 */
export function useCategory(categoryId: Id<"categories"> | undefined) {
  return useQuery(api.categories.get, categoryId ? { id: categoryId } : "skip");
}

/**
 * List all categories
 */
export function useCategories(options?: { isActive?: boolean; limit?: number }) {
  return useQuery(api.categories.list, {
    isActive: options?.isActive,
    limit: options?.limit,
  });
}

/**
 * List root categories (no parent)
 */
export function useRootCategories(isActive?: boolean) {
  return useQuery(api.categories.listRoots, { isActive });
}

/**
 * List child categories of a parent
 */
export function useCategoriesByParent(
  parentId: Id<"categories"> | undefined,
  isActive?: boolean
) {
  return useQuery(
    api.categories.listByParent,
    parentId ? { parentId, isActive } : "skip"
  );
}

/**
 * List categories as a tree structure
 */
export function useCategoryTree(isActive?: boolean) {
  return useQuery(api.categories.listTree, { isActive });
}

/**
 * List active categories (for customer-facing)
 */
export function useActiveCategories() {
  return useQuery(api.categories.listActive, {});
}

// =============================================================================
// CATEGORY MUTATIONS
// =============================================================================

/**
 * Create a new category
 */
export function useCreateCategory() {
  return useMutation(api.categories.create);
}

/**
 * Update a category
 */
export function useUpdateCategory() {
  return useMutation(api.categories.update);
}

/**
 * Delete a category
 */
export function useDeleteCategory() {
  return useMutation(api.categories.remove);
}

/**
 * Toggle category active status
 */
export function useToggleCategoryActive() {
  return useMutation(api.categories.toggleActive);
}

// =============================================================================
// BRAND QUERIES
// =============================================================================

/**
 * Get a single brand by ID
 */
export function useBrand(brandId: Id<"brands"> | undefined) {
  return useQuery(api.brands.get, brandId ? { id: brandId } : "skip");
}

/**
 * List all brands
 */
export function useBrands(options?: { search?: string; limit?: number }) {
  return useQuery(api.brands.list, {
    search: options?.search,
    limit: options?.limit,
  });
}

/**
 * List brands with product counts
 */
export function useBrandsWithProductCounts(limit?: number) {
  return useQuery(api.brands.listWithProductCounts, { limit });
}

// =============================================================================
// BRAND MUTATIONS
// =============================================================================

/**
 * Create a new brand
 */
export function useCreateBrand() {
  return useMutation(api.brands.create);
}

/**
 * Update a brand
 */
export function useUpdateBrand() {
  return useMutation(api.brands.update);
}

/**
 * Delete a brand
 */
export function useDeleteBrand() {
  return useMutation(api.brands.remove);
}

// =============================================================================
// PRODUCT VARIANT QUERIES
// =============================================================================

/**
 * Get a single variant by ID with pricing
 */
export function useProductVariant(variantId: Id<"productVariants"> | undefined) {
  return useQuery(
    api.productVariants.get,
    variantId ? { id: variantId } : "skip"
  );
}

/**
 * List all variants for a product
 */
export function useProductVariants(
  productId: Id<"products"> | undefined,
  organizationId?: Id<"organizations">
) {
  return useQuery(
    api.productVariants.listByProduct,
    productId ? { productId, organizationId } : "skip"
  );
}

/**
 * List all variants for an organization
 */
export function useOrganizationVariants(
  organizationId: Id<"organizations"> | undefined,
  options?: {
    isAvailable?: boolean;
    isApproved?: boolean;
    limit?: number;
  }
) {
  return useQuery(
    api.productVariants.listByOrganization,
    organizationId
      ? {
          organizationId,
          isAvailable: options?.isAvailable,
          isApproved: options?.isApproved,
          limit: options?.limit,
        }
      : "skip"
  );
}

/**
 * Get variant by SKU within an organization
 */
export function useVariantBySku(
  organizationId: Id<"organizations"> | undefined,
  sku: string | undefined
) {
  return useQuery(
    api.productVariants.getBySku,
    organizationId && sku ? { organizationId, sku } : "skip"
  );
}

// =============================================================================
// PRODUCT VARIANT MUTATIONS
// =============================================================================

/**
 * Create a new product variant with pricing
 */
export function useCreateProductVariant() {
  return useMutation(api.productVariants.create);
}

/**
 * Update a product variant
 */
export function useUpdateProductVariant() {
  return useMutation(api.productVariants.update);
}

/**
 * Update variant pricing
 */
export function useUpdateVariantPricing() {
  return useMutation(api.productVariants.updatePricing);
}

/**
 * Update stock quantity
 */
export function useUpdateStock() {
  return useMutation(api.productVariants.updateStock);
}

/**
 * Adjust stock quantity (add or subtract)
 */
export function useAdjustStock() {
  return useMutation(api.productVariants.adjustStock);
}

/**
 * Toggle variant availability
 */
export function useToggleVariantAvailable() {
  return useMutation(api.productVariants.toggleAvailable);
}

/**
 * Approve or reject a variant
 */
export function useSetVariantApproval() {
  return useMutation(api.productVariants.setApproval);
}

/**
 * Delete a variant
 */
export function useDeleteProductVariant() {
  return useMutation(api.productVariants.remove);
}
