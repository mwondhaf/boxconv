import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a single brand by ID
 */
export const get = query({
  args: { id: v.id("brands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get a brand by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const brand = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return brand;
  },
});

/**
 * List all brands
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const brands = await ctx.db.query("brands").take(limit);

    // Filter by search if provided
    if (args.search && args.search.trim().length > 0) {
      const searchLower = args.search.toLowerCase();
      return brands.filter(
        (brand) =>
          brand.name.toLowerCase().includes(searchLower) ||
          brand.slug.toLowerCase().includes(searchLower)
      );
    }

    return brands;
  },
});

/**
 * List brands with product counts
 */
export const listWithProductCounts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const brands = await ctx.db.query("brands").take(limit);

    const brandsWithCounts = await Promise.all(
      brands.map(async (brand) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_brand", (q) => q.eq("brandId", brand._id))
          .collect();

        return {
          ...brand,
          productCount: products.length,
        };
      })
    );

    return brandsWithCounts;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new brand
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for slug uniqueness
    const existing = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error(`Brand with slug "${args.slug}" already exists`);
    }

    const brandId = await ctx.db.insert("brands", {
      name: args.name,
      slug: args.slug,
      description: args.description,
    });

    return brandId;
  },
});

/**
 * Update a brand
 */
export const update = mutation({
  args: {
    id: v.id("brands"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const brand = await ctx.db.get(args.id);
    if (!brand) {
      throw new Error("Brand not found");
    }

    // Check slug uniqueness if changing
    if (args.slug && args.slug !== brand.slug) {
      const existing = await ctx.db
        .query("brands")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
        .first();

      if (existing) {
        throw new Error(`Brand with slug "${args.slug}" already exists`);
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.slug !== undefined && { slug: args.slug }),
      ...(args.description !== undefined && { description: args.description }),
    });

    return args.id;
  },
});

/**
 * Delete a brand
 * Note: This will fail if there are products referencing it
 */
export const remove = mutation({
  args: { id: v.id("brands") },
  handler: async (ctx, args) => {
    const brand = await ctx.db.get(args.id);
    if (!brand) {
      throw new Error("Brand not found");
    }

    // Check for products using this brand
    const products = await ctx.db
      .query("products")
      .withIndex("by_brand", (q) => q.eq("brandId", args.id))
      .first();

    if (products) {
      throw new Error(
        "Cannot delete brand with associated products. Remove brand from products first."
      );
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});
