import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

// =============================================================================
// Organization Queries
// =============================================================================

/**
 * Get all organizations from Convex (with business data).
 */
export function useOrganizations(limit?: number) {
  return useQuery(api.organizations.list, { limit })
}

/**
 * Get organization by Clerk org ID.
 */
export function useOrganizationByClerkId(clerkOrgId: string | undefined) {
  return useQuery(
    api.organizations.getByClerkOrgId,
    clerkOrgId ? { clerkOrgId } : 'skip'
  )
}

/**
 * Get organization by slug.
 */
export function useOrganizationBySlug(slug: string | undefined) {
  return useQuery(api.organizations.getBySlug, slug ? { slug } : 'skip')
}

/**
 * Get organization by Convex ID.
 */
export function useOrganization(id: Id<'organizations'> | undefined) {
  return useQuery(api.organizations.get, id ? { id } : 'skip')
}

/**
 * Get active organizations (not busy).
 */
export function useActiveOrganizations(limit?: number) {
  return useQuery(api.organizations.listActive, { limit })
}

/**
 * Get organizations by category.
 */
export function useOrganizationsByCategory(
  categoryId: Id<'organizationCategories'> | undefined,
  limit?: number
) {
  return useQuery(
    api.organizations.listByCategory,
    categoryId ? { categoryId, limit } : 'skip'
  )
}

// =============================================================================
// Organization Mutations
// =============================================================================

/**
 * Update organization business data.
 */
export function useUpdateOrganizationBusinessData() {
  return useMutation(api.organizations.updateBusinessData)
}

/**
 * Toggle organization busy status.
 */
export function useToggleOrganizationBusy() {
  return useMutation(api.organizations.toggleBusy)
}

// =============================================================================
// Organization Category Queries
// =============================================================================

/**
 * Get all organization categories (hierarchical).
 */
export function useOrganizationCategories() {
  return useQuery(api.organizationCategories.list, {})
}

/**
 * Get all organization categories (flat list).
 */
export function useOrganizationCategoriesFlat() {
  return useQuery(api.organizationCategories.listFlat, {})
}

/**
 * Get organization category by ID.
 */
export function useOrganizationCategory(
  id: Id<'organizationCategories'> | undefined
) {
  return useQuery(api.organizationCategories.get, id ? { id } : 'skip')
}

/**
 * Get organization category by slug.
 */
export function useOrganizationCategoryBySlug(slug: string | undefined) {
  return useQuery(
    api.organizationCategories.getBySlug,
    slug ? { slug } : 'skip'
  )
}

// =============================================================================
// Organization Category Mutations
// =============================================================================

/**
 * Create organization category.
 */
export function useCreateOrganizationCategory() {
  return useMutation(api.organizationCategories.create)
}

/**
 * Update organization category.
 */
export function useUpdateOrganizationCategory() {
  return useMutation(api.organizationCategories.update)
}

/**
 * Delete organization category.
 */
export function useDeleteOrganizationCategory() {
  return useMutation(api.organizationCategories.remove)
}
