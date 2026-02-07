import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePlatformAdmin } from "./lib/ability";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List all delivery zones
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const zones = await ctx.db
      .query("deliveryZones")
      .order("asc")
      .collect();
    return zones;
  },
});

/**
 * List only active delivery zones
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const zones = await ctx.db
      .query("deliveryZones")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return zones;
  },
});

/**
 * Get a single delivery zone by ID
 */
export const get = query({
  args: { id: v.id("deliveryZones") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * List zones by city
 */
export const listByCity = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    const zones = await ctx.db
      .query("deliveryZones")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .collect();
    return zones;
  },
});

// =============================================================================
// MUTATIONS (Admin only)
// =============================================================================

/**
 * Create a new delivery zone
 */
export const create = mutation({
  args: {
    name: v.string(),
    city: v.string(),
    country: v.optional(v.string()),
    centerLat: v.number(),
    centerLng: v.number(),
    maxDistanceMeters: v.number(),
    color: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Only platform admins can create zones
    await requirePlatformAdmin(ctx);

    const now = Date.now();
    const zoneId = await ctx.db.insert("deliveryZones", {
      name: args.name,
      city: args.city,
      country: args.country ?? "UG",
      centerLat: args.centerLat,
      centerLng: args.centerLng,
      maxDistanceMeters: args.maxDistanceMeters,
      color: args.color,
      active: args.active ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return zoneId;
  },
});

/**
 * Update an existing delivery zone
 */
export const update = mutation({
  args: {
    id: v.id("deliveryZones"),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    centerLat: v.optional(v.number()),
    centerLng: v.optional(v.number()),
    maxDistanceMeters: v.optional(v.number()),
    color: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Only platform admins can update zones
    await requirePlatformAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Delivery zone not found");
    }

    const { id, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};

    // Only include defined values
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(args.id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Delete a delivery zone
 */
export const remove = mutation({
  args: { id: v.id("deliveryZones") },
  handler: async (ctx, args) => {
    // Only platform admins can delete zones
    await requirePlatformAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Delivery zone not found");
    }

    // Check if there are pricing rules linked to this zone
    const linkedRules = await ctx.db
      .query("pricingRules")
      .withIndex("by_zone", (q) => q.eq("zoneId", args.id))
      .first();

    if (linkedRules) {
      throw new Error(
        "Cannot delete zone with linked pricing rules. Delete the rules first."
      );
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Toggle zone active status
 */
export const toggleActive = mutation({
  args: { id: v.id("deliveryZones") },
  handler: async (ctx, args) => {
    // Only platform admins can toggle zone status
    await requirePlatformAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Delivery zone not found");
    }

    await ctx.db.patch(args.id, {
      active: !existing.active,
      updatedAt: Date.now(),
    });

    return { active: !existing.active };
  },
});
