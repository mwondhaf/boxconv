import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { requireOrgMembership } from './lib/ability'

/**
 * Internal mutation to create an organization record.
 * Called by the Clerk webhook when an organization is created.
 */
export const createFromClerk = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if organization already exists
    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_clerkOrgId', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()

    if (existing) {
      // Already exists, just return the existing ID
      return existing._id
    }

    // Create the organization with basic info from Clerk
    const orgId = await ctx.db.insert('organizations', {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      logo: args.logo,
      // Business-specific fields will be set later via update
    })

    return orgId
  },
})

/**
 * Internal mutation to update an organization when updated in Clerk.
 * Syncs name, slug, and logo from Clerk.
 */
export const updateFromClerk = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerkOrgId', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()

    if (!org) {
      console.warn(`Organization not found for clerkOrgId: ${args.clerkOrgId}`)
      return null
    }

    const updates: Partial<{
      name: string
      slug: string
      logo: string
    }> = {}

    if (args.name !== undefined) updates.name = args.name
    if (args.slug !== undefined) updates.slug = args.slug
    if (args.logo !== undefined) updates.logo = args.logo

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(org._id, updates)
    }

    return org._id
  },
})

/**
 * Internal mutation to delete an organization when deleted in Clerk.
 */
export const deleteFromClerk = internalMutation({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerkOrgId', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()

    if (!org) {
      console.warn(`Organization not found for deletion: ${args.clerkOrgId}`)
      return false
    }

    // Note: In production, you may want to soft-delete or handle related data
    await ctx.db.delete(org._id)
    return true
  },
})

/**
 * Ensure the current user's organization exists in Convex.
 * This can be called by any authenticated user to sync their Clerk org to Convex
 * if the webhook hasn't created it yet. The clerkOrgId is passed from the client
 * (from the Clerk useOrganization hook) since the token org_id may not be set.
 */
export const ensureMyOrganization = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Just require authentication - the clerkOrgId comes from the Clerk SDK on the client
    // which already verifies the user is a member of that organization
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized: Authentication required')
    }

    // Check if organization already exists in Convex
    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_clerkOrgId', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()

    if (existing) {
      // Already exists, return the existing record
      return existing
    }

    // Organization doesn't exist in Convex yet - create it using Clerk org info
    const orgId = await ctx.db.insert('organizations', {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      logo: args.logo,
    })

    // Return the newly created organization
    return await ctx.db.get(orgId)
  },
})

/**
 * Sync organization from Clerk (admin only).
 * Use this when the webhook hasn't created the organization yet.
 * Can be called from the admin panel to manually sync an organization.
 */
export const syncFromClerk = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require platform admin
    const { abilityCtx } = await requireOrgMembership(ctx)
    if (abilityCtx.platformRole !== 'admin') {
      throw new Error('Forbidden: Only platform admins can sync organizations')
    }

    // Check if organization already exists
    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_clerkOrgId', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()

    if (existing) {
      // Already exists, return the existing record
      return existing
    }

    // Create the organization with basic info from Clerk
    const orgId = await ctx.db.insert('organizations', {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      logo: args.logo,
    })

    // Return the newly created organization
    return await ctx.db.get(orgId)
  },
})

/**
 * Get organization by Clerk org ID.
 */
export const getByClerkOrgId = query({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('organizations')
      .withIndex('by_clerkOrgId', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()
  },
})

/**
 * Get organization by slug.
 */
export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
  },
})

/**
 * List all organizations (for platform admin).
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    return await ctx.db.query('organizations').take(limit)
  },
})

/**
 * Get organization by Convex ID.
 */
export const get = query({
  args: {
    id: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/**
 * Update organization business data.
 * Can be called by org owner or platform admin.
 * This updates business-specific fields not stored in Clerk.
 */
export const updateBusinessData = mutation({
  args: {
    clerkOrgId: v.string(),
    // Contact info
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Location
    country: v.optional(v.string()),
    cityOrDistrict: v.optional(v.string()),
    town: v.optional(v.string()),
    street: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    geohash: v.optional(v.string()),
    // Category
    categoryId: v.optional(v.union(v.id('organizationCategories'), v.null())),
    // Operating hours
    openingTime: v.optional(v.string()),
    closingTime: v.optional(v.string()),
    businessHours: v.optional(v.any()),
    timezone: v.optional(v.string()),
    isBusy: v.optional(v.boolean()),
    // Metadata
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check auth - must be org owner or platform admin
    const { abilityCtx } = await requireOrgMembership(ctx)

    // Platform admin can update any org
    const isPlatformAdmin = abilityCtx.platformRole === 'admin'
    // Org owner can update their own org
    const isOrgOwner =
      abilityCtx.orgRole === 'org:owner' &&
      abilityCtx.orgId === args.clerkOrgId

    if (!isPlatformAdmin && !isOrgOwner) {
      throw new Error('Forbidden: Only org owner or platform admin can update organization')
    }

    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerkOrgId', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()

    if (!org) {
      throw new Error('Organization not found')
    }

    // Build updates object
    const updates: Record<string, unknown> = {}

    if (args.email !== undefined) updates.email = args.email
    if (args.phone !== undefined) updates.phone = args.phone
    if (args.country !== undefined) updates.country = args.country
    if (args.cityOrDistrict !== undefined) updates.cityOrDistrict = args.cityOrDistrict
    if (args.town !== undefined) updates.town = args.town
    if (args.street !== undefined) updates.street = args.street
    if (args.lat !== undefined) updates.lat = args.lat
    if (args.lng !== undefined) updates.lng = args.lng
    if (args.geohash !== undefined) updates.geohash = args.geohash
    if (args.categoryId !== undefined) {
      updates.categoryId = args.categoryId === null ? undefined : args.categoryId
    }
    if (args.openingTime !== undefined) updates.openingTime = args.openingTime
    if (args.closingTime !== undefined) updates.closingTime = args.closingTime
    if (args.businessHours !== undefined) updates.businessHours = args.businessHours
    if (args.timezone !== undefined) updates.timezone = args.timezone
    if (args.isBusy !== undefined) updates.isBusy = args.isBusy
    if (args.metadata !== undefined) updates.metadata = args.metadata

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(org._id, updates)
    }

    return org._id
  },
})

/**
 * Toggle organization busy status (pause/unpause orders).
 * Can be called by org admin/owner or platform admin.
 */
export const toggleBusy = mutation({
  args: {
    clerkOrgId: v.string(),
    isBusy: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { abilityCtx } = await requireOrgMembership(ctx)

    // Platform admin can update any org
    const isPlatformAdmin = abilityCtx.platformRole === 'admin'
    // Org admin/owner can update their own org
    const isOrgAdmin =
      (abilityCtx.orgRole === 'org:owner' || abilityCtx.orgRole === 'org:admin') &&
      abilityCtx.orgId === args.clerkOrgId

    if (!isPlatformAdmin && !isOrgAdmin) {
      throw new Error('Forbidden: Only org admin or platform admin can toggle busy status')
    }

    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerkOrgId', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()

    if (!org) {
      throw new Error('Organization not found')
    }

    await ctx.db.patch(org._id, { isBusy: args.isBusy })

    return { success: true, isBusy: args.isBusy }
  },
})

/**
 * List organizations by category.
 * Public query for browsing stores.
 */
export const listByCategory = query({
  args: {
    categoryId: v.id('organizationCategories'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    return await ctx.db
      .query('organizations')
      .withIndex('by_category', (q) => q.eq('categoryId', args.categoryId))
      .take(limit)
  },
})

/**
 * List active organizations (not busy, for customer browsing).
 */
export const listActive = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const orgs = await ctx.db.query('organizations').take(limit)
    // Filter out busy organizations
    return orgs.filter((org) => !org.isBusy)
  },
})

/**
 * Helper function to determine if a store is currently open
 */
function isStoreOpen(
  openingTime: string | undefined,
  closingTime: string | undefined,
  timezone: string | undefined
): { isOpen: boolean; opensAt?: string; closesAt?: string } {
  if (!openingTime || !closingTime) {
    return { isOpen: true } // Assume open if no hours set
  }

  // Get current time in store's timezone (default to Africa/Kampala for Uganda)
  const tz = timezone || 'Africa/Kampala'
  const now = new Date()

  // Parse time strings (expected format: "HH:MM" in 24-hour format)
  const [openHour, openMin] = openingTime.split(':').map(Number)
  const [closeHour, closeMin] = closingTime.split(':').map(Number)

  // Get current hour and minute
  // Note: In production, use proper timezone library like date-fns-tz
  const currentHour = now.getUTCHours() + 3 // UTC+3 for East Africa
  const currentMin = now.getUTCMinutes()

  const currentMins = currentHour * 60 + currentMin
  const openMins = openHour * 60 + openMin
  const closeMins = closeHour * 60 + closeMin

  // Handle overnight hours (e.g., 22:00 - 06:00)
  let isOpen: boolean
  if (closeMins < openMins) {
    // Overnight: open if after opening OR before closing
    isOpen = currentMins >= openMins || currentMins < closeMins
  } else {
    // Same day: open if between opening and closing
    isOpen = currentMins >= openMins && currentMins < closeMins
  }

  return {
    isOpen,
    opensAt: openingTime,
    closesAt: closingTime,
  }
}

/**
 * List active stores with open/closed status for customer browsing.
 * Includes store hours and current availability.
 */
export const listActiveWithStatus = query({
  args: {
    limit: v.optional(v.number()),
    categoryId: v.optional(v.id('organizationCategories')),
    nearGeohash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    let orgs
    if (args.categoryId) {
      orgs = await ctx.db
        .query('organizations')
        .withIndex('by_category', (q) => q.eq('categoryId', args.categoryId))
        .take(limit)
    } else {
      orgs = await ctx.db.query('organizations').take(limit)
    }

    // Filter and enrich organizations
    const enrichedOrgs = orgs
      .filter((org) => !org.isBusy)
      .map((org) => {
        const storeStatus = isStoreOpen(org.openingTime, org.closingTime, org.timezone)

        return {
          _id: org._id,
          _creationTime: org._creationTime,
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          // Location
          country: org.country,
          cityOrDistrict: org.cityOrDistrict,
          town: org.town,
          street: org.street,
          lat: org.lat,
          lng: org.lng,
          geohash: org.geohash,
          // Category
          categoryId: org.categoryId,
          // Store status
          isOpen: storeStatus.isOpen,
          isBusy: org.isBusy ?? false,
          openingTime: org.openingTime,
          closingTime: org.closingTime,
          // Contact (for display)
          phone: org.phone,
        }
      })

    // Sort: open stores first, then by name
    enrichedOrgs.sort((a, b) => {
      if (a.isOpen && !b.isOpen) return -1
      if (!a.isOpen && b.isOpen) return 1
      return a.name.localeCompare(b.name)
    })

    return enrichedOrgs
  },
})

/**
 * Get a store's details with current open/closed status.
 * For customer viewing a specific store.
 */
export const getStoreDetails = query({
  args: {
    id: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.id)
    if (!org) return null

    const storeStatus = isStoreOpen(org.openingTime, org.closingTime, org.timezone)

    // Get category info if available
    let category = null
    if (org.categoryId) {
      category = await ctx.db.get(org.categoryId)
    }

    return {
      ...org,
      isOpen: storeStatus.isOpen,
      category: category ? { _id: category._id, name: category.name, slug: category.slug } : null,
    }
  },
})

/**
 * Search stores by name.
 * Public query for customer search.
 */
export const searchStores = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    const searchQuery = args.query.toLowerCase().trim()

    if (searchQuery.length < 2) {
      return []
    }

    const allOrgs = await ctx.db.query('organizations').take(100)

    // Filter by name match and not busy
    const matchingOrgs = allOrgs
      .filter((org) =>
        !org.isBusy &&
        org.name.toLowerCase().includes(searchQuery)
      )
      .slice(0, limit)
      .map((org) => {
        const storeStatus = isStoreOpen(org.openingTime, org.closingTime, org.timezone)
        return {
          _id: org._id,
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          cityOrDistrict: org.cityOrDistrict,
          isOpen: storeStatus.isOpen,
        }
      })

    return matchingOrgs
  },
})
