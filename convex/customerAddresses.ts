import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a single address by ID
 */
export const get = query({
  args: { id: v.id("customerAddresses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * List all addresses for a customer
 */
export const listByCustomer = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const addresses = await ctx.db
      .query("customerAddresses")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .collect();

    // Sort by default first, then by creation time
    return addresses.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return b._creationTime - a._creationTime;
    });
  },
});

/**
 * Get the default address for a customer
 */
export const getDefault = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const defaultAddress = await ctx.db
      .query("customerAddresses")
      .withIndex("by_default", (q) =>
        q.eq("clerkId", args.clerkId).eq("isDefault", true)
      )
      .first();

    return defaultAddress;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new customer address
 */
export const create = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    town: v.optional(v.string()),
    street: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    addressType: v.optional(
      v.union(
        v.literal("home"),
        v.literal("office"),
        v.literal("hotel"),
        v.literal("apartment")
      )
    ),
    buildingName: v.optional(v.string()),
    apartmentNo: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    geohash: v.optional(v.string()),
    directions: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { clerkId, isDefault = false, ...addressData } = args;

    // If this is being set as default, unset any existing default
    if (isDefault) {
      const existingDefault = await ctx.db
        .query("customerAddresses")
        .withIndex("by_default", (q) =>
          q.eq("clerkId", clerkId).eq("isDefault", true)
        )
        .first();

      if (existingDefault) {
        await ctx.db.patch(existingDefault._id, { isDefault: false });
      }
    }

    // Check if this is the first address - make it default automatically
    const existingAddresses = await ctx.db
      .query("customerAddresses")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .collect();

    const shouldBeDefault = isDefault || existingAddresses.length === 0;

    const addressId = await ctx.db.insert("customerAddresses", {
      clerkId,
      ...addressData,
      isDefault: shouldBeDefault,
    });

    return addressId;
  },
});

/**
 * Update a customer address
 */
export const update = mutation({
  args: {
    id: v.id("customerAddresses"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    town: v.optional(v.string()),
    street: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    addressType: v.optional(
      v.union(
        v.literal("home"),
        v.literal("office"),
        v.literal("hotel"),
        v.literal("apartment")
      )
    ),
    buildingName: v.optional(v.string()),
    apartmentNo: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    geohash: v.optional(v.string()),
    directions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const address = await ctx.db.get(id);
    if (!address) {
      throw new Error("Address not found");
    }

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);
    }

    return id;
  },
});

/**
 * Set an address as the default
 */
export const setDefault = mutation({
  args: {
    id: v.id("customerAddresses"),
  },
  handler: async (ctx, args) => {
    const address = await ctx.db.get(args.id);
    if (!address) {
      throw new Error("Address not found");
    }

    // Unset any existing default for this customer
    const existingDefault = await ctx.db
      .query("customerAddresses")
      .withIndex("by_default", (q) =>
        q.eq("clerkId", address.clerkId).eq("isDefault", true)
      )
      .first();

    if (existingDefault && existingDefault._id !== args.id) {
      await ctx.db.patch(existingDefault._id, { isDefault: false });
    }

    // Set this address as default
    await ctx.db.patch(args.id, { isDefault: true });

    return args.id;
  },
});

/**
 * Remove an address
 */
export const remove = mutation({
  args: { id: v.id("customerAddresses") },
  handler: async (ctx, args) => {
    const address = await ctx.db.get(args.id);
    if (!address) {
      throw new Error("Address not found");
    }

    const wasDefault = address.isDefault;
    const clerkId = address.clerkId;

    await ctx.db.delete(args.id);

    // If this was the default address, set another address as default
    if (wasDefault) {
      const remainingAddresses = await ctx.db
        .query("customerAddresses")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .collect();

      if (remainingAddresses.length > 0) {
        // Set the most recently created address as default
        const newestAddress = remainingAddresses.sort(
          (a, b) => b._creationTime - a._creationTime
        )[0];
        await ctx.db.patch(newestAddress._id, { isDefault: true });
      }
    }

    return { success: true };
  },
});

/**
 * Get address count for a customer
 */
export const getCount = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const addresses = await ctx.db
      .query("customerAddresses")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .collect();

    return addresses.length;
  },
});
