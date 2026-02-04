import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePlatformAdmin } from "./lib/ability";

/**
 * List all organization categories.
 * Public query - no auth required for reading categories.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("organizationCategories").collect();

    // Build hierarchy
    const rootCategories = categories.filter((c) => !c.parentId);

    const buildTree = (
      category: (typeof categories)[0]
    ): (typeof categories)[0] & { children: typeof categories } => {
      const children = categories.filter(
        (c) => c.parentId?.toString() === category._id.toString()
      );
      return {
        ...category,
        children: children.map(buildTree),
      };
    };

    return rootCategories.map(buildTree);
  },
});

/**
 * List all categories as a flat list.
 * Useful for dropdowns and selects.
 */
export const listFlat = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("organizationCategories").collect();
  },
});

/**
 * Get a single category by ID.
 */
export const get = query({
  args: {
    id: v.id("organizationCategories"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get a category by slug.
 */
export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizationCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/**
 * Create a new organization category.
 * Requires platform admin.
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("organizationCategories")),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    // Check for duplicate slug
    const existing = await ctx.db
      .query("organizationCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`Category with slug "${args.slug}" already exists`);
    }

    // If parentId is provided, verify it exists
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent) {
        throw new Error("Parent category not found");
      }
    }

    const categoryId = await ctx.db.insert("organizationCategories", {
      name: args.name,
      slug: args.slug,
      parentId: args.parentId,
    });

    return categoryId;
  },
});

/**
 * Update an organization category.
 * Requires platform admin.
 */
export const update = mutation({
  args: {
    id: v.id("organizationCategories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    parentId: v.optional(v.union(v.id("organizationCategories"), v.null())),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check for duplicate slug if changing
    if (args.slug !== undefined && args.slug !== category.slug) {
      const newSlug = args.slug;
      const existing = await ctx.db
        .query("organizationCategories")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .unique();

      if (existing) {
        throw new Error(`Category with slug "${newSlug}" already exists`);
      }
    }

    // If parentId is provided and not null, verify it exists and is not self
    if (args.parentId !== undefined && args.parentId !== null) {
      if (args.parentId.toString() === args.id.toString()) {
        throw new Error("Category cannot be its own parent");
      }
      const parent = await ctx.db.get(args.parentId);
      if (!parent) {
        throw new Error("Parent category not found");
      }
    }

    const updates: Partial<{
      name: string;
      slug: string;
      parentId: typeof category.parentId;
    }> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.slug !== undefined) updates.slug = args.slug;
    if (args.parentId !== undefined) {
      updates.parentId = args.parentId === null ? undefined : args.parentId;
    }

    await ctx.db.patch(args.id, updates);

    return args.id;
  },
});

/**
 * Delete an organization category.
 * Requires platform admin.
 * Will fail if category has children or organizations assigned to it.
 */
export const remove = mutation({
  args: {
    id: v.id("organizationCategories"),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check for child categories
    const children = await ctx.db
      .query("organizationCategories")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .first();

    if (children) {
      throw new Error(
        "Cannot delete category with child categories. Delete children first."
      );
    }

    // Check for organizations using this category
    const orgWithCategory = await ctx.db
      .query("organizations")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .first();

    if (orgWithCategory) {
      throw new Error(
        "Cannot delete category that has organizations assigned to it."
      );
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});
